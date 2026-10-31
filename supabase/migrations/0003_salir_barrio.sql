-- Dejar un barrio (por ejemplo, un élder que se cambia de sector).
-- El historial de almuerzos queda en el barrio; solo se quita el rol de quien se va.

create function public.salir_barrio(p_barrio uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rol text := public.rol_en(p_barrio);
  v_hoy date;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  if v_rol is null then raise exception 'No perteneces a este barrio' using errcode = 'P0002'; end if;
  if v_rol = 'encargado'
     and (select count(*) from public.roles_barrio where barrio_id = p_barrio and rol = 'encargado') <= 1 then
    raise exception 'El barrio necesita al menos un encargado. Nombra a otro antes de irte.' using errcode = '23514';
  end if;
  v_hoy := (now() at time zone (select zona_horaria from public.barrios where id = p_barrio))::date;
  if exists (select 1 from public.almuerzos
             where barrio_id = p_barrio and creado_por = auth.uid() and estado = 'reservado' and fecha >= v_hoy) then
    raise exception 'Tienes almuerzos anotados en este barrio. Libéralos antes de salir.' using errcode = '23514';
  end if;
  delete from public.roles_barrio where user_id = auth.uid() and barrio_id = p_barrio;
end $$;

revoke execute on function public.salir_barrio(uuid) from public, anon;
grant execute on function public.salir_barrio(uuid) to authenticated;
