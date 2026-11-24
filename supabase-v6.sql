-- Nursing stage 5: روابط رسمية + بلاغات + تصويت + أسئلة مع مراجعة (شغّله بعد v5)
create table public.links (
  id bigint generated always as identity primary key,
  title text not null check (length(title) <= 120), url text not null check (url ~* '^https://' and length(url) <= 500),
  category text check (length(category) <= 60), created_by uuid references public.profiles(id) on delete set null
);
create table public.issues (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'bug' check (kind in ('bug','content','idea')),
  body text not null check (length(body) between 3 and 500),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz default now()
);
create table public.polls (
  id bigint generated always as identity primary key,
  question text not null check (length(question) <= 200), options text not null check (length(options) <= 800),
  closed boolean not null default false, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz default now()
);
create table public.poll_votes (
  poll_id bigint not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice int not null check (choice between 0 and 9),
  primary key (poll_id, user_id)
);
create table public.qa (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course text check (length(course) <= 80), body text not null check (length(body) between 3 and 500),
  approved boolean not null default false, answer text check (length(answer) <= 1500),
  created_at timestamptz default now()
);
create index on public.issues (user_id);
create index on public.qa (approved, created_at);
create index on public.poll_votes (poll_id);

alter table public.links enable row level security;
alter table public.issues enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.qa enable row level security;

create policy "li read" on public.links for select to authenticated using (true);
create policy "li staff" on public.links for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "is own insert" on public.issues for insert to authenticated with check (user_id = auth.uid() and status = 'open');
create policy "is read" on public.issues for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "is staff upd" on public.issues for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "is del" on public.issues for delete to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "po read" on public.polls for select to authenticated using (true);
create policy "po staff" on public.polls for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "pv own select" on public.poll_votes for select to authenticated using (user_id = auth.uid());
create policy "pv own insert" on public.poll_votes for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.polls p where p.id = poll_id and not p.closed));
create policy "qu read" on public.qa for select to authenticated using (approved or user_id = auth.uid() or public.is_staff());
create policy "qu own insert" on public.qa for insert to authenticated with check (user_id = auth.uid() and approved = false and answer is null);
create policy "qu staff upd" on public.qa for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "qu del" on public.qa for delete to authenticated using (user_id = auth.uid() or public.is_staff());

-- نتايج التصويت: أرقام مجمّعة فقط، من غير أي هوية
create or replace function public.poll_counts(pid bigint) returns table(choice int, n bigint)
language sql stable security definer set search_path = public as $$
  select choice, count(*) from public.poll_votes where poll_id = pid group by choice;
$$;
revoke all on function public.poll_counts(bigint) from public, anon;
grant execute on function public.poll_counts(bigint) to authenticated;

grant select, insert, update, delete on public.links, public.issues, public.polls, public.poll_votes, public.qa to authenticated;
grant usage, select on all sequences in schema public to authenticated;
