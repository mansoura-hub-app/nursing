-- Nursing stage 3: كروت حفظ + امتحان تجريبي (شغّله بعد supabase-v3.sql)
create table public.decks (
  id bigint generated always as identity primary key,
  title text not null, course text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create table public.cards (
  id bigint generated always as identity primary key,
  deck_id bigint not null references public.decks(id) on delete cascade,
  front text not null, back text not null
);
create table public.card_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id bigint not null references public.cards(id) on delete cascade,
  box int not null default 0, due_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create table public.mock_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course text, score int not null, total int not null, secs int,
  created_at timestamptz default now()
);
create index on public.cards (deck_id);
create index on public.mock_results (user_id);

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.card_progress enable row level security;
alter table public.mock_results enable row level security;
create policy "decks read" on public.decks for select to authenticated using (true);
create policy "decks staff" on public.decks for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "cards read" on public.cards for select to authenticated using (true);
create policy "cards staff" on public.cards for all to authenticated using (public.is_staff()) with check (public.is_staff());
-- تقدم الحفظ والامتحانات التجريبية خاصة بالطالب بس
create policy "progress own" on public.card_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mock own read" on public.mock_results for select to authenticated using (user_id = auth.uid());
create policy "mock own add" on public.mock_results for insert to authenticated with check (user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
