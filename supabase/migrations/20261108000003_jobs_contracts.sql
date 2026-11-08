-- JOBLINK — 003 : missions, images, candidatures, contrats, historique

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null check (char_length(title) between 8 and 120),
  description text not null check (char_length(description) between 30 and 5000),
  skills_required text[] not null default '{}' check (cardinality(skills_required) <= 15),
  budget_amount bigint not null check (budget_amount between 500 and 100000000),
  currency char(3) not null default 'XOF' check (currency = 'XOF'),
  pay_type public.pay_type not null default 'fixed',
  allow_price_proposal boolean not null default false,
  start_date date not null,
  deadline date not null,
  country_code char(2) not null default 'BJ',
  city text not null check (char_length(city) between 2 and 120),
  neighborhood text not null check (char_length(neighborhood) between 2 and 120),
  address text check (address is null or char_length(address) <= 300), -- privée
  location extensions.geography(Point, 4326),                             -- privée (exacte)
  public_location extensions.geography(Point, 4326)
    generated always as (public.approx_point(location)) stored,           -- exposée (~1 km)
  work_mode public.work_mode not null default 'on_site',
  workers_needed smallint not null default 1 check (workers_needed between 1 and 50),
  status public.job_status not null default 'published',
  published_at timestamptz,
  assigned_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  archived_at timestamptz,
  is_hidden boolean not null default false, -- modération admin
  moderation_note text,
  applications_count integer not null default 0,
  search tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(city, '') || ' ' || coalesce(neighborhood, '')), 'C')
  ) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline >= start_date),
  check (status = 'draft' or work_mode = 'remote' or location is not null)
);
create index if not exists jobs_status_idx on public.jobs (status, created_at desc) where deleted_at is null;
create index if not exists jobs_client_idx on public.jobs (client_id, created_at desc);
create index if not exists jobs_category_idx on public.jobs (category_id);
create index if not exists jobs_city_idx on public.jobs (lower(city));
create index if not exists jobs_search_idx on public.jobs using gin (search);
create index if not exists jobs_public_location_gix on public.jobs using gist (public_location);
create index if not exists jobs_location_gix on public.jobs using gist (location);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table if not exists public.job_images (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists job_images_job_idx on public.job_images (job_id, sort_order);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  cover_letter text not null check (char_length(cover_letter) between 20 and 3000),
  proposed_amount bigint check (proposed_amount is null or proposed_amount between 500 and 100000000),
  status public.application_status not null default 'pending',
  decision_note text,
  decided_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id) -- un travailleur ne candidate qu'une fois
);
create index if not exists applications_worker_idx on public.applications (worker_id, created_at desc);
create index if not exists applications_job_idx on public.applications (job_id, status);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete restrict,
  application_id uuid not null unique references public.applications (id) on delete restrict,
  client_id uuid not null references public.profiles (id) on delete restrict,
  worker_id uuid not null references public.profiles (id) on delete restrict,
  agreed_amount bigint not null check (agreed_amount > 0),
  currency char(3) not null default 'XOF',
  status public.contract_status not null default 'pending_acceptance',
  accepted_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completion_note text check (completion_note is null or char_length(completion_note) <= 2000),
  proof_paths text[] not null default '{}' check (cardinality(proof_paths) <= 6),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id),
  check (client_id <> worker_id)
);
create index if not exists contracts_client_idx on public.contracts (client_id, status);
create index if not exists contracts_worker_idx on public.contracts (worker_id, status);
create index if not exists contracts_job_idx on public.contracts (job_id);
create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

-- Historique des événements de chaque mission (journal append-only)
create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists contract_events_job_idx on public.contract_events (job_id, created_at);

-- Vue publique des missions : jamais d'adresse ni de coordonnées exactes
create or replace view public.public_jobs
with (security_barrier = true)
as
select
  j.id, j.client_id, j.category_id, c.slug as category_slug, c.name as category_name, c.icon as category_icon,
  j.title, j.description, j.skills_required, j.budget_amount, j.currency, j.pay_type,
  j.allow_price_proposal, j.start_date, j.deadline, j.country_code, j.city, j.neighborhood,
  j.work_mode, j.workers_needed, j.status, j.published_at, j.applications_count, j.created_at,
  extensions.st_y(j.public_location::extensions.geometry) as approx_lat,
  extensions.st_x(j.public_location::extensions.geometry) as approx_lng,
  (select ji.storage_path from public.job_images ji where ji.job_id = j.id order by ji.sort_order limit 1) as cover_image
from public.jobs j
join public.categories c on c.id = j.category_id
where j.deleted_at is null
  and not j.is_hidden
  and j.status in ('published', 'reviewing', 'assigned', 'in_progress', 'completed');
