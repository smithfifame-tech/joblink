-- =============================================================================
-- API serveur à privilèges minimaux (remplace l'usage de la clé service_role)
--
-- Les opérations réservées au serveur (webhooks de paiement, rattachement des références,
-- limitation de débit, formulaire de contact, connexion par téléphone, purge planifiée,
-- coordonnées de versement) passent par des fonctions SECURITY DEFINER qui exigent une
-- « clé serveur interne » (variable d'environnement du serveur Next.js, jamais envoyée au
-- navigateur). Seul son hash SHA-256 est stocké, dans un schéma non exposé par l'API.
-- Chaque fonction ne fait qu'UNE chose précise : bien plus restreint qu'une clé service_role.
-- =============================================================================

create schema if not exists server_api;
revoke all on schema server_api from public, anon, authenticated;

create table if not exists server_api.config (
  id smallint primary key default 1 check (id = 1),
  key_hash text not null,
  updated_at timestamptz not null default now()
);
revoke all on all tables in schema server_api from public, anon, authenticated;

create or replace function server_api._check(p_key text)
returns void language plpgsql stable set search_path = '' as $$
declare v_hash text;
begin
  select key_hash into v_hash from server_api.config where id = 1;
  if v_hash is null then raise exception 'SERVER_API_NOT_CONFIGURED' using errcode = '42501'; end if;
  if p_key is null or length(p_key) < 32
     or encode(extensions.digest(convert_to(p_key, 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end $$;
revoke all on function server_api._check(text) from public, anon, authenticated;

-- --- Webhooks de paiement -------------------------------------------------
create or replace function public.srv_webhook_begin(p_key text, p_provider text, p_event_id text, p_event_type text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform server_api._check(p_key);
  insert into public.webhook_events (provider, event_id, event_type, payload)
  values (left(p_provider, 40), left(p_event_id, 200), left(p_event_type, 60), coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, event_id) do nothing
  returning id into v_id;
  return jsonb_build_object('duplicate', v_id is null, 'id', v_id);
end $$;

create or replace function public.srv_webhook_finish(p_key text, p_id uuid, p_status text, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  if p_status not in ('processed', 'ignored', 'error') then raise exception 'INVALID_STATUS'; end if;
  update public.webhook_events set status = p_status, error = left(p_error, 1000), processed_at = now() where id = p_id;
end $$;

create or replace function public.srv_find_payment(p_key text, p_provider text, p_reference text, p_payment_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform server_api._check(p_key);
  select jsonb_build_object('id', p.id, 'status', p.status, 'provider', p.provider, 'provider_reference', p.provider_reference)
    into r
    from public.payments p
   where p.provider = p_provider
     and ((p_reference is not null and p.provider_reference = p_reference) or (p_payment_id is not null and p.id = p_payment_id))
   order by (p.provider_reference = p_reference) desc nulls last
   limit 1;
  return r;
end $$;

create or replace function public.srv_confirm_payment(p_key text, p_payment_id uuid, p_reference text, p_fee bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  perform public.confirm_payment(p_payment_id, p_reference, p_fee);
end $$;

create or replace function public.srv_fail_payment(p_key text, p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  perform public.fail_payment(p_payment_id, p_reason);
end $$;

create or replace function public.srv_attach_payment_reference(p_key text, p_payment_id uuid, p_reference text, p_checkout_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  perform public.attach_payment_reference(p_payment_id, p_reference, p_checkout_url);
end $$;

-- Coordonnées Mobile Money du bénéficiaire pour un versement (admin vérifié côté application)
create or replace function public.srv_payee_contact(p_key text, p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform server_api._check(p_key);
  select jsonb_build_object('first_name', pr.first_name, 'last_name', pr.last_name, 'email', pr.email, 'phone', pr.phone)
    into r
    from public.payments p join public.profiles pr on pr.id = p.payee_id
   where p.id = p_payment_id;
  return r;
end $$;

-- --- Divers ------------------------------------------------------------------
create or replace function public.srv_check_rate_limit(p_key text, p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  return public.check_rate_limit(left(p_bucket, 200), p_max, p_window_seconds);
end $$;

create or replace function public.srv_insert_contact(p_key text, p_name text, p_email text, p_subject text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  insert into public.contact_messages (name, email, subject, message) values (p_name, p_email, p_subject, p_message);
end $$;

-- Connexion par téléphone : renvoie l'e-mail du compte (utilisé uniquement pour signInWithPassword côté serveur)
create or replace function public.srv_email_for_phone(p_key text, p_phone text)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform server_api._check(p_key);
  select email into v from public.profiles where phone = p_phone and deleted_at is null order by created_at limit 1;
  return v;
end $$;

create or replace function public.srv_purge(p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  return public.purge_expired_data();
end $$;

revoke all on function
  public.srv_webhook_begin(text, text, text, text, jsonb),
  public.srv_webhook_finish(text, uuid, text, text),
  public.srv_find_payment(text, text, text, uuid),
  public.srv_confirm_payment(text, uuid, text, bigint),
  public.srv_fail_payment(text, uuid, text),
  public.srv_attach_payment_reference(text, uuid, text, text),
  public.srv_payee_contact(text, uuid),
  public.srv_check_rate_limit(text, text, integer, integer),
  public.srv_insert_contact(text, text, text, text, text),
  public.srv_email_for_phone(text, text),
  public.srv_purge(text)
from public;
grant execute on function
  public.srv_webhook_begin(text, text, text, text, jsonb),
  public.srv_webhook_finish(text, uuid, text, text),
  public.srv_find_payment(text, text, text, uuid),
  public.srv_confirm_payment(text, uuid, text, bigint),
  public.srv_fail_payment(text, uuid, text),
  public.srv_attach_payment_reference(text, uuid, text, text),
  public.srv_payee_contact(text, uuid),
  public.srv_check_rate_limit(text, text, integer, integer),
  public.srv_insert_contact(text, text, text, text, text),
  public.srv_email_for_phone(text, text),
  public.srv_purge(text)
to anon, authenticated;
