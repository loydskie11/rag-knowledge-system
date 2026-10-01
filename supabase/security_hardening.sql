-- Run this once in the Supabase SQL editor.
-- New application responses use short-lived signed URLs instead of public URLs.
update storage.buckets
set public = false
where id = 'documents';
