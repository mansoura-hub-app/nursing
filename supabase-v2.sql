-- Nursing v2 (شغّله مرة واحدة بعد supabase-setup.sql)

-- خصوصية: الطالب يشوف بياناته بس. المشرفين يشوفوا الكل.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read own or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

create table public.courses (
  id bigint generated always as identity primary key,
  name text not null unique, doctor text, exam_at timestamptz, exam_info text,
  created_at timestamptz default now()
);
create table public.lectures (
  id bigint generated always as identity primary key,
  course text not null, doctor text, place text,
  dow int not null check (dow between 0 and 6),
  start_time text not null, end_time text,
  created_at timestamptz default now()
);
create table public.quizzes (
  id bigint generated always as identity primary key,
  title text not null, course text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create table public.questions (
  id bigint generated always as identity primary key,
  quiz_id bigint not null references public.quizzes(id) on delete cascade,
  q text not null, options jsonb not null, answer int not null
);
create table public.attempts (
  id bigint generated always as identity primary key,
  quiz_id bigint not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null, total int not null,
  created_at timestamptz default now()
);
create index on public.attempts (user_id);
create index on public.attempts (quiz_id);
create index on public.completions (user_id);
create index on public.questions (quiz_id);

alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

create policy "courses read" on public.courses for select to authenticated using (true);
create policy "courses staff" on public.courses for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "lectures read" on public.lectures for select to authenticated using (true);
create policy "lectures staff" on public.lectures for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "quizzes read" on public.quizzes for select to authenticated using (true);
create policy "quizzes staff" on public.quizzes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "questions read" on public.questions for select to authenticated using (true);
create policy "questions staff" on public.questions for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "attempts read own or staff" on public.attempts for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "attempts add own" on public.attempts for insert to authenticated with check (user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
