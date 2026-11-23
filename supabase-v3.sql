-- Nursing stage 2 (شغّله مرة واحدة بعد supabase-v2.sql)
alter table public.profiles add column if not exists year text;
alter table public.profiles add column if not exists grp text;
alter table public.courses add column if not exists year text;
alter table public.questions add column if not exists explain text;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
grant execute on function public.my_role() to authenticated;
-- الطالب يغيّر فرقته ومجموعته بس، مش دوره
create policy "profiles update own cohort" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

create table public.announcements (
  id bigint generated always as identity primary key,
  title text not null, body text, pinned boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create table public.topics (
  id bigint generated always as identity primary key,
  course text not null, title text not null, ord int default 0,
  created_at timestamptz default now()
);
create table public.topic_done (
  topic_id bigint not null references public.topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (topic_id, user_id)
);
create table public.wrong_questions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  primary key (user_id, question_id)
);
create index on public.topics (course);

alter table public.announcements enable row level security;
alter table public.topics enable row level security;
alter table public.topic_done enable row level security;
alter table public.wrong_questions enable row level security;

create policy "ann read" on public.announcements for select to authenticated using (true);
create policy "ann staff" on public.announcements for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "topics read" on public.topics for select to authenticated using (true);
create policy "topics staff" on public.topics for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "topic_done read own or staff" on public.topic_done for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "topic_done add own" on public.topic_done for insert to authenticated with check (user_id = auth.uid());
create policy "topic_done del own" on public.topic_done for delete to authenticated using (user_id = auth.uid());
-- بنك الأخطاء خاص بالطالب بس (حتى المشرف مايشوفوش)
create policy "wrong own" on public.wrong_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
