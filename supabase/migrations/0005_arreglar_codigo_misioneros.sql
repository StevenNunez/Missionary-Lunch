-- Arreglo: gen_random_bytes (pgcrypto) vive en el esquema "extensions" en Supabase y las funciones
-- con search_path = public no lo encuentran, por lo que crear_barrio y regenerar_codigo fallaban.
-- gen_random_uuid() es parte de Postgres y no depende de ninguna extensión.

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
    values (v_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_id, 'encargado');
  return v_slug;
end $$;

create or replace function public.regenerar_codigo(p_barrio uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  if public.rol_en(p_barrio) is distinct from 'encargado' then
    raise exception 'Solo el encargado' using errcode = '42501';
  end if;
  update public.barrio_secretos set codigo_misioneros = v_codigo where barrio_id = p_barrio;
  return v_codigo;
end $$;
