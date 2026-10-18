-- Run the whole file as one request. Every fixture change is rolled back.
-- Requires an active admin, a pending checkout with a two-day gap, and the migration.
begin;
do $$
#variable_conflict use_variable
declare
  admin_id uuid;
  worker_id uuid;
  room uuid;
  task_id uuid;
  item_id uuid;
  booking uuid;
  booking_task uuid;
  original_date date;
  original_status public.booking_status;
  initial jsonb;
  replay jsonb;
  outcome jsonb;
  saved public.cleaning_task_results%rowtype;
  total integer;
begin
  select id into admin_id from public.staff where active and 'equipas'=any(permissions) limit 1;
  select id into worker_id from public.staff where active and id<>admin_id order by ('limpeza'=any(permissions)) desc limit 1;
  if admin_id is null then raise exception 'Test requires an active admin account'; end if;
  worker_id:=coalesce(worker_id,admin_id);
  select b.id,b.room_id,b.check_out,b.status,t.id into booking,room,original_date,original_status,booking_task
    from public.bookings b join public.cleaning_tasks t on t.booking_id=b.id and t.source='checkout'
    where b.status<>'cancelada' and t.status='pendente'
      and not exists(select 1 from public.bookings other where other.id<>b.id and other.room_id=b.room_id and other.status<>'cancelada' and other.check_in<b.check_out+2 and other.check_out>b.check_out) limit 1;
  if booking is null then raise exception 'Test requires a pending checkout task'; end if;
  -- All fixture changes are rolled back by the outer transaction.
  update public.staff set permissions=array['equipas','reservas'] where id=admin_id;
  update public.staff set hourly_rate=18 where id=worker_id;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  execute 'set local role authenticated';
  insert into public.cleaning_tasks(room_id,task_date,source,status,notes)
    values(room,current_date,'manual','pendente','Transactional lifecycle verification') returning id into task_id;
  select count(*) into total from public.cleaning_task_items where cleaning_task_items.task_id=task_id;
  if total<2 then raise exception 'Checklist seed failed'; end if;
  perform public.assign_cleaning_task(task_id,worker_id);
  execute 'reset role';
  update public.staff set permissions=array['limpeza'] where id=worker_id;
  perform set_config('request.jwt.claim.sub',worker_id::text,true);
  execute 'set local role authenticated';
  begin
    update public.cleaning_tasks set status='concluida' where id=task_id;
    raise exception 'Direct lifecycle update should be forbidden';
  exception when insufficient_privilege then null;
  end;
  initial:=public.start_cleaning_task(task_id);
  replay:=public.start_cleaning_task(task_id);
  if initial#>>'{task,status}'<>'em_curso' or initial#>>'{task,started_at}' is distinct from replay#>>'{task,started_at}' then raise exception 'Start/replay failed'; end if;
  select id into item_id from public.cleaning_task_items where cleaning_task_items.task_id=task_id order by position limit 1;
  outcome:=public.check_cleaning_item(task_id,item_id,true);
  if outcome#>>'{task,status}'<>'em_curso' or outcome#>>'{item,checked_by}'<>worker_id::text then raise exception 'Item audit failed'; end if;
  if exists(select 1 from public.cleaning_task_results) then raise exception 'Worker can read private costs'; end if;
  execute 'reset role';
  update public.cleaning_tasks set started_at=now()-interval '61 seconds' where id=task_id;
  update public.cleaning_task_results set started_at=now()-interval '61 seconds' where cleaning_task_results.task_id=task_id;
  update public.staff set hourly_rate=90 where id=worker_id;
  execute 'set local role authenticated';
  for item_id in select id from public.cleaning_task_items where cleaning_task_items.task_id=task_id and not checked order by position loop
    outcome:=public.check_cleaning_item(task_id,item_id,true);
  end loop;
  if outcome#>>'{task,status}'<>'concluida' then raise exception 'Automatic completion failed'; end if;
  replay:=public.check_cleaning_item(task_id,item_id,true);
  if outcome#>>'{task,completed_at}' is distinct from replay#>>'{task,completed_at}' then raise exception 'Completion replay changed timer'; end if;
  begin
    perform public.check_cleaning_item(task_id,item_id,false);
    raise exception 'Completed task can be reopened';
  exception when invalid_parameter_value then null;
  end;
  execute 'reset role';
  select * into saved from public.cleaning_task_results where cleaning_task_results.task_id=task_id;
  if saved.hourly_rate<>18 or saved.duration_seconds<61 or saved.total_cost<>round(saved.duration_seconds*18::numeric/3600,2) or saved.completed_by<>worker_id then raise exception 'Saved result/cost is incorrect'; end if;
  update public.staff set permissions=array['equipas','reservas'] where id=admin_id;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  execute 'set local role authenticated';
  if not exists(select 1 from public.cleaning_task_results where cleaning_task_results.task_id=task_id) then raise exception 'Admin cannot read costs'; end if;
  update public.bookings set check_out=original_date+1 where id=booking;
  if (select count(*) from public.cleaning_tasks where booking_id=booking)<>1 or (select task_date from public.cleaning_tasks where id=booking_task)<>original_date+1 then raise exception 'Checkout sync/date failed'; end if;
  update public.bookings set status='cancelada' where id=booking;
  if exists(select 1 from public.cleaning_tasks where booking_id=booking) then raise exception 'Cancelled pending checkout persists'; end if;
  update public.bookings set status=original_status where id=booking;
  select id into booking_task from public.cleaning_tasks where booking_id=booking;
  if booking_task is null then raise exception 'Checkout creation failed'; end if;
  perform public.assign_cleaning_task(booking_task,worker_id);
  perform public.start_cleaning_task(booking_task);
  update public.bookings set status='cancelada' where id=booking;
  if not exists(select 1 from public.cleaning_tasks where id=booking_task and status='em_curso') then raise exception 'Cancellation erased started cleaning'; end if;
  for item_id in select id from public.cleaning_task_items where cleaning_task_items.task_id=booking_task and not checked loop
    perform public.check_cleaning_item(booking_task,item_id,true);
  end loop;
  update public.bookings set status=original_status,check_out=original_date+2 where id=booking;
  if not exists(select 1 from public.cleaning_tasks where id=booking_task and status='concluida' and task_date=original_date+1) then raise exception 'Booking update rewrote cleaning history'; end if;
  execute 'reset role';
end;
$$;
select 'PASS: real RLS, checkout creation/date/cancellation, checklist, assignment, explicit start, replay, automatic completion, admin-only costs and hourly-rate snapshot. All test changes rolled back.' as verification;
rollback;
