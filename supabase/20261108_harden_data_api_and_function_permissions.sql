-- Keep application data behind the FastAPI authorization layer.
-- The backend uses service_role; browser roles do not need direct table access.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Restrict existing
-- RPCs to the backend service role, including the vector retrieval function.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.match_document_sections(vector, double precision, integer) to service_role;

-- The survey is submitted through the protected/rate-limited backend endpoint,
-- so its former direct anonymous Data API policy is no longer required.
drop policy if exists "Allow anonymous survey submissions" on public.css_responses;

-- Resolve the mutable-search-path advisor finding. The extensions schema is
-- included explicitly so vector operators remain resolvable if pgvector moves.
alter function public.match_document_sections(vector, double precision, integer)
  set search_path = public, extensions;

-- Future objects created by the migration owner are private by default.
-- service_role keeps its existing defaults because the backend relies on it.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- PUBLIC's function default is global, so this statement intentionally omits
-- "in schema public" as required by PostgreSQL/Supabase.
alter default privileges for role postgres
  revoke execute on functions from public;
