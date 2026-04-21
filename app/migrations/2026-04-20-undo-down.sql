-- Rollback of 2026-04-20-undo-up.sql.
-- Drops the audit schema and every attached trigger. No user-facing data
-- is touched. Audit history is discarded.

DROP SCHEMA IF EXISTS audit CASCADE;

-- Remove any stray triggers (should be gone already since the trigger
-- function was in the audit schema, but belt-and-suspenders).
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT t.tgname, c.oid::regclass AS tbl
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
     WHERE t.tgname = 'audit_trigger'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trg.tgname, trg.tbl);
  END LOOP;
END;
$$;
