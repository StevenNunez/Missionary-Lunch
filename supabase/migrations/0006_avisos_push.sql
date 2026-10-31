-- Avisos push (PWA): cada celular que instala la app y activa los avisos guarda aquí su suscripción.
-- Sirve también para las cuentas creadas con WhatsApp, que no tienen correo y no recibían recordatorios.
-- Se escribe solo desde el servidor (clave de servicio); la persona puede ver y borrar las suyas.

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
create index if not exists push_suscripciones_user_idx on public.push_suscripciones (user_id);

alter table public.push_suscripciones enable row level security;

drop policy if exists "push: ver las propias" on public.push_suscripciones;
create policy "push: ver las propias" on public.push_suscripciones
  for select using (user_id = auth.uid());

drop policy if exists "push: borrar las propias" on public.push_suscripciones;
create policy "push: borrar las propias" on public.push_suscripciones
  for delete using (user_id = auth.uid());
