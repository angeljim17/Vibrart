-- ============================================================
-- VIBRART — Acceso admin (ejecutar después de setup.sql)
-- Solo usuarios en admin_members + Supabase Auth pueden leer el álbum.
-- ============================================================

-- 1) Tabla de administradores (vinculada a auth.users)
create table if not exists public.admin_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_members_user_id_idx on public.admin_members (user_id);

alter table public.admin_members enable row level security;

-- Cada usuario solo puede comprobar SU propia fila (no listar todos los admins)
drop policy if exists "admin_members_self_read" on public.admin_members;
create policy "admin_members_self_read"
on public.admin_members for select
to authenticated
using (user_id = auth.uid() and active = true);

-- Sin INSERT/UPDATE/DELETE desde la app: altas solo con service_role en el Dashboard SQL

-- 2) Función para políticas RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_members
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3) Quitar lectura pública del álbum (datos de asistentes)
drop policy if exists "album_photos_public_read" on public.album_photos;

drop policy if exists "album_photos_admin_select" on public.album_photos;
create policy "album_photos_admin_select"
on public.album_photos for select
to authenticated
using (public.is_admin());

-- 4) Permisos: anon solo inserta; authenticated admin lee
revoke select on public.album_photos from anon;
grant select, delete on public.album_photos to authenticated;
grant select on public.admin_members to authenticated;

-- La subida pública (anon) sigue con INSERT (política album_photos_anon_insert).
-- anon NO tiene SELECT: la app debe usar Prefer: return=minimal al insertar (ver supabase-client.js).

-- ============================================================
-- Dar de alta un admin (ejemplo — ejecutar en SQL Editor):
--
-- 1) Supabase → Authentication → Users → Add user (email + contraseña)
-- 2) Luego:
--
-- insert into public.admin_members (user_id)
-- select id from auth.users where lower(email) = lower('tu-correo@vibrart.com')
-- on conflict (user_id) do nothing;
-- ============================================================
