-- JOBLINK — 004 : messagerie, notifications, paiements, confiance & sécurité, audit

-- ---------------------------------------------------------------------------
-- Messagerie
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  pair_key text not null, -- least(uuid)||':'||greatest(uuid) : une conversation par paire et par mission
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists conversations_pair_job_uidx
  on public.conversations (pair_key, coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid));
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text', 'system')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  storage_path text not null,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null check (mime_type in
    ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 10485760), -- 10 Mo max
  created_at timestamptz not null default now()
);
create index if not exists message_attachments_message_idx on public.message_attachments (message_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Notifications (stockées en base, diffusées via Realtime)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text check (link is null or link ~ '^/'), -- uniquement des liens internes
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Paiements
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  payer_id uuid not null references public.profiles (id) on delete restrict,
  payee_id uuid not null references public.profiles (id) on delete restrict,
  amount bigint not null check (amount > 0),               -- montant de la mission (serveur)
  commission_rate numeric(5, 4) not null,
  commission_amount bigint not null check (commission_amount >= 0),
  provider_fee_amount bigint not null default 0 check (provider_fee_amount >= 0),
  net_amount bigint not null check (net_amount >= 0),      -- dû au travailleur
  currency char(3) not null default 'XOF',
  provider text not null,
  provider_reference text,
  checkout_url text,
  idempotency_key text not null unique,
  status public.payment_status not null default 'pending',
  failure_reason text,
  receipt_number text unique,
  paid_at timestamptz,
  refunded_at timestamptz,
  payout_status text not null default 'not_started'
    check (payout_status in ('not_started', 'pending', 'completed', 'failed')),
  payout_reference text,
  payout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (net_amount = amount - commission_amount - provider_fee_amount)
);
-- Un seul paiement actif ou réussi par contrat : empêche les doubles paiements
create unique index if not exists payments_one_active_per_contract
  on public.payments (contract_id) where status in ('pending', 'processing', 'succeeded');
create unique index if not exists payments_provider_ref_uidx
  on public.payments (provider, provider_reference) where provider_reference is not null;
create index if not exists payments_payer_idx on public.payments (payer_id, created_at desc);
create index if not exists payments_payee_idx on public.payments (payee_id, created_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Journal comptable (écritures) — append-only
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null, -- null = plateforme
  type public.transaction_type not null,
  amount bigint not null check (amount >= 0),
  currency char(3) not null default 'XOF',
  status public.transaction_status not null default 'completed',
  provider_reference text,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_payment_idx on public.transactions (payment_id);
create index if not exists transactions_user_idx on public.transactions (user_id, created_at desc);

-- Événements webhook reçus : garantit l'idempotence du traitement
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Avis, signalements, litiges, favoris, vérifications
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'fraud', 'abuse', 'inappropriate', 'safety', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id),
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  opened_by uuid not null references public.profiles (id),
  against_id uuid not null references public.profiles (id),
  reason text not null check (char_length(reason) between 5 and 200),
  details text check (details is null or char_length(details) <= 4000),
  status public.dispute_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists disputes_one_open_per_contract
  on public.disputes (contract_id) where status in ('open', 'under_review');
create trigger disputes_updated_at before update on public.disputes
  for each row execute function public.set_updated_at();

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('job', 'worker')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('cni', 'passport', 'driver_license', 'cip', 'other')),
  document_path text not null,
  note text check (note is null or char_length(note) <= 1000),
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists verification_one_pending
  on public.verification_requests (user_id) where status = 'pending';
create trigger verification_requests_updated_at before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit, limitation de débit, contact
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);
