
-- MENTORS TABLE
create table if not exists public.mentors (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  bio text,
  specialization text,
  status text default 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Handle migration if table existed with old schema (is_approved column)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mentors' and column_name = 'is_approved') then
    -- Drop the dependent policy first
    drop policy if exists "Public read approved mentors" on public.mentors;
    
    -- Add status column if it doesn't exist
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mentors' and column_name = 'status') then
      alter table public.mentors add column status text default 'PENDING';
      -- Migrate data
      update public.mentors set status = 'APPROVED' where is_approved = true;
      update public.mentors set status = 'PENDING' where is_approved = false;
    end if;
    -- Drop old column
    alter table public.mentors drop column is_approved cascade;
  end if;
end $$;

-- BATCHES TABLE
create table if not exists public.batches (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references public.mentors(id) on delete cascade not null,
  name text not null,
  description text,
  batch_code text unique not null, -- For students to join
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BATCH MEMBERS TABLE
create table if not exists public.batch_members (
  id uuid default gen_random_uuid() primary key,
  batch_id uuid references public.batches(id) on delete cascade not null,
  user_id uuid not null, -- references aspirants.user_id
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(batch_id, user_id)
);

-- BATCH TESTS TABLE (Scheduled Tests)
create table if not exists public.batch_tests (
  id uuid default gen_random_uuid() primary key,
  batch_id uuid references public.batches(id) on delete cascade not null,
  test_type text not null, -- e.g., 'PPDT', 'TAT', 'WAT', 'SRT', 'OIR'
  test_config jsonb, -- contains set_id or custom questions
  scheduled_at timestamp with time zone not null,
  deadline timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BATCH TEST SUBMISSIONS TABLE
create table if not exists public.batch_test_submissions (
  id uuid default gen_random_uuid() primary key,
  batch_test_id uuid references public.batch_tests(id) on delete cascade not null,
  user_id uuid not null,
  response_data jsonb not null,
  score float,
  mentor_remarks text,
  status text default 'submitted', -- 'submitted', 'reviewed'
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(batch_test_id, user_id)
);

-- RLS POLICIES
alter table public.mentors enable row level security;
drop policy if exists "Public read approved mentors" on public.mentors;
drop policy if exists "Mentors can read own profile" on public.mentors;
drop policy if exists "Mentors can update own profile" on public.mentors;
drop policy if exists "Admins can manage mentors" on public.mentors;
create policy "Public read approved mentors" on public.mentors for select using (status = 'APPROVED');
create policy "Mentors can read own profile" on public.mentors for select using (auth.uid() = id);
create policy "Mentors can update own profile" on public.mentors for update using (auth.uid() = id);
create policy "Admins can manage mentors" on public.mentors for all using (
  auth.jwt() ->> 'email' in ('rajveerrawat947@gmail.com', 'admin@ssbprep.online')
);

alter table public.batches enable row level security;
drop policy if exists "Mentors can manage own batches" on public.batches;
drop policy if exists "Batch members can view batch" on public.batches;
create policy "Mentors can manage own batches" on public.batches for all using (auth.uid() = mentor_id);
create policy "Batch members can view batch" on public.batches for select using (
  exists (select 1 from public.batch_members where batch_id = public.batches.id and user_id = auth.uid())
);

alter table public.batch_members enable row level security;
drop policy if exists "Mentors can view batch members" on public.batch_members;
drop policy if exists "Users can join batches" on public.batch_members;
drop policy if exists "Users can view own memberships" on public.batch_members;
create policy "Mentors can view batch members" on public.batch_members for select using (
  exists (select 1 from public.batches where id = public.batch_members.batch_id and mentor_id = auth.uid())
);
create policy "Users can join batches" on public.batch_members for insert with check (auth.uid() = user_id);
create policy "Users can view own memberships" on public.batch_members for select using (auth.uid() = user_id);

alter table public.batch_tests enable row level security;
drop policy if exists "Mentors can manage batch tests" on public.batch_tests;
drop policy if exists "Batch members can view tests" on public.batch_tests;
create policy "Mentors can manage batch tests" on public.batch_tests for all using (
  exists (select 1 from public.batches where id = public.batch_tests.batch_id and mentor_id = auth.uid())
);
create policy "Batch members can view tests" on public.batch_tests for select using (
  exists (select 1 from public.batch_members where batch_id = public.batch_tests.batch_id and user_id = auth.uid())
);

alter table public.batch_test_submissions enable row level security;
drop policy if exists "Users can manage own submissions" on public.batch_test_submissions;
drop policy if exists "Mentors can view and update submissions" on public.batch_test_submissions;
create policy "Users can manage own submissions" on public.batch_test_submissions for all using (auth.uid() = user_id);
create policy "Mentors can view and update submissions" on public.batch_test_submissions for all using (
  exists (
    select 1 from public.batch_tests bt
    join public.batches b on bt.batch_id = b.id
    where bt.id = public.batch_test_submissions.batch_test_id and b.mentor_id = auth.uid()
  )
);
