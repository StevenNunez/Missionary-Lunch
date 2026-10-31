-- Missionary Lunch — esquema inicial
-- Todo es a nivel de barrio. Roles: encargado | misionero | miembro.
-- Las escrituras sensibles pasan por funciones (security definer): las tablas
-- no tienen políticas de INSERT/UPDATE directas para almuerzos ni roles.

create extension if not exists pgcrypto;

-- ───────────────────────── Tablas ─────────────────────────

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  creado_en timestamptz not null default now()
);

create table public.barrios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(nombre) between 2 and 80),
  encargado_nombre text not null default '',
  telefono_encargado text not null default '',
  telefono_misioneros text not null default '',
  direccion_pension text not null default '',
  ventana text not null default '13:00 – 15:00',
  alergias text not null default '',
  dias_sin_almuerzo smallint[] not null default '{}',   -- 0 = domingo
  guias_presidente text not null default '',
  zona_horaria text not null default 'America/Santiago',
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.barrio_secretos (
  barrio_id uuid primary key references public.barrios(id) on delete cascade,
  codigo_misioneros text not null
);

create table public.companerismos (
  id uuid primary key default gen_random_uuid(),
  barrio_id uuid not null references public.barrios(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  tipo text not null default 'elderes' check (tipo in ('elderes', 'hermanas')),
  orden smallint not null default 0
);
create index on public.companerismos (barrio_id);

create table public.roles_barrio (
  user_id uuid not null references auth.users(id) on delete cascade,
  barrio_id uuid not null references public.barrios(id) on delete cascade,
  rol text not null check (rol in ('encargado', 'misionero', 'miembro')),
  creado_en timestamptz not null default now(),
  primary key (user_id, barrio_id)
);
create index on public.roles_barrio (barrio_id);

-- Parte visible para todo el barrio
create table public.almuerzos (
  id uuid primary key default gen_random_uuid(),
  barrio_id uuid not null references public.barrios(id) on delete cascade,
  companerismo_id uuid not null references public.companerismos(id),
  fecha date not null,
  familia text not null check (char_length(familia) between 1 and 80),
  modo text not null check (modo in ('casa', 'retiro', 'entrega')),
  hora time not null,
  estado text not null default 'reservado' check (estado in ('reservado', 'cancelado')),
  miembro_confirmo boolean not null default false,
  miembro_confirmo_en timestamptz,
  mision_confirmo boolean not null default false,
  mision_confirmo_en timestamptz,
  creado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now(),
  cancelado_en timestamptz
);
-- Un cupo por día y compañerismo (los cancelados no ocupan cupo)
create unique index almuerzos_cupo_unico
  on public.almuerzos (barrio_id, fecha, companerismo_id) where estado = 'reservado';
create index on public.almuerzos (barrio_id, fecha);

-- Parte privada: teléfono, dirección, notas. Solo la familia, el encargado y los misioneros
create table public.almuerzo_detalle (
  almuerzo_id uuid primary key references public.almuerzos(id) on delete cascade,
  telefono text not null default '',
  lugar text not null default '',
  adulto_presente text not null default '',
  notas text not null default ''
);

-- ───────────────────────── Ayudas de seguridad ─────────────────────────

create or replace function public.rol_en(p_barrio uuid)
returns text language sql stable security definer set search_path = public as $$
  select rol from public.roles_barrio where user_id = auth.uid() and barrio_id = p_barrio
$$;

create or replace function public.es_creador(p_almuerzo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.almuerzos where id = p_almuerzo and creado_por = auth.uid())
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.perfiles enable row level security;
alter table public.barrios enable row level security;
alter table public.barrio_secretos enable row level security;
alter table public.companerismos enable row level security;
alter table public.roles_barrio enable row level security;
alter table public.almuerzos enable row level security;
alter table public.almuerzo_detalle enable row level security;

create policy perfiles_propio_select on public.perfiles for select using (id = auth.uid());
create policy perfiles_propio_insert on public.perfiles for insert with check (id = auth.uid());
create policy perfiles_propio_update on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy roles_propios on public.roles_barrio for select using (user_id = auth.uid());

create policy barrios_miembros_select on public.barrios for select using (public.rol_en(id) is not null);
create policy barrios_encargado_update on public.barrios for update
  using (public.rol_en(id) = 'encargado') with check (public.rol_en(id) = 'encargado');

create policy secretos_encargado_select on public.barrio_secretos for select
  using (public.rol_en(barrio_id) = 'encargado');

create policy comp_miembros_select on public.companerismos for select using (public.rol_en(barrio_id) is not null);
create policy comp_encargado_insert on public.companerismos for insert with check (public.rol_en(barrio_id) = 'encargado');
create policy comp_encargado_update on public.companerismos for update
  using (public.rol_en(barrio_id) = 'encargado') with check (public.rol_en(barrio_id) = 'encargado');
create policy comp_encargado_delete on public.companerismos for delete using (public.rol_en(barrio_id) = 'encargado');

create policy almuerzos_miembros_select on public.almuerzos for select using (public.rol_en(barrio_id) is not null);

create policy detalle_select on public.almuerzo_detalle for select using (
  public.es_creador(almuerzo_id)
  or public.rol_en((select barrio_id from public.almuerzos a where a.id = almuerzo_id)) in ('encargado', 'misionero')
);

-- Realtime (el cliente refresca cuando cambian estas tablas, filtrado por RLS)
alter publication supabase_realtime add table public.almuerzos;
alter publication supabase_realtime add table public.almuerzo_detalle;

-- ───────────────────────── Funciones (escrituras) ─────────────────────────

create or replace function public._slugify(p text)
returns text language sql immutable as $$
  select coalesce(nullif(left(trim(both '-' from regexp_replace(
    lower(translate(p, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '[^a-z0-9]+', '-', 'g')), 40), ''), 'barrio')
$$;

create or replace function public.crear_barrio(p_nombre text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_base text := public._slugify(p_nombre);
  v_slug text := v_base;
  v_n int := 1;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  while exists (select 1 from public.barrios where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  insert into public.barrios (slug, nombre, creado_por) values (v_slug, trim(p_nombre), auth.uid())
    returning id into v_id;
  insert into public.companerismos (barrio_id, nombre, tipo, orden) values (v_id, 'Élderes', 'elderes', 0);
  insert into public.barrio_secretos (barrio_id, codigo_misioneros)
    values (v_id, upper(encode(gen_random_bytes(4), 'hex')));
  insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_id, 'encargado');
  return v_slug;
end $$;

-- Lo único que ve alguien que aún no pertenece al barrio: el nombre
create or replace function public.barrio_publico(p_slug text)
returns table (nombre text) language sql stable security definer set search_path = public as $$
  select b.nombre from public.barrios b where b.slug = p_slug
$$;

-- Entra al barrio como miembro; con el código de los misioneros, como misionero
create or replace function public.unirse_barrio(p_slug text, p_codigo text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_barrio uuid;
  v_actual text;
  v_rol text := 'miembro';
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select id into v_barrio from public.barrios where slug = p_slug;
  if v_barrio is null then raise exception 'Barrio no encontrado' using errcode = 'P0002'; end if;
  if nullif(trim(p_codigo), '') is not null then
    if not exists (select 1 from public.barrio_secretos
                   where barrio_id = v_barrio and codigo_misioneros = upper(trim(p_codigo))) then
      raise exception 'Código incorrecto' using errcode = '42501';
    end if;
    v_rol := 'misionero';
  end if;
  select rol into v_actual from public.roles_barrio where user_id = auth.uid() and barrio_id = v_barrio;
  if v_actual is null then
    insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_barrio, v_rol);
    return v_rol;
  elsif v_actual = 'miembro' and v_rol = 'misionero' then
    update public.roles_barrio set rol = 'misionero' where user_id = auth.uid() and barrio_id = v_barrio;
    return 'misionero';
  end if;
  return v_actual;
end $$;

create or replace function public.regenerar_codigo(p_barrio uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text := upper(encode(gen_random_bytes(4), 'hex'));
begin
  if public.rol_en(p_barrio) is distinct from 'encargado' then
    raise exception 'Solo el encargado' using errcode = '42501';
  end if;
  update public.barrio_secretos set codigo_misioneros = v_codigo where barrio_id = p_barrio;
  return v_codigo;
end $$;

create or replace function public.miembros_barrio(p_barrio uuid)
returns table (user_id uuid, nombre text, rol text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.rol_en(p_barrio) is distinct from 'encargado' then
    raise exception 'Solo el encargado' using errcode = '42501';
  end if;
  return query
    select r.user_id, coalesce(nullif(p.nombre, ''), 'Sin nombre'), r.rol
    from public.roles_barrio r left join public.perfiles p on p.id = r.user_id
    where r.barrio_id = p_barrio
    order by r.rol, p.nombre;
end $$;

create or replace function public.cambiar_rol(p_barrio uuid, p_user uuid, p_rol text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.rol_en(p_barrio) is distinct from 'encargado' then
    raise exception 'Solo el encargado' using errcode = '42501';
  end if;
  if p_rol not in ('encargado', 'misionero', 'miembro') then
    raise exception 'Rol inválido' using errcode = '22023';
  end if;
  if p_user = auth.uid() and p_rol <> 'encargado'
     and (select count(*) from public.roles_barrio where barrio_id = p_barrio and rol = 'encargado') <= 1 then
    raise exception 'El barrio necesita al menos un encargado' using errcode = '23514';
  end if;
  update public.roles_barrio set rol = p_rol where barrio_id = p_barrio and user_id = p_user;
end $$;

create or replace function public.reservar_almuerzo(
  p_companerismo uuid, p_fecha date, p_familia text, p_telefono text,
  p_modo text, p_hora time, p_lugar text, p_adulto text, p_notas text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_barrio public.barrios%rowtype;
  v_comp public.companerismos%rowtype;
  v_hoy date;
  v_id uuid;
begin
  select * into v_comp from public.companerismos where id = p_companerismo;
  if v_comp.id is null then raise exception 'Compañerismo no encontrado' using errcode = 'P0002'; end if;
  select * into v_barrio from public.barrios where id = v_comp.barrio_id;
  if coalesce(public.rol_en(v_barrio.id), '') not in ('miembro', 'encargado') then
    raise exception 'No puedes anotarte en este barrio' using errcode = '42501';
  end if;
  v_hoy := (now() at time zone v_barrio.zona_horaria)::date;
  if p_fecha < v_hoy or p_fecha > v_hoy + 60 then
    raise exception 'Fecha fuera del rango' using errcode = '22008';
  end if;
  if extract(dow from p_fecha)::smallint = any (v_barrio.dias_sin_almuerzo) then
    raise exception 'Ese día no hay almuerzo' using errcode = '22008';
  end if;
  insert into public.almuerzos (barrio_id, companerismo_id, fecha, familia, modo, hora, creado_por)
    values (v_barrio.id, p_companerismo, p_fecha, left(trim(p_familia), 80), p_modo, p_hora, auth.uid())
    returning id into v_id;   -- 23505 si otra familia ya tomó el cupo
  insert into public.almuerzo_detalle (almuerzo_id, telefono, lugar, adulto_presente, notas)
    values (v_id, left(coalesce(p_telefono, ''), 30), left(coalesce(p_lugar, ''), 200),
            left(coalesce(p_adulto, ''), 80), left(coalesce(p_notas, ''), 300));
  return v_id;
end $$;

-- La familia confirma desde el día anterior
create or replace function public.confirmar_miembro(p_almuerzo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.almuerzos%rowtype; v_hoy date;
begin
  select * into v from public.almuerzos where id = p_almuerzo and estado = 'reservado';
  if v.id is null or v.creado_por <> auth.uid() then
    raise exception 'No puedes confirmar este almuerzo' using errcode = '42501';
  end if;
  v_hoy := (now() at time zone (select zona_horaria from public.barrios where id = v.barrio_id))::date;
  if v.fecha > v_hoy + 1 then
    raise exception 'Podrás confirmar desde el día anterior' using errcode = '22008';
  end if;
  update public.almuerzos set miembro_confirmo = true, miembro_confirmo_en = now() where id = p_almuerzo;
end $$;

create or replace function public.confirmar_mision(p_almuerzo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_barrio uuid;
begin
  select barrio_id into v_barrio from public.almuerzos where id = p_almuerzo and estado = 'reservado';
  if v_barrio is null or coalesce(public.rol_en(v_barrio), '') not in ('misionero', 'encargado') then
    raise exception 'No puedes confirmar este almuerzo' using errcode = '42501';
  end if;
  update public.almuerzos set mision_confirmo = true, mision_confirmo_en = now() where id = p_almuerzo;
end $$;

-- La familia cancela el suyo; el encargado libera cualquiera
create or replace function public.liberar_almuerzo(p_almuerzo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.almuerzos%rowtype;
begin
  select * into v from public.almuerzos where id = p_almuerzo and estado = 'reservado';
  if v.id is null or (v.creado_por <> auth.uid() and public.rol_en(v.barrio_id) is distinct from 'encargado') then
    raise exception 'No puedes liberar este almuerzo' using errcode = '42501';
  end if;
  update public.almuerzos set estado = 'cancelado', cancelado_en = now() where id = p_almuerzo;
end $$;

-- ───────────────────────── Permisos de ejecución ─────────────────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function public.barrio_publico(text) to anon, authenticated;
grant execute on function
  public.rol_en(uuid), public.es_creador(uuid),
  public.crear_barrio(text), public.unirse_barrio(text, text), public.regenerar_codigo(uuid),
  public.miembros_barrio(uuid), public.cambiar_rol(uuid, uuid, text),
  public.reservar_almuerzo(uuid, date, text, text, text, time, text, text, text),
  public.confirmar_miembro(uuid), public.confirmar_mision(uuid), public.liberar_almuerzo(uuid)
  to authenticated;
