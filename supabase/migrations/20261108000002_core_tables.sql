-- JOBLINK — 002 : utilisateurs, rôles, profils travailleurs, référentiels, localisation, paramètres

-- ---------------------------------------------------------------------------
-- profiles : 1-1 avec auth.users. Email/téléphone privés (jamais exposés publiquement).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null,
  phone text check (phone is null or phone ~ '^\+[0-9]{8,15}$'),
  country_code char(2) not null default 'BJ',
  city text check (city is null or char_length(city) <= 120),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 120),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 2000),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  timezone text not null default 'Africa/Porto-Novo',
  notify_email boolean not null default true,
  notify_new_jobs boolean not null default true,
  is_suspended boolean not null default false,
  suspended_reason text,
  suspended_at timestamptz,
  terms_accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_phone_idx on public.profiles (phone);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles : rôle attribué côté serveur uniquement (trigger d'inscription / fonction admin)
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- Fonctions d'aide RLS (SECURITY DEFINER pour éviter la récursion RLS)
create or replace function public.has_role(r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = r);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin');
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and not p.is_suspended and p.deleted_at is null
  );
$$;

-- Rôle principal (client / worker) de l'utilisateur courant, admin prioritaire
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select ur.role from public.user_roles ur
  where ur.user_id = auth.uid()
  order by case ur.role when 'admin' then 0 when 'worker' then 1 else 2 end
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- worker_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.worker_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (headline is null or char_length(headline) <= 140),
  experience_years smallint check (experience_years is null or experience_years between 0 and 70),
  experiences text check (experiences is null or char_length(experiences) <= 4000),
  rate_min bigint check (rate_min is null or rate_min >= 0),
  rate_max bigint check (rate_max is null or rate_max >= 0),
  rate_unit public.pay_type not null default 'fixed',
  travel_radius_km smallint not null default 10 check (travel_radius_km between 1 and 200),
  availability public.availability_status not null default 'available',
  availability_notes text check (availability_notes is null or char_length(availability_notes) <= 500),
  portfolio_urls text[] not null default '{}' check (cardinality(portfolio_urls) <= 10),
  is_verified boolean not null default false,
  verified_at timestamptz,
  show_on_map boolean not null default false, -- consentement explicite pour apparaître « à proximité »
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  completed_jobs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rate_min is null or rate_max is null or rate_min <= rate_max)
);
create trigger worker_profiles_updated_at before update on public.worker_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories / skills
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  icon text not null default 'briefcase', -- nom d'icône Lucide
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table if not exists public.worker_categories (
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (worker_id, category_id)
);
create index if not exists worker_categories_category_idx on public.worker_categories (category_id);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger skills_updated_at before update on public.skills
  for each row execute function public.set_updated_at();

create table if not exists public.worker_skills (
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (worker_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- user_locations : position privée. Seule une version approximative est exposée.
-- ---------------------------------------------------------------------------
create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  location extensions.geography(Point, 4326) not null,
  approx_location extensions.geography(Point, 4326) generated always as (public.approx_point(location)) stored,
  source text not null default 'manual' check (source in ('gps', 'manual')),
  city text,
  neighborhood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_locations_approx_gix on public.user_locations using gist (approx_location);
create trigger user_locations_updated_at before update on public.user_locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- platform_settings
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]{2,80}$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

create or replace function public.setting_numeric(k text, fallback numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = k), fallback);
$$;

-- ---------------------------------------------------------------------------
-- Vue publique des profils (aucune donnée de contact, nom abrégé)
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  left(p.last_name, 1) || '.' as last_initial,
  p.avatar_url,
  p.city,
  p.neighborhood,
  p.country_code,
  p.created_at,
  (select ur.role from public.user_roles ur where ur.user_id = p.id and ur.role <> 'admin'
     order by ur.role limit 1) as account_type,
  wp.headline,
  wp.is_verified,
  wp.rating_avg,
  wp.rating_count,
  wp.completed_jobs_count,
  wp.availability,
  wp.rate_min,
  wp.rate_max,
  wp.rate_unit
from public.profiles p
left join public.worker_profiles wp on wp.user_id = p.id
where p.deleted_at is null and not p.is_suspended;
