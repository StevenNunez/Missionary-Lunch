-- Un barrio nuevo nace "pendiente": su creador lo ve y lo configura, pero no aparece en el buscador
-- ni se puede entrar por enlace hasta que Teo Labs lo aprueba (scripts/barrios.mjs).
-- Los barrios que ya existen quedan aprobados.

alter table public.barrios
  add column estado text not null default 'aprobado' check (estado in ('pendiente', 'aprobado'));

-- Pendiente: solo lo ven quienes ya pertenecen a él
create or replace function public.barrio_publico(p_slug text)
returns table (slug text, nombre text, unidad text, direccion text)
language sql stable security definer set search_path = public as $$
  select b.slug, b.nombre, b.unidad, b.direccion_capilla
  from public.barrios b
  where b.slug = p_slug and (b.estado = 'aprobado' or public.rol_en(b.id) is not null)
$$;

create or replace function public.buscar_barrios(p_texto text)
returns table (slug text, nombre text, unidad text, direccion text)
language plpgsql stable security definer set search_path = public as $$
declare v text := lower(trim(coalesce(p_texto, '')));
begin
  if v ~ '^[0-9]{4,9}$' then
    return query
      select b.slug, b.nombre, b.unidad, b.direccion_capilla
      from public.barrios b where b.unidad = v and b.estado = 'aprobado' limit 1;
    return;
  end if;
  v := translate(v, 'áéíóúüñ', 'aeiouun');
  v := replace(replace(replace(v, '\', '\\'), '%', '\%'), '_', '\_');
  if char_length(v) < 3 then return; end if;
  return query
    select b.slug, b.nombre, b.unidad, b.direccion_capilla
    from public.barrios b
    where b.estado = 'aprobado'
      and translate(lower(b.nombre), 'áéíóúüñ', 'aeiouun') like '%' || v || '%'
    order by b.nombre
    limit 8;
end $$;

-- Crear: queda pendiente (el número de unidad ya queda tomado, para que nadie lo duplique)
create or replace function public.crear_barrio(p_nombre text, p_unidad text default null, p_direccion text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_base text := public._slugify(p_nombre);
  v_slug text := v_base;
  v_n int := 1;
  v_id uuid;
  v_unidad text := nullif(trim(coalesce(p_unidad, '')), '');
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  if v_unidad is not null then
    if v_unidad !~ '^[0-9]{4,9}$' then raise exception 'Número de unidad inválido' using errcode = '22023'; end if;
    if exists (select 1 from public.barrios where unidad = v_unidad) then
      raise exception 'Ese barrio ya está creado. Búscalo en el inicio y entra desde ahí.';
    end if;
  end if;
  while exists (select 1 from public.barrios where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  insert into public.barrios (slug, nombre, unidad, direccion_capilla, estado, creado_por)
    values (v_slug, trim(p_nombre), v_unidad, left(trim(coalesce(p_direccion, '')), 200), 'pendiente', auth.uid())
    returning id into v_id;
  insert into public.companerismos (barrio_id, nombre, tipo, orden) values (v_id, 'Élderes', 'elderes', 0);
  insert into public.barrio_secretos (barrio_id, codigo_misioneros)
    values (v_id, upper(encode(gen_random_bytes(4), 'hex')));
  insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_id, 'encargado');
  return v_slug;
end $$;

-- Entrar: no se puede entrar a un barrio pendiente
create or replace function public.unirse_barrio(p_slug text, p_codigo text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_barrio uuid;
  v_estado text;
  v_actual text;
  v_rol text := 'miembro';
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select id, estado into v_barrio, v_estado from public.barrios where slug = p_slug;
  if v_barrio is null then raise exception 'Barrio no encontrado' using errcode = 'P0002'; end if;
  select rol into v_actual from public.roles_barrio where user_id = auth.uid() and barrio_id = v_barrio;
  if v_estado = 'pendiente' and v_actual is null then
    raise exception 'Este barrio todavía no está habilitado. Pídele al encargado que te avise cuando lo esté.' using errcode = 'P0002';
  end if;
  if nullif(trim(p_codigo), '') is not null then
    if not exists (select 1 from public.barrio_secretos
                   where barrio_id = v_barrio and codigo_misioneros = upper(trim(p_codigo))) then
      raise exception 'Código incorrecto' using errcode = '42501';
    end if;
    v_rol := 'misionero';
  end if;
  if v_actual is null then
    insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_barrio, v_rol);
    return v_rol;
  elsif v_actual = 'miembro' and v_rol = 'misionero' then
    update public.roles_barrio set rol = 'misionero' where user_id = auth.uid() and barrio_id = v_barrio;
    return 'misionero';
  end if;
  return v_actual;
end $$;
