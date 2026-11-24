-- Nursing stage 5b: نسخ الملفات + أرشيف الترم + ملاحظات خاصة + ملخصات الطلبة + مجموعات مذاكرة (شغّله بعد v6)
alter table public.materials add column if not exists term text check (length(term) <= 60);
alter table public.materials add column if not exists archived boolean not null default false;
alter table public.materials add column if not exists version int not null default 1;

create table public.material_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id bigint not null references public.materials(id) on delete cascade,
  body text not null check (length(body) <= 2000), updated_at timestamptz default now(),
  primary key (user_id, material_id)
);
create table public.summaries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course text check (length(course) <= 80), title text not null check (length(title) between 3 and 120),
  body text not null check (length(body) between 10 and 4000),
  approved boolean not null default false, created_at timestamptz default now()
);
create table public.study_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course text check (length(course) <= 80), title text not null check (length(title) between 3 and 100),
  starts_at timestamptz not null, place text check (length(place) <= 120), note text check (length(note) <= 200),
  approved boolean not null default false, created_at timestamptz default now()
);
create table public.session_members (
  session_id bigint not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (session_id, user_id)
);
create index on public.summaries (approved, created_at);
create index on public.study_sessions (approved, starts_at);
create index on public.session_members (session_id);
create index on public.materials (archived, created_at);

alter table public.material_notes enable row level security;
alter table public.summaries enable row level security;
alter table public.study_sessions enable row level security;
alter table public.session_members enable row level security;

create policy "mn own" on public.material_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "su read" on public.summaries for select to authenticated using (approved or user_id = auth.uid() or public.is_staff());
create policy "su own insert" on public.summaries for insert to authenticated with check (user_id = auth.uid() and approved = false);
create policy "su staff upd" on public.summaries for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "su del" on public.summaries for delete to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "ss read" on public.study_sessions for select to authenticated using (approved or user_id = auth.uid() or public.is_staff());
create policy "ss own insert" on public.study_sessions for insert to authenticated with check (user_id = auth.uid() and approved = false);
create policy "ss staff upd" on public.study_sessions for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "ss del" on public.study_sessions for delete to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "sm own select" on public.session_members for select to authenticated using (user_id = auth.uid());
create policy "sm own insert" on public.session_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.study_sessions s where s.id = session_id and s.approved));
create policy "sm own delete" on public.session_members for delete to authenticated using (user_id = auth.uid());

create or replace function public.session_counts() returns table(session_id bigint, n bigint)
language sql stable security definer set search_path = public as $$
  select m.session_id, count(*) from public.session_members m join public.study_sessions s on s.id = m.session_id where s.approved group by m.session_id;
$$;
revoke all on function public.session_counts() from public, anon;
grant execute on function public.session_counts() to authenticated;

grant select, insert, update, delete on public.material_notes, public.summaries, public.study_sessions, public.session_members to authenticated;
grant usage, select on all sequences in schema public to authenticated;
