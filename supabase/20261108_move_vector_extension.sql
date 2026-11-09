-- pgvector is relocatable and the application/search function already includes
-- the extensions schema in its search path. Moving it removes extension-owned
-- functions and operators from the exposed public API schema.
create schema if not exists extensions;
alter extension vector set schema extensions;

-- Refresh PostgREST metadata after the extension type changes schema.
notify pgrst, 'reload schema';
