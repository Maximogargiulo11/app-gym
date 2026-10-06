-- Banca · perfiles para usuarios creados antes de que existiera el trigger handle_new_user
-- (por ejemplo, si alguien se registró antes de aplicar las migraciones en el proyecto).
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  nullif(left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 60), ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;
