-- Apply after the existing cleaning/checklist migrations. No bookings or tasks
-- are backfilled. Historical tasks retain their original timestamps.
begin;

create schema if not exists pms_internal;
revoke all on schema pms_internal from public, anon;
grant usage on schema pms_internal to authenticated;

-- Booking writes remain authorized by bookings RLS. This trigger alone may
-- create checkout tasks after direct client lifecycle writes are restricted.
-- It cannot be called as an RPC and never rewrites work already started.
create function pms_internal.sync_checkout_cleaning_task() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role', true) in ('anon', 'authenticated')
     and (auth.uid() is null or not public.is_active_staff()) then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if new.status = 'cancelada' then
    delete from public.cleaning_tasks
      where booking_id = new.id and source = 'checkout' and status = 'pendente';
    return new;
  end if;
  insert into public.cleaning_tasks (booking_id, room_id, task_date, source, status)
    values (new.id, new.room_id, new.check_out, 'checkout', 'pendente')
    on conflict (booking_id) where source = 'checkout'
    do update set room_id = excluded.room_id, task_date = excluded.task_date
      where cleaning_tasks.status = 'pendente';
  return new;
end;
$$;
revoke all on function pms_internal.sync_checkout_cleaning_task() from public, anon, authenticated;
create or replace trigger bookings_sync_checkout_cleaning_task
  after insert or update of check_out, room_id, status on public.bookings
  for each row execute function pms_internal.sync_checkout_cleaning_task();

-- Separate from cleaning_tasks so worker subscriptions never expose rates.
create table public.cleaning_task_results (
  task_id uuid primary key references public.cleaning_tasks(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  staff_name text not null,
  hourly_rate numeric not null check (hourly_rate >= 0),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds bigint check (duration_seconds >= 0),
  total_cost numeric(12,2) check (total_cost >= 0),
  started_by uuid not null references public.staff(id),
  completed_by uuid references public.staff(id)
);
alter table public.cleaning_task_results enable row level security;
revoke all on public.cleaning_task_results from anon, authenticated;
grant select on public.cleaning_task_results to authenticated;
grant all on public.cleaning_task_results to service_role;
create policy cleaning_results_admin_read on public.cleaning_task_results
  for select to authenticated using (exists (
    select 1 from public.staff where id = (select auth.uid())
      and active and 'equipas' = any(permissions)
  ));

-- A worker can read their task; managers can see the operational board.
-- Restrictive policies also constrain any older, broader policies.
create policy cleaning_lifecycle_read on public.cleaning_tasks
  for select to authenticated using (exists (
    select 1 from public.staff s where s.id = (select auth.uid()) and s.active
      and (s.permissions && array['equipas','gerir_limpeza']::text[] or assigned_to = s.id)
  ));
create policy cleaning_lifecycle_read_guard on public.cleaning_tasks as restrictive
  for select to authenticated using (exists (
    select 1 from public.staff s where s.id = (select auth.uid()) and s.active
      and (s.permissions && array['equipas','gerir_limpeza']::text[] or assigned_to = s.id)
  ));
create policy cleaning_lifecycle_manage on public.cleaning_tasks
  for all to authenticated using (exists (
    select 1 from public.staff s where s.id = (select auth.uid()) and s.active
      and s.permissions && array['equipas','gerir_limpeza']::text[]
  )) with check (exists (
    select 1 from public.staff s where s.id = (select auth.uid()) and s.active
      and s.permissions && array['equipas','gerir_limpeza']::text[]
  ));
create policy cleaning_lifecycle_insert_guard on public.cleaning_tasks as restrictive
  for insert to authenticated with check (
    status = 'pendente' and started_at is null and completed_at is null
    and assigned_to is null and source = 'manual' and exists (
      select 1 from public.staff s where s.id = (select auth.uid()) and s.active
        and s.permissions && array['equipas','gerir_limpeza']::text[]
    )
  );
create policy cleaning_lifecycle_edit_guard on public.cleaning_tasks as restrictive
  for update to authenticated using (
    status = 'pendente' and exists (
      select 1 from public.staff s where s.id = (select auth.uid()) and s.active
        and s.permissions && array['equipas','gerir_limpeza']::text[]
    )
  ) with check (status = 'pendente' and started_at is null and completed_at is null);
create policy cleaning_lifecycle_delete_guard on public.cleaning_tasks as restrictive
  for delete to authenticated using (
    status = 'pendente' and source = 'manual' and exists (
      select 1 from public.staff s where s.id = (select auth.uid()) and s.active
        and s.permissions && array['equipas','gerir_limpeza']::text[]
    )
  );
create policy cleaning_lifecycle_items_read on public.cleaning_task_items
  for select to authenticated using (exists (
    select 1 from public.cleaning_tasks t where t.id = task_id
  ));
create policy cleaning_lifecycle_items_read_guard on public.cleaning_task_items as restrictive
  for select to authenticated using (exists (
    select 1 from public.cleaning_tasks t where t.id = task_id
  ));

-- Lifecycle fields are only changed by the transactional functions below.
revoke update on public.cleaning_tasks from authenticated, anon;
grant update (room_id, task_date, notes) on public.cleaning_tasks to authenticated;
revoke insert, update, delete on public.cleaning_task_items from authenticated, anon;

-- Private SECURITY DEFINER is required for writing the admin-only rate snapshot
-- and the protected lifecycle columns. Every operation checks the active actor,
-- and locks the parent task before touching its checklist (one consistent order).
create function pms_internal.apply_cleaning_action(
  p_task_id uuid, p_action text, p_item_id uuid default null,
  p_checked boolean default null, p_assignee uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor public.staff%rowtype;
  worker public.staff%rowtype;
  task public.cleaning_tasks%rowtype;
  item public.cleaning_task_items%rowtype;
  manager boolean;
  item_count integer;
  remaining integer;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  select * into actor from public.staff where id = auth.uid() and active;
  if not found then
    raise exception 'Não tens acesso ativo à equipa.' using errcode = '42501';
  end if;
  manager := coalesce(actor.permissions && array['equipas','gerir_limpeza']::text[], false);
  select * into task from public.cleaning_tasks where id = p_task_id for update;
  if not found or not (manager or coalesce(task.assigned_to = actor.id, false)) then
    raise exception 'Não tens acesso a esta tarefa.' using errcode = '42501';
  end if;

  if p_action = 'assign' then
    if not manager then
      raise exception 'Só a chefia de limpeza ou o administrador pode atribuir tarefas.' using errcode = '42501';
    end if;
    if task.status <> 'pendente' then
      raise exception 'Uma limpeza iniciada não pode mudar de responsável.' using errcode = '22023';
    end if;
    if p_assignee is not null then
      select * into worker from public.staff where id = p_assignee and active
        and permissions && array['limpeza','gerir_limpeza','equipas']::text[];
      if not found then
        raise exception 'Escolhe um membro ativo da equipa de limpeza.' using errcode = '22023';
      end if;
    end if;
    update public.cleaning_tasks set assigned_to = p_assignee where id = task.id returning * into task;

  elsif p_action = 'start' then
    if task.status = 'concluida' then
      raise exception 'Esta limpeza já está concluída.' using errcode = '22023';
    end if;
    if task.assigned_to is null then
      raise exception 'Atribui um responsável antes de iniciar a limpeza.' using errcode = '22023';
    end if;
    select * into worker from public.staff where id = task.assigned_to and active;
    if not found then
      raise exception 'O responsável não está ativo.' using errcode = '22023';
    end if;
    select count(*), count(*) filter (where not checked) into item_count, remaining
      from public.cleaning_task_items where task_id = task.id;
    if item_count = 0 then
      raise exception 'Esta limpeza não tem checklist. Configura a checklist antes de iniciar.' using errcode = '22023';
    end if;
    if task.status = 'pendente' then
      if remaining <> item_count then
        raise exception 'A checklist já tem itens marcados. É necessário rever esta tarefa antes de iniciar.' using errcode = '22023';
      end if;
      update public.cleaning_tasks set status = 'em_curso', started_at = clock_timestamp(), completed_at = null
        where id = task.id returning * into task;
      insert into public.cleaning_task_results(task_id, staff_id, staff_name, hourly_rate, started_at, started_by)
        values(task.id, worker.id, worker.name, worker.hourly_rate, task.started_at, actor.id);
    end if;

  elsif p_action = 'tick' then
    if p_checked is null then
      raise exception 'Indica o estado do item.' using errcode = '22023';
    end if;
    select * into item from public.cleaning_task_items where id = p_item_id and task_id = task.id;
    if not found then
      raise exception 'Item da checklist não encontrado.' using errcode = '22023';
    end if;
    -- Repeating the last acknowledged request is safe after completion.
    if task.status = 'concluida' and item.checked = p_checked then
      null;
    else
      if task.status <> 'em_curso' then
        raise exception 'Inicia a limpeza antes de marcar itens. Limpezas concluídas ficam em histórico.' using errcode = '22023';
      end if;
      update public.cleaning_task_items
        set checked = p_checked,
            checked_by = case when p_checked then actor.id else null end,
            checked_at = case when p_checked then clock_timestamp() else null end
        where id = item.id and checked is distinct from p_checked
        returning * into item;
      select * into item from public.cleaning_task_items where id = p_item_id;
      if not exists (select 1 from public.cleaning_task_items where task_id = task.id and not checked) then
        update public.cleaning_tasks set status = 'concluida', completed_at = clock_timestamp()
          where id = task.id returning * into task;
        update public.cleaning_task_results
          set completed_at = task.completed_at, completed_by = actor.id,
              duration_seconds = greatest(0, floor(extract(epoch from (task.completed_at - task.started_at)))),
              total_cost = round(greatest(0, floor(extract(epoch from (task.completed_at - task.started_at)))) * hourly_rate / 3600, 2)
          where task_id = task.id;
        if not found then
          raise exception 'Falta o registo de início desta limpeza.' using errcode = '22023';
        end if;
      end if;
    end if;
  else
    raise exception 'Ação inválida.' using errcode = '22023';
  end if;
  result := jsonb_build_object('task', jsonb_build_object(
    'id', task.id, 'status', task.status, 'assigned_to', task.assigned_to,
    'started_at', task.started_at, 'completed_at', task.completed_at
  ));
  if p_action = 'tick' then result := result || jsonb_build_object('item', to_jsonb(item)); end if;
  return result;
end;
$$;
revoke all on function pms_internal.apply_cleaning_action(uuid,text,uuid,boolean,uuid) from public, anon;
grant execute on function pms_internal.apply_cleaning_action(uuid,text,uuid,boolean,uuid) to authenticated;

create function public.start_cleaning_task(p_task_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select pms_internal.apply_cleaning_action(p_task_id, 'start');
$$;
create function public.check_cleaning_item(p_task_id uuid, p_item_id uuid, p_checked boolean) returns jsonb
language sql security invoker set search_path = '' as $$
  select pms_internal.apply_cleaning_action(p_task_id, 'tick', p_item_id, p_checked);
$$;
create function public.assign_cleaning_task(p_task_id uuid, p_assignee uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select pms_internal.apply_cleaning_action(p_task_id, 'assign', null, null, p_assignee);
$$;
revoke all on function public.start_cleaning_task(uuid), public.check_cleaning_item(uuid,uuid,boolean), public.assign_cleaning_task(uuid,uuid) from public, anon;
grant execute on function public.start_cleaning_task(uuid), public.check_cleaning_item(uuid,uuid,boolean), public.assign_cleaning_task(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
