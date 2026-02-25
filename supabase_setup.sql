
-- OIR SETS
create table if not exists public.oir_sets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  time_limit_seconds integer default 1200, -- Default 20 mins
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- OIR QUESTIONS
create table if not exists public.oir_questions (
  id uuid default gen_random_uuid() primary key,
  set_id uuid references public.oir_sets(id) on delete cascade,
  question_text text,
  image_url text,
  options jsonb not null, -- Array of strings
  correct_index integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- OIR DOUBTS (Social Feature)
create table if not exists public.oir_doubts (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.oir_questions(id) on delete cascade,
  user_id uuid, -- Link to aspirant
  user_name text,
  comment text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Simplified for demo)
alter table public.oir_sets enable row level security;
create policy "Public read sets" on public.oir_sets for select using (true);
create policy "Admin insert sets" on public.oir_sets for insert with check (true); -- Ideally check for admin role
create policy "Admin delete sets" on public.oir_sets for delete using (true);

alter table public.oir_questions enable row level security;
create policy "Public read questions" on public.oir_questions for select using (true);
create policy "Admin insert questions" on public.oir_questions for insert with check (true);
create policy "Admin delete questions" on public.oir_questions for delete using (true);

alter table public.oir_doubts enable row level security;
create policy "Public read doubts" on public.oir_doubts for select using (true);
create policy "Public insert doubts" on public.oir_doubts for insert with check (true);

-- PSYCHOLOGY ASSESSMENTS
create table if not exists public.psychology_assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  test_type text not null,
  feedback jsonb not null,
  original_data jsonb,
  status text default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TEST HISTORY
create table if not exists public.test_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  test_type text not null,
  score float default 0,
  result_data jsonb,
  original_data jsonb,
  status text default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.psychology_assessments enable row level security;
create policy "Users can read their own assessments" on public.psychology_assessments for select using (auth.uid() = user_id);
create policy "Users can insert their own assessments" on public.psychology_assessments for insert with check (auth.uid() = user_id);

alter table public.test_history enable row level security;
create policy "Users can read their own history" on public.test_history for select using (auth.uid() = user_id);
create policy "Users can insert their own history" on public.test_history for insert with check (auth.uid() = user_id);
create policy "Users can update their own history" on public.test_history for update using (auth.uid() = user_id);
