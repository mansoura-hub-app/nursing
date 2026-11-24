-- Nursing stage 4: قاموس + تشيك ليست مهارات + تنقلات + سجل تدريب + حالات (شغّله بعد v4)
create table public.glossary (
  id bigint generated always as identity primary key,
  en text not null check (length(en) <= 120), ar text not null check (length(ar) <= 240),
  course text, created_by uuid references public.profiles(id) on delete set null
);
create table public.checklists (
  id bigint generated always as identity primary key,
  title text not null check (length(title) <= 120), course text,
  steps text not null check (length(steps) <= 6000),
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz default now()
);
create table public.rotations (
  id bigint generated always as identity primary key,
  name text not null check (length(name) <= 120), place text check (length(place) <= 120),
  year text, grp text, start_date date, end_date date, notes text check (length(notes) <= 500),
  created_by uuid references public.profiles(id) on delete set null
);
create table public.cases (
  id bigint generated always as identity primary key,
  title text not null check (length(title) <= 120), course text,
  scenario text not null check (length(scenario) <= 4000), questions text check (length(questions) <= 3000),
  answer text check (length(answer) <= 4000),
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz default now()
);
create table public.training_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date, hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  dept text check (length(dept) <= 60), note text check (length(note) <= 80),
  created_at timestamptz default now()
);
create index on public.training_log (user_id);
create index on public.glossary (course);

alter table public.glossary enable row level security;
alter table public.checklists enable row level security;
alter table public.rotations enable row level security;
alter table public.cases enable row level security;
alter table public.training_log enable row level security;

create policy "gl read" on public.glossary for select to authenticated using (true);
create policy "gl staff" on public.glossary for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "ck read" on public.checklists for select to authenticated using (true);
create policy "ck staff" on public.checklists for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "ro read" on public.rotations for select to authenticated using (true);
create policy "ro staff" on public.rotations for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "ca read" on public.cases for select to authenticated using (true);
create policy "ca staff" on public.cases for all to authenticated using (public.is_staff()) with check (public.is_staff());
-- سجل التدريب: خاص بصاحبه فقط (حتى المشرف مش بيشوفه)
create policy "tl own select" on public.training_log for select to authenticated using (user_id = auth.uid());
create policy "tl own insert" on public.training_log for insert to authenticated with check (user_id = auth.uid());
create policy "tl own delete" on public.training_log for delete to authenticated using (user_id = auth.uid());

insert into public.glossary (en, ar, course) values
('Anterior','أمامي','تشريح'),('Posterior','خلفي','تشريح'),('Superior','علوي','تشريح'),('Inferior','سفلي','تشريح'),
('Medial','وسطي (ناحية خط المنتصف)','تشريح'),('Lateral','جانبي','تشريح'),('Proximal','قريب من الجذع','تشريح'),('Distal','بعيد عن الجذع','تشريح'),
('Superficial','سطحي','تشريح'),('Deep','عميق','تشريح'),('Supine','مستلقي على الظهر','تمريض أساسي'),('Prone','مستلقي على البطن','تمريض أساسي'),
('Fowler''s position','وضع نصف جلوس','تمريض أساسي'),('Tachycardia','سرعة ضربات القلب','علامات حيوية'),('Bradycardia','بطء ضربات القلب','علامات حيوية'),
('Tachypnea','سرعة التنفس','علامات حيوية'),('Bradypnea','بطء التنفس','علامات حيوية'),('Dyspnea','ضيق التنفس','علامات حيوية'),
('Hypertension','ارتفاع ضغط الدم','علامات حيوية'),('Hypotension','انخفاض ضغط الدم','علامات حيوية'),('Hyperthermia','ارتفاع درجة الحرارة','علامات حيوية'),
('Hypothermia','انخفاض درجة الحرارة','علامات حيوية'),('Afebrile','بدون حرارة','علامات حيوية'),('Edema','وذمة (تورم)','عام'),
('Cyanosis','زرقان','عام'),('Pallor','شحوب','عام'),('Jaundice','يرقان','عام'),('Nausea','غثيان','عام'),('Emesis','قيء','عام'),
('Diarrhea','إسهال','عام'),('Constipation','إمساك','عام'),('Dysphagia','صعوبة البلع','عام'),('Dysuria','ألم أو حرقان عند التبول','عام'),
('Hematuria','دم في البول','عام'),('Oliguria','قلة البول','عام'),('Anuria','انعدام البول','عام'),('Asepsis','تعقيم (منع التلوث)','مكافحة العدوى'),
('Sterile','معقم','مكافحة العدوى'),('Contamination','تلوث','مكافحة العدوى'),('Nosocomial infection','عدوى المستشفيات','مكافحة العدوى'),
('Subcutaneous','تحت الجلد','حقن'),('Intramuscular','داخل العضل','حقن'),('Intravenous','داخل الوريد','حقن'),('Oral','بالفم','أدوية'),
('Allergy','حساسية','أدوية'),('Contraindication','مانع استعمال','أدوية'),('Side effect','عرض جانبي','أدوية'),('Prognosis','توقع سير المرض','عام'),
('Diagnosis','تشخيص','عام'),('Acute','حاد','عام'),('Chronic','مزمن','عام'),('Admission','دخول المستشفى','عام'),('Discharge','خروج من المستشفى','عام');

insert into public.checklists (title, course, steps) values
('غسل الأيدي: 5 لحظات (منظمة الصحة العالمية)', 'مكافحة العدوى', E'قبل لمس المريض\nقبل أي إجراء نظيف أو معقم\nبعد التعرض لسوائل الجسم\nبعد لمس المريض\nبعد لمس محيط المريض'),
('قياس العلامات الحيوية (تدريب)', 'تمريض أساسي', E'اغسل إيدك وجهّز الأدوات\nعرّف بنفسك واشرح للمريض\nخلّي المريض مرتاح وهادي\nقيس النبض (عدّ لدقيقة كاملة)\nقيس التنفس من غير ما يحس\nقيس الحرارة\nقيس الضغط بالحجم المناسب للكُف\nسجّل القراءات بوقتها\nبلّغ المسؤول عن أي قراءة غير طبيعية\nاغسل إيدك');
