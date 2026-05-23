-- ============================================================
-- VIBRART — Comprobar usuarios admin (solo diagnóstico en SQL Editor)
-- ============================================================

-- ¿Existen la tabla y la función?
select
  exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_members') as tabla_admin_members,
  exists (select 1 from pg_proc where proname = 'is_admin') as funcion_is_admin;

-- Usuarios Auth y si están en admin_members
select
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  m.id as admin_row_id,
  m.active as admin_activo,
  case
    when m.id is not null and m.active then 'SÍ — puede entrar al panel'
    when m.id is not null and not m.active then 'NO — admin desactivado'
    else 'NO — falta INSERT en admin_members'
  end as puede_admin
from auth.users u
left join public.admin_members m on m.user_id = u.id
order by u.created_at desc;

-- Comprobar correos concretos (admin_activo NULL = aún no está en admin_members)
-- Edita la lista de correos si hace falta:
select
  e.email_esperado,
  u.id as user_id,
  u.email as email_en_auth,
  u.email_confirmed_at,
  m.active as admin_activo,
  case
    when u.id is null then 'NO — no existe en Authentication (Users → Add user)'
    when m.id is null then 'NO — falta INSERT en admin_members'
    when not m.active then 'NO — admin desactivado (active = false)'
    else 'SÍ — puede entrar al panel'
  end as estado
from (
  values
    ('admin1@vibrart.com'),
    ('admin2@vibrart.com')
) as e(email_esperado)
left join auth.users u on lower(u.email) = lower(e.email_esperado)
left join public.admin_members m on m.user_id = u.id;

-- Dar de alta varios (ver supabase/add-admin-member.sql):
-- insert into public.admin_members (user_id)
-- select u.id from auth.users u
-- where lower(u.email) in (lower('admin1@vibrart.com'), lower('admin2@vibrart.com'))
-- on conflict (user_id) do nothing;

-- Dar de alta (cambia el correo; no falla si ya existe):
-- insert into public.admin_members (user_id)
-- select id from auth.users where lower(email) = lower('tu-correo@ejemplo.com')
-- on conflict (user_id) do nothing;
