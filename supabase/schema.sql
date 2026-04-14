-- EczemaTrack schema
-- Run this in Supabase Dashboard → SQL Editor.
-- Also create a private Storage bucket named "photos" after running this.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age_range text,
  sex text,
  region text,
  climate_zone text,
  skin_type smallint check (skin_type between 1 and 6),
  known_triggers text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_logs
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null default current_date,
  itch_level smallint check (itch_level between 0 and 10),
  stress_level smallint check (stress_level between 0 and 10),
  sleep_hours numeric(4, 2) check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality smallint check (sleep_quality between 0 and 10),
  affected_areas text[] default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, log_date desc);

-- ---------------------------------------------------------------------------
-- food_entries
-- ---------------------------------------------------------------------------
create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.daily_logs (id) on delete cascade,
  food_name text not null,
  category text,
  notes text
);

create index if not exists food_entries_log_idx
  on public.food_entries (log_id);

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.daily_logs (id) on delete cascade,
  storage_path text not null,
  body_area text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists photos_log_idx
  on public.photos (log_id);

-- ---------------------------------------------------------------------------
-- ai_analyses
-- ---------------------------------------------------------------------------
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  analysis_type text not null,
  input_summary jsonb,
  result text,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_analyses_user_idx
  on public.ai_analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Auto-create profile on new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.daily_logs    enable row level security;
alter table public.food_entries  enable row level security;
alter table public.photos        enable row level security;
alter table public.ai_analyses   enable row level security;

-- profiles: owner-only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- daily_logs: owner-only
drop policy if exists "daily_logs_select_own" on public.daily_logs;
create policy "daily_logs_select_own" on public.daily_logs
  for select using (auth.uid() = user_id);

drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own" on public.daily_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own" on public.daily_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_logs_delete_own" on public.daily_logs;
create policy "daily_logs_delete_own" on public.daily_logs
  for delete using (auth.uid() = user_id);

-- food_entries: owner via parent daily_log
drop policy if exists "food_entries_select_own" on public.food_entries;
create policy "food_entries_select_own" on public.food_entries
  for select using (
    exists (
      select 1 from public.daily_logs l
      where l.id = food_entries.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "food_entries_insert_own" on public.food_entries;
create policy "food_entries_insert_own" on public.food_entries
  for insert with check (
    exists (
      select 1 from public.daily_logs l
      where l.id = food_entries.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "food_entries_update_own" on public.food_entries;
create policy "food_entries_update_own" on public.food_entries
  for update using (
    exists (
      select 1 from public.daily_logs l
      where l.id = food_entries.log_id and l.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.daily_logs l
      where l.id = food_entries.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "food_entries_delete_own" on public.food_entries;
create policy "food_entries_delete_own" on public.food_entries
  for delete using (
    exists (
      select 1 from public.daily_logs l
      where l.id = food_entries.log_id and l.user_id = auth.uid()
    )
  );

-- photos: owner via parent daily_log
drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own" on public.photos
  for select using (
    exists (
      select 1 from public.daily_logs l
      where l.id = photos.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own" on public.photos
  for insert with check (
    exists (
      select 1 from public.daily_logs l
      where l.id = photos.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "photos_update_own" on public.photos;
create policy "photos_update_own" on public.photos
  for update using (
    exists (
      select 1 from public.daily_logs l
      where l.id = photos.log_id and l.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.daily_logs l
      where l.id = photos.log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own" on public.photos
  for delete using (
    exists (
      select 1 from public.daily_logs l
      where l.id = photos.log_id and l.user_id = auth.uid()
    )
  );

-- ai_analyses: owner-only
drop policy if exists "ai_analyses_select_own" on public.ai_analyses;
create policy "ai_analyses_select_own" on public.ai_analyses
  for select using (auth.uid() = user_id);

drop policy if exists "ai_analyses_insert_own" on public.ai_analyses;
create policy "ai_analyses_insert_own" on public.ai_analyses
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_analyses_delete_own" on public.ai_analyses;
create policy "ai_analyses_delete_own" on public.ai_analyses
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- saved_routines
-- ---------------------------------------------------------------------------
create table if not exists public.saved_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  routine_id  text not null,
  saved_at    timestamptz not null default now(),
  unique (user_id, routine_id)
);

create index if not exists saved_routines_user_idx
  on public.saved_routines (user_id, saved_at desc);

alter table public.saved_routines enable row level security;

drop policy if exists "saved_routines_select_own" on public.saved_routines;
create policy "saved_routines_select_own" on public.saved_routines
  for select using (auth.uid() = user_id);

drop policy if exists "saved_routines_insert_own" on public.saved_routines;
create policy "saved_routines_insert_own" on public.saved_routines
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_routines_delete_own" on public.saved_routines;
create policy "saved_routines_delete_own" on public.saved_routines
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: photos bucket policies
-- Create the bucket manually (private) in Dashboard → Storage, then run these.
-- Path convention: {user_id}/{log_date}/{uuid}.jpg
-- ---------------------------------------------------------------------------
drop policy if exists "photos_storage_select_own" on storage.objects;
create policy "photos_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "photos_storage_insert_own" on storage.objects;
create policy "photos_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "photos_storage_update_own" on storage.objects;
create policy "photos_storage_update_own" on storage.objects
  for update using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "photos_storage_delete_own" on storage.objects;
create policy "photos_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
