-- Reproduction minimale de l'environnement Supabase pour tester les migrations en local
-- (rôles, schéma auth, auth.uid(), Storage, publication Realtime). NE PAS exécuter sur Supabase.

do $$ begin create role anon nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin noinherit bypassrls; exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to current_user;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}',
  raw_app_meta_data jsonb default '{}',
  instance_id uuid, aud text, role text,
  encrypted_password text, email_confirmed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create or replace function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claim.role', true);
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant execute on all functions in schema storage to anon, authenticated, service_role;

do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
