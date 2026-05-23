-- Si la subida falla con "permission denied for table album_photos",
-- ejecuta esto en SQL Editor (proyectos nuevos de Supabase):

grant usage on schema public to anon, authenticated;
grant select, insert on public.album_photos to anon, authenticated;
