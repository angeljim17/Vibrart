-- ============================================================
-- VIBRART — Galería pública (imagen + nombre + descripción)
-- Sin correo ni teléfono. Ejecutar después de setup.sql
--
-- Si antes tenías la vista solo con public_url, hay que borrarla
-- y crearla de nuevo (CREATE OR REPLACE no permite nuevas columnas).
-- ============================================================

drop view if exists public.album_photos_gallery;

create view public.album_photos_gallery as
select
  id,
  album,
  public_url,
  uploader_name,
  description,
  created_at
from public.album_photos
where coalesce(trim(public_url), '') <> '';

grant select on public.album_photos_gallery to anon, authenticated;
