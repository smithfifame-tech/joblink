-- JOBLINK — 001 : extensions, types énumérés et fonctions utilitaires génériques
-- Toutes les migrations sont idempotentes autant que possible et versionnées par horodatage.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types énumérés (valeurs contrôlées)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('client', 'worker', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum
    ('draft', 'published', 'reviewing', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contract_status as enum
    ('pending_acceptance', 'in_progress', 'submitted', 'completed', 'cancelled', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pay_type as enum ('fixed', 'hourly', 'daily');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_mode as enum ('on_site', 'remote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum
    ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('charge', 'commission', 'provider_fee', 'payout', 'refund');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum ('pending', 'completed', 'failed', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_status as enum ('available', 'busy', 'unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_target as enum ('user', 'job', 'message', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dispute_status as enum ('open', 'under_review', 'resolved_client', 'resolved_worker', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Trigger générique updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Arrondit un point pour ne jamais exposer une position exacte (~1,1 km de grille).
create or replace function public.approx_point(p extensions.geography)
returns extensions.geography
language sql
immutable
set search_path = public, extensions
as $$
  select case when p is null then null
    else extensions.st_snaptogrid(p::extensions.geometry, 0.01)::extensions.geography end;
$$;
