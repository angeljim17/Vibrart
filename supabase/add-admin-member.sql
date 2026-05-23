-- ============================================================
-- VIBRART — Dar de alta uno o varios administradores
-- Requisito: cada correo ya debe existir en Authentication → Users
-- (con Auto Confirm User). Luego ejecuta el bloque que necesites.
-- ============================================================

-- ---------- Un solo admin ----------
-- insert into public.admin_members (user_id)
-- select id from auth.users where lower(email) = lower('admin2@vibrart.com')
-- on conflict (user_id) do nothing;

-- ---------- Varios admins (añade correos en la lista IN; sin coma al final) ----------
insert into public.admin_members (user_id)
select u.id
from auth.users u
where lower(u.email) in (
  lower('admin1@vibrart.com'),
  lower('admin2@vibrart.com')
)
on conflict (user_id) do nothing;

-- Si comentas un correo, quita también la coma de la línea anterior.
-- Mal:  ('admin1@...'),   ← coma suelta si la siguiente línea está comentada
--        -- ('admin2@...')

-- ---------- Comprobar resultado ----------
-- select u.email, m.active,
--   case when m.id is not null and m.active then 'SÍ' else 'NO' end as puede_admin
-- from auth.users u
-- left join public.admin_members m on m.user_id = u.id
-- where lower(u.email) in (
--   lower('admin1@vibrart.com'),
--   lower('admin2@vibrart.com')
-- );
