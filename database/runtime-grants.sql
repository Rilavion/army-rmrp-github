-- Run as database owner AFTER migrations. Create the login/password separately.
-- Example: CREATE ROLE army_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public,auth TO army_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO army_runtime;
REVOKE ALL ON schema_migrations FROM army_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO army_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM army_runtime;
GRANT EXECUTE ON FUNCTION auth.uid() TO army_runtime;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('get_complaint_form','submit_complaint','submit_request','get_supply_form','submit_supply_request','staff_upsert_role','ensure_payroll_draft','archive_payroll_draft')
 LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO army_runtime',f.signature); END LOOP;
END $$;
-- PostgreSQL is private, accessed only by the API. No PostgREST or anon/authenticated roles.
