create table if not exists public.tester_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  action text not null check (action in (
    'sign_in',
    'member_add',
    'member_edit',
    'member_delete',
    'contact_call',
    'contact_sms',
    'contact_whatsapp'
  )),
  record_count integer not null default 1 check (record_count between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists tester_activity_created_at_idx
  on public.tester_activity (created_at desc);
create index if not exists tester_activity_user_email_created_at_idx
  on public.tester_activity (user_email, created_at desc);

alter table public.tester_activity enable row level security;

revoke all on public.tester_activity from anon;
revoke all on public.tester_activity from authenticated;
grant select, insert on public.tester_activity to authenticated;
grant usage, select on sequence public.tester_activity_id_seq to authenticated;

drop policy if exists "Users can record their own tester activity"
  on public.tester_activity;
create policy "Users can record their own tester activity"
  on public.tester_activity
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and lower(user_email) = lower(auth.jwt() ->> 'email')
    and record_count between 1 and 500
  );

drop policy if exists "Configured admin can read tester activity"
  on public.tester_activity;
create policy "Configured admin can read tester activity"
  on public.tester_activity
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ravulasrinivas994@gmail.com');
