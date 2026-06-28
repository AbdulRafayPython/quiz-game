-- ============================================================================
--  The Quiz Master Challenge — Supabase schema
--  Run in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
--  Idempotent: safe to re-run.
-- ============================================================================

-- ---------- PROFILES: one row per auth user, carries role + display name ----
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  role       text not null default 'player' check (role in ('admin','player')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile on signup; username/role come from sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'player')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- QUIZZES ---------------------------------------------------------
create table if not exists public.quizzes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rounds     int  not null default 1,
  team_count int  not null default 2,             -- how many teams this quiz is designed for (2–10)
  timer      int  not null default 25,            -- normal round countdown (seconds)
  timer_round_timer int not null default 10,      -- shorter countdown for the Timer round
  correct_points int not null default 1000,       -- points awarded on a correct answer
  penalty_points int not null default 500,        -- points subtracted on wrong/timeout (negative marking)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Backfill the scoring/timer columns on databases created before they existed.
alter table public.quizzes add column if not exists team_count int not null default 2;
alter table public.quizzes add column if not exists timer_round_timer int not null default 10;
alter table public.quizzes add column if not exists correct_points int not null default 1000;
alter table public.quizzes add column if not exists penalty_points int not null default 500;

-- ---------- QUESTIONS -------------------------------------------------------
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  text       text not null,
  options    jsonb not null default '[]'::jsonb,   -- array of 4 strings
  correct    int  not null default 0 check (correct between 0 and 3),
  round      int  not null default 1,
  correct_points int not null default 1000,        -- points awarded when this question is answered right
  penalty_points int not null default 500,         -- points subtracted on a wrong answer / timeout
  image_url  text,
  video_url  text,
  poster_url text,                                  -- WebP first-frame poster for fast video display
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists questions_quiz_id_idx on public.questions(quiz_id);
-- Backfill the per-question scoring columns on databases created before them.
alter table public.questions add column if not exists correct_points int not null default 1000;
alter table public.questions add column if not exists penalty_points int not null default 500;

-- ---------- GAME RESULTS (history / leaderboard) ----------------------------
create table if not exists public.game_results (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid references public.quizzes(id) on delete set null,
  quiz_name  text,
  teams      jsonb not null default '[]'::jsonb,   -- [{name, score}]
  winner     text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- quiz + question count, used by the View Quizzes table.
-- Dropped first: `q.*` widened when the scoring columns were added, and
-- CREATE OR REPLACE VIEW cannot reorder/rename existing view columns.
drop view if exists public.quizzes_with_counts;
create view public.quizzes_with_counts as
  select q.*, coalesce(c.cnt, 0)::int as question_count
  from public.quizzes q
  left join (select quiz_id, count(*) cnt from public.questions group by quiz_id) c
    on c.quiz_id = q.id;

-- ============================ ROW-LEVEL SECURITY ============================
alter table public.profiles     enable row level security;
alter table public.quizzes      enable row level security;
alter table public.questions    enable row level security;
alter table public.game_results enable row level security;

-- profiles: read own (admins read all), update own
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- quizzes / questions: any authenticated user may read (to play); only admins write
drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes for select to authenticated using (true);
drop policy if exists quizzes_write on public.quizzes;
create policy quizzes_write on public.quizzes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions for select to authenticated using (true);
drop policy if exists questions_write on public.questions;
create policy questions_write on public.questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- game results: authenticated may read (leaderboard) + insert their own
drop policy if exists results_select on public.game_results;
create policy results_select on public.game_results for select to authenticated using (true);
drop policy if exists results_insert on public.game_results;
create policy results_insert on public.game_results for insert to authenticated
  with check (created_by = auth.uid() or created_by is null);

-- ============================ STORAGE (quiz media) ==========================
insert into storage.buckets (id, name, public)
  values ('quiz-media', 'quiz-media', true) on conflict (id) do nothing;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'quiz-media');
drop policy if exists media_write on storage.objects;
create policy media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'quiz-media' and public.is_admin());
drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'quiz-media' and public.is_admin());
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'quiz-media' and public.is_admin());

-- ============================================================================
--  AFTER you sign up once through the app's ADMIN login, promote yourself:
--    update public.profiles set role='admin'
--    where id = (select id from auth.users where email = 'admin@quizmaster.local');
--  (The app maps a plain "Username" to "<username>@quizmaster.local".)
-- ============================================================================
