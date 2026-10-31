-- Número de unidad de la Iglesia (identifica al barrio, es público) y búsqueda pública por nombre o número.
-- Esto identifica el barrio; NO da permisos. El rol de encargado se sigue asignando por separado.

alter table public.barrios
  add column unidad text unique check (unidad ~ '^[0-9]{4,9}$'),
  add column direccion_capilla text not null default '';

-- ───────────────────────── Lo público de un barrio ─────────────────────────
-- Solo nombre, número de unidad y dirección de la capilla (ya públicos en el sitio de la Iglesia).
-- Nunca teléfonos, pensión ni alergias.

drop function public.barrio_publico(text);
create function public.barrio_publico(p_slug text)
returns table (slug text, nombre text, unidad text, direccion text)
language sql stable security definer set search_path = public as $$
  select b.slug, b.nombre, b.unidad, b.direccion_capilla from public.barrios b where b.slug = p_slug
$$;

-- Con número de unidad: coincidencia exacta. Con texto: mínimo 3 letras (no se puede listar todo), máximo 8 resultados.
create function public.buscar_barrios(p_texto text)
returns table (slug text, nombre text, unidad text, direccion text)
language plpgsql stable security definer set search_path = public as $$
declare v text := lower(trim(coalesce(p_texto, '')));
begin
  if v ~ '^[0-9]{4,9}$' then
    return query
      select b.slug, b.nombre, b.unidad, b.direccion_capilla from public.barrios b where b.unidad = v limit 1;
    return;
  end if;
  v := translate(v, 'áéíóúüñ', 'aeiouun');
  v := replace(replace(replace(v, '\', '\\'), '%', '\%'), '_', '\_');
  if char_length(v) < 3 then return; end if;
  return query
    select b.slug, b.nombre, b.unidad, b.direccion_capilla
    from public.barrios b
    where translate(lower(b.nombre), 'áéíóúüñ', 'aeiouun') like '%' || v || '%'
    order by b.nombre
    limit 8;
end $$;

-- ───────────────────────── Crear barrio con su número de unidad ─────────────────────────

drop function public.crear_barrio(text);
create function public.crear_barrio(p_nombre text, p_unidad text default null, p_direccion text default '')
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
  insert into public.barrios (slug, nombre, unidad, direccion_capilla, creado_por)
    values (v_slug, trim(p_nombre), v_unidad, left(trim(coalesce(p_direccion, '')), 200), auth.uid())
    returning id into v_id;
  insert into public.companerismos (barrio_id, nombre, tipo, orden) values (v_id, 'Élderes', 'elderes', 0);
  insert into public.barrio_secretos (barrio_id, codigo_misioneros)
    values (v_id, upper(encode(gen_random_bytes(4), 'hex')));
  insert into public.roles_barrio (user_id, barrio_id, rol) values (auth.uid(), v_id, 'encargado');
  return v_slug;
end $$;

-- Las funciones nuevas nacen ejecutables por todos: se cierran y se abren solo las necesarias
revoke execute on function public.barrio_publico(text), public.buscar_barrios(text),
  public.crear_barrio(text, text, text) from public, anon;
grant execute on function public.barrio_publico(text), public.buscar_barrios(text) to anon, authenticated;
grant execute on function public.crear_barrio(text, text, text) to authenticated;
