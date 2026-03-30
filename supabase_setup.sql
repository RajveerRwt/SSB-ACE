
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

-- PENDING ASSESSMENTS
create table if not exists public.pending_assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  test_type text not null,
  original_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.pending_assessments enable row level security;
create policy "Users can read their own pending assessments" on public.pending_assessments for select using (auth.uid() = user_id);
create policy "Users can insert their own pending assessments" on public.pending_assessments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own pending assessments" on public.pending_assessments for delete using (auth.uid() = user_id);

-- COMPLETED ASSESSMENTS
create table if not exists public.completed_assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  test_type text not null,
  score float default 0,
  result_data jsonb,
  feedback text,
  status text default 'completed', -- 'completed', 'processing', 'failed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.completed_assessments enable row level security;
create policy "Users can read their own completed assessments" on public.completed_assessments for select using (auth.uid() = user_id);
create policy "Users can insert their own completed assessments" on public.completed_assessments for insert with check (auth.uid() = user_id);

-- 14-Day Challenge Resources
create table if not exists public.challenge_resources (
    id uuid default gen_random_uuid() primary key,
    day_number integer not null,
    resource_type text not null, -- 'TAT', 'WAT', 'SRT'
    content text not null, -- URL for TAT, word for WAT, situation for SRT
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.challenge_resources enable row level security;
create policy "Public read challenge resources" on public.challenge_resources for select using (true);
create policy "Admin insert challenge resources" on public.challenge_resources for insert with check (true);
create policy "Admin delete challenge resources" on public.challenge_resources for delete using (true);

-- MENTORSHIP REGISTRATIONS
create table if not exists public.mentorship_registrations (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    whatsapp_number text not null,
    entry_type text not null,
    ssb_dates text,
    message text,
    program text not null,
    status text default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mentorship_registrations enable row level security;
create policy "Public insert mentorship registrations" on public.mentorship_registrations for insert with check (true);
create policy "Admin read mentorship registrations" on public.mentorship_registrations for select using (true);
