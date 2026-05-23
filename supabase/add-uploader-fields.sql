
alter table public.album_photos add column if not exists upload_batch_id uuid;
alter table public.album_photos add column if not exists uploader_name text not null default '';
alter table public.album_photos add column if not exists uploader_email text not null default '';
alter table public.album_photos add column if not exists uploader_phone text not null default '';

create index if not exists album_photos_batch_idx on public.album_photos (upload_batch_id);
