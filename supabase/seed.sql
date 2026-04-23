insert into public."Role" (id, name, description)
values
  ('role_member', 'MEMBER', 'Membro base da igreja'),
  ('role_leader', 'LEADER', 'Lider de celula'),
  ('role_discipler', 'DISCIPLER', 'Responsavel por discipulado'),
  ('role_pastor', 'PASTOR', 'Pastor com supervisao ampliada'),
  ('role_admin', 'ADMIN', 'Administrador central')
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description;

insert into public."Campus" (id, name)
values
  ('campus_lisboa', 'Lisboa'),
  ('campus_porto', 'Porto'),
  ('campus_coimbra', 'Coimbra')
on conflict (id) do update
set
  name = excluded.name;
