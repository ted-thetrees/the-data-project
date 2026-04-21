-- Undo Phase 1 — audit schema + generic trigger + undo_last().
-- Additive only. Rolled back by 2026-04-20-undo-down.sql.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.record_version (
  id           bigserial PRIMARY KEY,
  txid         bigint      NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now(),
  table_schema text        NOT NULL,
  table_name   text        NOT NULL,
  op           text        NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  record_id    text,              -- text (not uuid) so integer-keyed tables (backlog, calorie_log, lookup tables) are supported
  record       jsonb,
  old_record   jsonb,
  undone_at    timestamptz
);

CREATE INDEX IF NOT EXISTS record_version_ts_live_idx
  ON audit.record_version (ts DESC) WHERE undone_at IS NULL;
CREATE INDEX IF NOT EXISTS record_version_txid_idx
  ON audit.record_version (txid);
CREATE INDEX IF NOT EXISTS record_version_table_rec_idx
  ON audit.record_version (table_name, record_id);

-- Generic AFTER trigger. Writes one row per mutated row.
-- Skips logging when the session-local audit.suppress is 'on' — used by
-- undo_last() so the reverse ops don't spawn new history entries.
CREATE OR REPLACE FUNCTION audit.record_change() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  suppressed text;
  rid_text   text;
BEGIN
  BEGIN
    suppressed := current_setting('audit.suppress', true);
  EXCEPTION WHEN OTHERS THEN
    suppressed := NULL;
  END;
  IF suppressed = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;

  rid_text := COALESCE(
    (to_jsonb(NEW)->>'id'),
    (to_jsonb(OLD)->>'id')
  );

  INSERT INTO audit.record_version
    (txid, table_schema, table_name, op, record_id, record, old_record)
  VALUES (
    txid_current(),
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    TG_OP,
    rid_text,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach the trigger to a single table. Safe to re-run.
CREATE OR REPLACE FUNCTION audit.enable_tracking(tbl regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %s', tbl);
  EXECUTE format(
    'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION audit.record_change()',
    tbl
  );
END;
$$;

CREATE OR REPLACE FUNCTION audit.disable_tracking(tbl regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %s', tbl);
END;
$$;

-- Reverse the most recent transaction's changes. Returns NULL if there's
-- nothing to undo, otherwise a one-line description of what was undone.
CREATE OR REPLACE FUNCTION audit.undo_last() RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  tgt bigint;
  r audit.record_version;
  count_undone int := 0;
  description text;
BEGIN
  SELECT txid INTO tgt
    FROM audit.record_version
    WHERE undone_at IS NULL
    ORDER BY ts DESC, id DESC
    LIMIT 1;
  IF tgt IS NULL THEN RETURN NULL; END IF;

  PERFORM set_config('audit.suppress', 'on', true);

  FOR r IN
    SELECT * FROM audit.record_version
    WHERE txid = tgt AND undone_at IS NULL
    ORDER BY id DESC
  LOOP
    IF r.op = 'INSERT' THEN
      EXECUTE format('DELETE FROM %I.%I WHERE id::text = $1',
                     r.table_schema, r.table_name)
        USING r.record_id;
    ELSIF r.op = 'DELETE' THEN
      -- Restore the row from its snapshot. jsonb_populate_record rehydrates
      -- all columns; if a column has been dropped since, it's silently
      -- ignored.
      EXECUTE format(
        'INSERT INTO %I.%I SELECT * FROM jsonb_populate_record(null::%I.%I, $1)',
        r.table_schema, r.table_name, r.table_schema, r.table_name)
        USING r.old_record;
    ELSIF r.op = 'UPDATE' THEN
      -- Overwrite every column on the current row with the pre-UPDATE
      -- snapshot. We build a SET clause dynamically from the jsonb keys
      -- and use jsonb_populate_record to coerce types correctly.
      EXECUTE format(
        'UPDATE %I.%I t SET (%s) = (SELECT %s FROM jsonb_populate_record(null::%I.%I, $1) s) WHERE t.id::text = $2',
        r.table_schema,
        r.table_name,
        (SELECT string_agg(quote_ident(k), ', ') FROM jsonb_object_keys(r.old_record) k),
        (SELECT string_agg('s.' || quote_ident(k), ', ') FROM jsonb_object_keys(r.old_record) k),
        r.table_schema, r.table_name
      )
        USING r.old_record, r.record_id;
    END IF;

    UPDATE audit.record_version SET undone_at = now() WHERE id = r.id;
    count_undone := count_undone + 1;

    IF description IS NULL THEN
      description := format('%s on %s', lower(r.op), r.table_name);
    END IF;
  END LOOP;

  PERFORM set_config('audit.suppress', 'off', true);

  IF count_undone > 1 THEN
    description := description || format(' (+ %s more)', count_undone - 1);
  END IF;
  RETURN description;
END;
$$;

-- Turn on tracking for every user-facing data table. Pick-list / lookup
-- tables are included too so renaming a status is undoable. Link tables
-- (talent_area_links, jtbd_thinker_jobs, etc.) are included so add/remove
-- of tags is undoable.
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'public.projects',
    'public.tasks',
    'public.project_statuses',
    'public.task_statuses',
    'public.uber_projects',
    'public.talent',
    'public.talent_area_links',
    'public.talent_areas',
    'public.talent_categories',
    'public.talent_rating_levels',
    'public.talent_types',
    'public.people',
    'public.people_genders',
    'public.people_familiarity_levels',
    'public.people_teller_statuses',
    'public.people_org_fill_statuses',
    'public.people_metro_areas',
    'public.backlog',
    'public.backlog_priorities',
    'public.backlog_categories',
    'public.backlog_yes_or_not_yet',
    'public.backlog_design_paradigms',
    'public.backlog_statuses',
    'public.backlog_prototype_stages',
    'public.crime_series',
    'public.crime_series_statuses',
    'public.user_stories',
    'public.user_story_roles',
    'public.user_story_categories',
    'public.user_story_role_links',
    'public.cgtrader_items',
    'public.jtbd_thinkers',
    'public.jtbd_jobs',
    'public.jtbd_components',
    'public.jtbd_thinker_jobs',
    'public.jtbd_component_jobs',
    'public.calorie_log',
    'public.calorie_foods'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      PERFORM audit.enable_tracking(tbl::regclass);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'skipping %: table not found', tbl;
    END;
  END LOOP;
END;
$$;
