-- Existing production trigger definitions inspected on 2026-10-17.
-- Used only in the isolated lifecycle regression test.
CREATE OR REPLACE FUNCTION public.sync_checkout_cleaning_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status = 'cancelada' then
    delete from public.cleaning_tasks where booking_id = new.id and source = 'checkout';
    return new;
  end if;

  insert into public.cleaning_tasks (booking_id, room_id, task_date, source, status)
  values (new.id, new.room_id, new.check_out, 'checkout', 'pendente')
  on conflict (booking_id) where source = 'checkout'
  do update set room_id = excluded.room_id, task_date = excluded.task_date;

  return new;
end;
$function$
;
CREATE TRIGGER bookings_sync_checkout_cleaning_task AFTER INSERT OR UPDATE OF check_out, room_id, status ON public.bookings FOR EACH ROW EXECUTE FUNCTION sync_checkout_cleaning_task();
CREATE OR REPLACE FUNCTION public.seed_cleaning_task_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.cleaning_task_items (task_id, zone, label, position)
  select new.id, t.zone, t.label, t.position
  from public.cleaning_checklist_template t
  where t.is_active
  order by t.position;
  return new;
end;
$function$
;
CREATE TRIGGER cleaning_tasks_seed_items AFTER INSERT ON public.cleaning_tasks FOR EACH ROW EXECUTE FUNCTION seed_cleaning_task_items();
CREATE OR REPLACE FUNCTION public.track_cleaning_task_timing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status = 'em_curso' and old.status <> 'em_curso' then
    new.started_at = now();
    new.completed_at = null;
  elsif new.status = 'concluida' and old.status <> 'concluida' then
    new.completed_at = now();
  elsif new.status = 'pendente' and old.status <> 'pendente' then
    new.started_at = null;
    new.completed_at = null;
  end if;
  return new;
end;
$function$
;
CREATE TRIGGER cleaning_tasks_track_timing BEFORE UPDATE OF status ON public.cleaning_tasks FOR EACH ROW EXECUTE FUNCTION track_cleaning_task_timing();
CREATE OR REPLACE FUNCTION public.cleaning_task_items_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.task_id := old.task_id;
  new.zone := old.zone;
  new.label := old.label;
  new.position := old.position;
  if new.checked is distinct from old.checked then
    new.checked_by := case when new.checked then auth.uid() else null end;
    new.checked_at := case when new.checked then now() else null end;
  else
    new.checked_by := old.checked_by;
    new.checked_at := old.checked_at;
  end if;
  return new;
end;
$function$
;
CREATE TRIGGER cleaning_task_items_guard BEFORE UPDATE ON public.cleaning_task_items FOR EACH ROW EXECUTE FUNCTION cleaning_task_items_guard();