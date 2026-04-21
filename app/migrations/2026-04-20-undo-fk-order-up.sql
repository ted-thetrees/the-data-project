-- Fix FK-violation on undo when a parent DELETE cascaded to children.
-- In Postgres, a parent's AFTER-DELETE trigger fires before its cascaded
-- children's triggers, so the parent's audit row has a LOWER id than the
-- cascaded child rows. The previous loop used ORDER BY id DESC, which tried
-- to restore the child before the parent and tripped the FK constraint.
--
-- Fix: split into three passes within the target txid.
--   1. Undo DELETEs in id ASC   -> restore parents before children.
--   2. Undo UPDATEs in id DESC  -> order-insensitive, matches audit order.
--   3. Undo INSERTs in id DESC  -> remove children before parents.

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

  -- Pass 1: restore DELETEs, parent rows first (id ASC).
  FOR r IN
    SELECT * FROM audit.record_version
    WHERE txid = tgt AND undone_at IS NULL AND op = 'DELETE'
    ORDER BY id ASC
  LOOP
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM jsonb_populate_record(null::%I.%I, $1)',
      r.table_schema, r.table_name, r.table_schema, r.table_name)
      USING r.old_record;

    UPDATE audit.record_version SET undone_at = now() WHERE id = r.id;
    count_undone := count_undone + 1;
    IF description IS NULL THEN
      description := format('%s on %s', lower(r.op), r.table_name);
    END IF;
  END LOOP;

  -- Pass 2: revert UPDATEs.
  FOR r IN
    SELECT * FROM audit.record_version
    WHERE txid = tgt AND undone_at IS NULL AND op = 'UPDATE'
    ORDER BY id DESC
  LOOP
    EXECUTE format(
      'UPDATE %I.%I t SET (%s) = (SELECT %s FROM jsonb_populate_record(null::%I.%I, $1) s) WHERE t.id::text = $2',
      r.table_schema,
      r.table_name,
      (SELECT string_agg(quote_ident(k), ', ') FROM jsonb_object_keys(r.old_record) k),
      (SELECT string_agg('s.' || quote_ident(k), ', ') FROM jsonb_object_keys(r.old_record) k),
      r.table_schema, r.table_name
    )
      USING r.old_record, r.record_id;

    UPDATE audit.record_version SET undone_at = now() WHERE id = r.id;
    count_undone := count_undone + 1;
    IF description IS NULL THEN
      description := format('%s on %s', lower(r.op), r.table_name);
    END IF;
  END LOOP;

  -- Pass 3: remove INSERTs, child rows first (id DESC).
  FOR r IN
    SELECT * FROM audit.record_version
    WHERE txid = tgt AND undone_at IS NULL AND op = 'INSERT'
    ORDER BY id DESC
  LOOP
    EXECUTE format('DELETE FROM %I.%I WHERE id::text = $1',
                   r.table_schema, r.table_name)
      USING r.record_id;

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
