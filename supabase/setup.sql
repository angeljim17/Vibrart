-- ============================================================
-- VIBRART — Configuración Supabase
-- Ejecuta este SQL en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1) Tabla de metadatos de fotos
create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album text not null check (album in ('vibrart-2026', 'souvenirs')),
  description text default '',
  storage_path text not null,
  file_name text,
  public_url text,
  upload_batch_id uuid,
  uploader_name text not null default '',
  uploader_email text not null default '',
  uploader_phone text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists album_photos_album_idx on public.album_photos (album);
create index if not exists album_photos_created_idx on public.album_photos (created_at desc);
create index if not exists album_photos_batch_idx on public.album_photos (upload_batch_id);

-- 2) Bucket de Storage (público para ver fotos en el álbum)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vibrart-album',
  'vibrart-album',
  true,
  12582912, -- 12 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) Políticas Storage — lectura pública
drop policy if exists "vibrart_album_public_read" on storage.objects;
create policy "vibrart_album_public_read"
on storage.objects for select
to public
using (bucket_id = 'vibrart-album');

-- 4) Políticas Storage — subida anónima (festival abierto)
-- En producción puedes restringir con auth.uid() o Edge Functions
drop policy if exists "vibrart_album_anon_insert" on storage.objects;
create policy "vibrart_album_anon_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'vibrart-album');

-- 5) Permisos Data API (requerido en proyectos nuevos de Supabase)
grant usage on schema public to anon, authenticated;
grant select, insert on public.album_photos to anon, authenticated;

-- 6) RLS tabla album_photos
alter table public.album_photos enable row level security;

drop policy if exists "album_photos_public_read" on public.album_photos;
create policy "album_photos_public_read"
on public.album_photos for select
to public
using (true);

drop policy if exists "album_photos_anon_insert" on public.album_photos;
create policy "album_photos_anon_insert"
on public.album_photos for insert
to anon, authenticated
with check (true);

-- 7) Vista galería pública (imagen, nombre, descripción; sin correo/teléfono)
drop view if exists public.album_photos_gallery;
create view public.album_photos_gallery as
select id, album, public_url, uploader_name, description, created_at
from public.album_photos
where coalesce(trim(public_url), '') <> '';

grant select on public.album_photos_gallery to anon, authenticated;
