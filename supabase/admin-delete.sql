-- ============================================================
-- VIBRART — Eliminar fotos desde el panel admin
-- Ejecutar después de setup.sql y admin-auth.sql
-- ============================================================

grant delete on public.album_photos to authenticated;

drop policy if exists "album_photos_admin_delete" on public.album_photos;
create policy "album_photos_admin_delete"
on public.album_photos for delete
to authenticated
using (public.is_admin());

-- Storage: hace falta SELECT + DELETE para el usuario autenticado (admin)
drop policy if exists "vibrart_album_admin_select" on storage.objects;
create policy "vibrart_album_admin_select"
on storage.objects for select
to authenticated
using (bucket_id = 'vibrart-album' and public.is_admin());

drop policy if exists "vibrart_album_admin_delete" on storage.objects;
create policy "vibrart_album_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'vibrart-album' and public.is_admin());
