// Run with: PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/test-cleaning-lifecycle.mjs
// Uses an isolated PostgreSQL engine. Never reads credentials or production data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const ids = { admin: '00000000-0000-4000-8000-000000000001', chief: '00000000-0000-4000-8000-000000000002', worker: '00000000-0000-4000-8000-000000000003', other: '00000000-0000-4000-8000-000000000004', inactive: '00000000-0000-4000-8000-000000000005', task: '00000000-0000-4000-8000-000000000010', empty: '00000000-0000-4000-8000-000000000011', item1: '00000000-0000-4000-8000-000000000020', item2: '00000000-0000-4000-8000-000000000021' };
let checks = 0;
async function as(user) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec('set role authenticated');
}
async function owner() { await db.exec('reset role'); }
async function row(query) { return (await db.query(query)).rows[0]; }
async function rejects(query, pattern) { await assert.rejects(db.query(query), pattern); checks++; }
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon;
create table staff(id uuid primary key, name text, permissions text[], active boolean, hourly_rate numeric);
create function is_active_staff() returns boolean language sql stable set search_path='' as $$ select exists(select 1 from public.staff where id=auth.uid() and active) $$;
create table bookings(id uuid primary key default gen_random_uuid(),room_id uuid,check_out date,status text);
create table cleaning_checklist_template(id uuid primary key default gen_random_uuid(),zone text,label text,position integer,is_active boolean default true);
create table cleaning_tasks(id uuid primary key default gen_random_uuid(), room_id uuid, booking_id uuid, task_date date, source text default 'manual', status text default 'pendente', assigned_to uuid references staff, notes text, started_at timestamptz, completed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create unique index cleaning_checkout_booking on cleaning_tasks(booking_id) where source='checkout';
create table cleaning_task_items(id uuid primary key default gen_random_uuid(), task_id uuid references cleaning_tasks on delete cascade, zone text, label text, position integer, checked boolean default false, checked_by uuid references staff, checked_at timestamptz, created_at timestamptz default now());
alter table cleaning_tasks enable row level security; alter table cleaning_task_items enable row level security;
create policy legacy_all on cleaning_tasks for all to authenticated using(true) with check(true);
create policy legacy_all on cleaning_task_items for all to authenticated using(true) with check(true);
grant all on staff, cleaning_tasks, cleaning_task_items to authenticated;
grant all on bookings to authenticated;
insert into staff values
('${ids.admin}','Admin',array['equipas'],true,30),
('${ids.chief}','Chefia',array['gerir_limpeza'],true,20),
('${ids.worker}','Operador',array['limpeza'],true,18),
('${ids.other}','Outro',array['limpeza'],true,15),
('${ids.inactive}','Inativo',array['limpeza'],false,15);
insert into cleaning_tasks(id,task_date) values ('${ids.task}','2026-10-17'),('${ids.empty}','2026-10-17');
insert into cleaning_task_items(id, task_id, zone, label, position) values
('${ids.item1}','${ids.task}','Quarto','Cama',1),('${ids.item2}','${ids.task}','Quarto','Chão',2);
`);
await db.exec(await readFile(new URL('./fixtures/cleaning-legacy-triggers.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261017002936_cleaning_task_lifecycle.sql', import.meta.url), 'utf8'));
await as(ids.admin);
await rejects(`select start_cleaning_task('${ids.task}')`, /responsável/);
await db.query(`select assign_cleaning_task('${ids.empty}', '${ids.worker}')`);
await rejects(`select start_cleaning_task('${ids.empty}')`, /checklist/);
await rejects(`select assign_cleaning_task('${ids.task}', '${ids.inactive}')`, /ativo/);
await as(ids.chief);
await db.query(`select assign_cleaning_task('${ids.task}', '${ids.worker}')`);
await as(ids.worker);
await rejects(`select assign_cleaning_task('${ids.task}', '${ids.other}')`, /chefia/);
await rejects(`select check_cleaning_item('${ids.task}', '${ids.item1}', true)`, /Inicia/);
const started = (await row(`select start_cleaning_task('${ids.task}') as value`)).value.task;
assert.equal(started.status,'em_curso'); checks++;
assert.equal((await row(`select start_cleaning_task('${ids.task}') as value`)).value.task.started_at, started.started_at); checks++;
await rejects(`update cleaning_tasks set status = 'concluida' where id = '${ids.task}'`, /permission denied/);
await rejects(`update cleaning_task_items set checked = true where id = '${ids.item1}'`, /permission denied/);
assert.equal((await db.query('select * from cleaning_task_results')).rows.length, 0); checks++;
await as(ids.other);
assert.equal((await db.query(`select * from cleaning_tasks where id='${ids.task}'`)).rows.length,0); checks++;
await rejects(`select check_cleaning_item('${ids.task}', '${ids.item1}', true)`, /acesso/);
await as(ids.admin);
await rejects(`select assign_cleaning_task('${ids.task}', '${ids.other}')`, /iniciada/);
await owner();
// Simulate sixty-one elapsed seconds and a later salary change.
await db.exec(`update cleaning_tasks set started_at=clock_timestamp()-interval '61 seconds' where id='${ids.task}'; update cleaning_task_results set started_at=(select started_at from cleaning_tasks where id='${ids.task}'); update staff set hourly_rate=90 where id='${ids.worker}';`);
await as(ids.worker);
const first=(await row(`select check_cleaning_item('${ids.task}', '${ids.item1}', true) as value`)).value;
assert.equal(first.task.status,'em_curso'); assert.equal(first.item.checked_by,ids.worker); checks++;
await db.query(`select check_cleaning_item('${ids.task}', '${ids.item1}', false)`);
assert.equal((await row(`select checked_by from cleaning_task_items where id='${ids.item1}'`)).checked_by,null); checks++;
await db.query(`select check_cleaning_item('${ids.task}', '${ids.item1}', true)`);
await owner();
await db.exec(`create function reject_test_result() returns trigger language plpgsql as $$ begin raise exception 'Test persistence failure'; end $$; create trigger reject_test_result before update on cleaning_task_results for each row execute function reject_test_result();`);
await as(ids.worker);
await rejects(`select check_cleaning_item('${ids.task}', '${ids.item2}', true)`, /Test persistence failure/);
assert.equal((await row(`select checked from cleaning_task_items where id='${ids.item2}'`)).checked,false);
assert.equal((await row(`select status from cleaning_tasks where id='${ids.task}'`)).status,'em_curso'); checks++;
await owner(); await db.exec('drop trigger reject_test_result on cleaning_task_results');
await as(ids.worker);
const last=(await row(`select check_cleaning_item('${ids.task}', '${ids.item2}', true) as value`)).value;
assert.equal(last.task.status,'concluida'); assert.ok(last.task.completed_at); checks++;
const replay=(await row(`select check_cleaning_item('${ids.task}', '${ids.item2}', true) as value`)).value;
assert.equal(replay.task.completed_at,last.task.completed_at); checks++;
await rejects(`select check_cleaning_item('${ids.task}', '${ids.item1}', false)`, /histórico/);
await rejects(`select start_cleaning_task('${ids.task}')`, /concluída/);
await as(ids.admin);
const result=await row(`select * from cleaning_task_results where task_id='${ids.task}'`);
assert.equal(Number(result.hourly_rate),18); assert.equal(result.completed_by,ids.worker);
assert.equal(Number(result.total_cost),Math.round(Number(result.duration_seconds)*18/3600*100)/100); checks++;
assert.equal((await db.query(`delete from cleaning_tasks where id='${ids.task}' returning id`)).rows.length,0); checks++;
await as(ids.inactive); await rejects(`select start_cleaning_task('${ids.task}')`, /ativo/);
await as(null); await rejects(`select start_cleaning_task('${ids.task}')`, /Sessão/);
await owner(); await db.exec('set role anon'); await rejects(`select start_cleaning_task('${ids.task}')`, /permission denied/);

// Checkout writes use the real legacy triggers plus the replacement integration.
await owner();
await db.exec(`insert into cleaning_checklist_template(zone,label,position) values('Quarto','Teste checkout',1);`);
await as(ids.admin);
const booking = (await row("insert into bookings(room_id,check_out,status) values(gen_random_uuid(),'2026-10-18','confirmada') returning id")).id;
const checkout = await row(`select * from cleaning_tasks where booking_id='${booking}'`);
assert.equal(checkout.source, 'checkout');
assert.equal((await db.query(`select * from cleaning_task_items where task_id='${checkout.id}'`)).rows.length, 1); checks++;
await db.query(`update bookings set check_out='2026-10-19' where id='${booking}'`);
assert.equal((await db.query(`select * from cleaning_tasks where booking_id='${booking}'`)).rows.length, 1);
assert.equal(String((await row(`select task_date::text as date from cleaning_tasks where id='${checkout.id}'`)).date),'2026-10-19'); checks++;
await db.query(`select assign_cleaning_task('${checkout.id}','${ids.worker}')`);
await db.query(`select start_cleaning_task('${checkout.id}')`);
await db.query(`update bookings set status='cancelada' where id='${booking}'`);
assert.equal((await row(`select status from cleaning_tasks where id='${checkout.id}'`)).status,'em_curso'); checks++;
const checkoutItem=(await row(`select id from cleaning_task_items where task_id='${checkout.id}'`)).id;
await db.query(`select check_cleaning_item('${checkout.id}','${checkoutItem}',true)`);
await db.query(`update bookings set status='confirmada',check_out='2026-10-20' where id='${booking}'`);
assert.equal((await row(`select task_date::text as date from cleaning_tasks where id='${checkout.id}'`)).date,'2026-10-19');
assert.equal((await row(`select status from cleaning_tasks where id='${checkout.id}'`)).status,'concluida'); checks++;
const cancelled=(await row("insert into bookings(room_id,check_out,status) values(gen_random_uuid(),'2026-10-20','confirmada') returning id")).id;
await db.query(`update bookings set status='cancelada' where id='${cancelled}'`);
assert.equal((await db.query(`select * from cleaning_tasks where booking_id='${cancelled}'`)).rows.length,0); checks++;
console.log(`${checks} lifecycle checks passed: assignment, permissions, explicit start, replay, rollback, automatic completion, historical cost and protected results.`);
await db.close();
