-- Read-only checks to run before applying cleaning_task_lifecycle to the
-- existing remote project (its earlier migrations are not in this checkout).
select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as trigger_definition,
       p.prosecdef as security_definer, pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid in ('public.cleaning_tasks'::regclass,
                    'public.cleaning_task_items'::regclass,
                    'public.bookings'::regclass)
  and not t.tgisinternal;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('staff','cleaning_tasks','cleaning_task_items','cleaning_checklist_template');

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.staff'::regclass,
  'public.cleaning_tasks'::regclass,'public.cleaning_task_items'::regclass);

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('cleaning_tasks','cleaning_task_items')
  and grantee in ('PUBLIC','anon','authenticated')
order by table_name, grantee, column_name, privilege_type;

select status, count(*) as tasks from public.cleaning_tasks group by status;
