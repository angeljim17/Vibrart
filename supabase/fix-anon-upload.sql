-- ============================================================
-- VIBRART — Reparar subida desde móvil / web pública
-- Síntoma: "La foto se guardó a medias" (archivo en Storage, sin fila en tabla)
-- Ejecutar en Supabase → SQL Editor si la app antigua aún falla.
-- La app nueva usa return=minimal y no necesita SELECT para anon.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant insert on public.album_photos to anon, authenticated;

-- Columnas de contacto / lote (por si faltan en proyectos viejos)
alter table public.album_photos add column if not exists upload_batch_id uuid;
alter table public.album_photos add column if not exists uploader_name text not null default '';
alter table public.album_photos add column if not exists uploader_email text not null default '';
alter table public.album_photos add column if not exists uploader_phone text not null default '';

drop policy if exists "album_photos_anon_insert" on public.album_photos;
create policy "album_photos_anon_insert"
on public.album_photos for insert
to anon, authenticated
with check (true);

-- Fotos del iPhone (HEIC/HEIF)
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
]
where id = 'vibrart-album';

-- Galería pública (ver lo que otros subieron)
drop view if exists public.album_photos_gallery;
create view public.album_photos_gallery as
select id, album, public_url, uploader_name, description, created_at
from public.album_photos
where coalesce(trim(public_url), '') <> '';

grant select on public.album_photos_gallery to anon, authenticated;
