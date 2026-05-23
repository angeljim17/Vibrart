-- Agrupa fotos subidas en el mismo clic de «Subir fotos al álbum»
-- Ejecuta en SQL Editor si ya creaste la tabla antes:

alter table public.album_photos
  add column if not exists upload_batch_id uuid;

create index if not exists album_photos_batch_idx on public.album_photos (upload_batch_id);
