-- ============================================================
-- TRAINER APP - SUPABASE SETUP
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- 1. TABLES (safe to re-run - uses IF NOT EXISTS)
-- ============================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_of_birth date,
  phone text,
  primary_goal text,
  secondary_goal text,
  limitations text,
  movements_to_avoid text,
  movements_to_include_carefully text,
  trainer_notes text,
  favorite_exercises text,
  exercises_to_avoid text,
  created_at timestamptz default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment_type text,
  main_muscle_group text,
  secondary_muscle_group text,
  movement_type text,
  difficulty text,
  notes text,
  avoid_if text,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  session_date date not null,
  focus text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
  rep_range text not null,
  weight numeric,
  effort text,
  form text,
  pain text,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid references public.session_exercises(id) on delete cascade,
  set_number integer,
  reps integer,
  weight numeric,
  created_at timestamptz default now()
);

-- 2. ROW LEVEL SECURITY
-- ============================================================
-- We enable RLS but add a permissive policy so the anon key
-- can read/write. This is safe for a trainer-only app with no
-- sensitive multi-user data. Add auth policies when you add login.

alter table public.clients enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_sets enable row level security;

-- Drop existing policies before creating to avoid conflicts
drop policy if exists "allow_all_clients" on public.clients;
drop policy if exists "allow_all_exercises" on public.exercises;
drop policy if exists "allow_all_sessions" on public.sessions;
drop policy if exists "allow_all_session_exercises" on public.session_exercises;
drop policy if exists "allow_all_exercise_sets" on public.exercise_sets;

create policy "allow_all_clients" on public.clients for all using (true) with check (true);
create policy "allow_all_exercises" on public.exercises for all using (true) with check (true);
create policy "allow_all_sessions" on public.sessions for all using (true) with check (true);
create policy "allow_all_session_exercises" on public.session_exercises for all using (true) with check (true);
create policy "allow_all_exercise_sets" on public.exercise_sets for all using (true) with check (true);

-- 3. SEED DATA - EXERCISES
-- ============================================================

insert into public.exercises (name, equipment_type, main_muscle_group, movement_type, difficulty) values
  ('Leg Press',        'Machine',    'Quadriceps',   'Squat',     'Beginner'),
  ('Leg Curl',         'Machine',    'Hamstrings',   'Isolation', 'Beginner'),
  ('Leg Extension',    'Machine',    'Quadriceps',   'Isolation', 'Beginner'),
  ('Glute Press',      'Machine',    'Glutes',       'Hinge',     'Beginner'),
  ('Romanian Deadlift','Dumbbell',   'Hamstrings',   'Hinge',     'Intermediate'),
  ('Walking Lunge',    'Dumbbell',   'Quadriceps',   'Lunge',     'Intermediate'),
  ('Chest Press',      'Machine',    'Chest',        'Push',      'Beginner'),
  ('Shoulder Press',   'Dumbbell',   'Shoulders',    'Push',      'Intermediate'),
  ('Lat Pulldown',     'Cable',      'Back',         'Pull',      'Beginner'),
  ('Seated Row',       'Cable',      'Back',         'Pull',      'Beginner'),
  ('Biceps Curl',      'Dumbbell',   'Biceps',       'Isolation', 'Beginner'),
  ('Triceps Pressdown','Cable',      'Triceps',      'Isolation', 'Beginner'),
  ('Cable Row',        'Cable',      'Back',         'Pull',      'Beginner'),
  ('Plank',            'Bodyweight', 'Core',         'Core',      'Beginner'),
  ('Dead Bug',         'Bodyweight', 'Core',         'Core',      'Beginner')
on conflict do nothing;

-- 4. SEED DATA - CLIENTS
-- ============================================================

insert into public.clients (id, name, primary_goal, secondary_goal, limitations, trainer_notes) values
  ('a1000000-0000-0000-0000-000000000001', 'Ann Marie', 'Athletic performance', 'Lower body strength', 'No major limitations', 'Half marathon support. Train 2x per week.'),
  ('a1000000-0000-0000-0000-000000000002', 'Katie',     'Injury prevention',    'Mobility',            'Knee sensitivity and tight shoulders', 'Prioritize controlled movements.'),
  ('a1000000-0000-0000-0000-000000000003', 'Stephanie', 'Muscle tone',          'Strength',            'No major limitations', 'Prefers clear structure.')
on conflict (id) do nothing;

-- 5. SEED DATA - ANN MARIE LEG PRESS HISTORY
-- ============================================================

do $$
declare
  ann_id uuid := 'a1000000-0000-0000-0000-000000000001';
  leg_press_id uuid;
  sess_id uuid;
  se_id uuid;
begin
  select id into leg_press_id from public.exercises where name = 'Leg Press' limit 1;

  -- Session 1: May 29 (140 lbs, 6,6,6)
  insert into public.sessions (id, client_id, session_date) values ('b1000000-0000-0000-0000-000000000001', ann_id, '2026-05-29') on conflict do nothing;
  insert into public.session_exercises (id, session_id, client_id, exercise_id, rep_range, weight, effort, form, pain)
    values ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', ann_id, leg_press_id, '6-8', 140, 'Challenging but good', 'Good', 'No pain') on conflict do nothing;
  insert into public.exercise_sets (session_exercise_id, set_number, reps, weight) values
    ('c1000000-0000-0000-0000-000000000001', 1, 6, 140),
    ('c1000000-0000-0000-0000-000000000001', 2, 6, 140),
    ('c1000000-0000-0000-0000-000000000001', 3, 6, 140);

  -- Session 2: Jun 5 (145 lbs, 7,7,7)
  insert into public.sessions (id, client_id, session_date) values ('b1000000-0000-0000-0000-000000000002', ann_id, '2026-06-05') on conflict do nothing;
  insert into public.session_exercises (id, session_id, client_id, exercise_id, rep_range, weight, effort, form, pain)
    values ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', ann_id, leg_press_id, '6-8', 145, 'Challenging but good', 'Good', 'No pain') on conflict do nothing;
  insert into public.exercise_sets (session_exercise_id, set_number, reps, weight) values
    ('c1000000-0000-0000-0000-000000000002', 1, 7, 145),
    ('c1000000-0000-0000-0000-000000000002', 2, 7, 145),
    ('c1000000-0000-0000-0000-000000000002', 3, 7, 145);

  -- Session 3: Jun 12 (150 lbs, 8,8,8) - triggers Increase to 160
  insert into public.sessions (id, client_id, session_date) values ('b1000000-0000-0000-0000-000000000003', ann_id, '2026-06-12') on conflict do nothing;
  insert into public.session_exercises (id, session_id, client_id, exercise_id, rep_range, weight, effort, form, pain)
    values ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', ann_id, leg_press_id, '6-8', 150, 'Challenging but good', 'Good', 'No pain') on conflict do nothing;
  insert into public.exercise_sets (session_exercise_id, set_number, reps, weight) values
    ('c1000000-0000-0000-0000-000000000003', 1, 8, 150),
    ('c1000000-0000-0000-0000-000000000003', 2, 8, 150),
    ('c1000000-0000-0000-0000-000000000003', 3, 8, 150);

  -- 8-12 range history
  insert into public.sessions (id, client_id, session_date) values ('b1000000-0000-0000-0000-000000000004', ann_id, '2026-05-27') on conflict do nothing;
  insert into public.session_exercises (id, session_id, client_id, exercise_id, rep_range, weight, effort, form, pain)
    values ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', ann_id, leg_press_id, '8-12', 110, 'Challenging but good', 'Good', 'No pain') on conflict do nothing;
  insert into public.exercise_sets (session_exercise_id, set_number, reps, weight) values
    ('c1000000-0000-0000-0000-000000000004', 1, 10, 110),
    ('c1000000-0000-0000-0000-000000000004', 2, 10, 110),
    ('c1000000-0000-0000-0000-000000000004', 3, 9, 110);

  -- 15-20 range history
  insert into public.sessions (id, client_id, session_date) values ('b1000000-0000-0000-0000-000000000005', ann_id, '2026-05-25') on conflict do nothing;
  insert into public.session_exercises (id, session_id, client_id, exercise_id, rep_range, weight, effort, form, pain)
    values ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', ann_id, leg_press_id, '15-20', 80, 'Challenging but good', 'Good', 'No pain') on conflict do nothing;
  insert into public.exercise_sets (session_exercise_id, set_number, reps, weight) values
    ('c1000000-0000-0000-0000-000000000005', 1, 18, 80),
    ('c1000000-0000-0000-0000-000000000005', 2, 17, 80),
    ('c1000000-0000-0000-0000-000000000005', 3, 16, 80);
end $$;
