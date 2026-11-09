-- =============================================================================
-- Tableau de bord du propriétaire (« /admin/joblink »)
-- Accès par mot de passe dédié, indépendant des comptes utilisateurs.
--
-- Sécurité :
--  * Le mot de passe n'est JAMAIS stocké en clair : uniquement un hash bcrypt (pgcrypto),
--    inséré hors dépôt (le dépôt est public). Aucun secret dans ce fichier.
--  * Les fonctions exigent en plus une « clé serveur » connue seulement du serveur Next.js
--    (variable d'environnement), dont seul le hash SHA-256 est en base : un appel direct à l'API
--    REST avec la clé publique (anon) est donc inutilisable, même avec le bon mot de passe.
--  * Verrouillage après échecs répétés (par IP et global), sessions à durée limitée stockées
--    hachées, journal des connexions et des actions dans audit_logs.
--  * Les tables vivent dans un schéma non exposé par l'API (owner_panel).
-- =============================================================================

create schema if not exists owner_panel;
revoke all on schema owner_panel from public, anon, authenticated;

create table if not exists owner_panel.config (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  server_key_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists owner_panel.sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip text,
  user_agent text,
  revoked_at timestamptz
);

create table if not exists owner_panel.attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip text,
  user_agent text,
  success boolean not null
);
create index if not exists owner_panel_attempts_recent on owner_panel.attempts (created_at desc);

revoke all on all tables in schema owner_panel from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Contrôles internes (non exposés)
-- ---------------------------------------------------------------------------
create or replace function owner_panel._sha256(p text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(coalesce(p, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function owner_panel._check_server_key(p_server_key text)
returns void language plpgsql stable set search_path = '' as $$
declare v_hash text;
begin
  select server_key_hash into v_hash from owner_panel.config where id = 1;
  if v_hash is null then raise exception 'OWNER_PANEL_NOT_CONFIGURED' using errcode = '42501'; end if;
  if p_server_key is null or length(p_server_key) < 32 or owner_panel._sha256(p_server_key) <> v_hash then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end $$;

-- Vérifie la clé serveur et la session ; prolonge légèrement l'activité.
create or replace function owner_panel._require_session(p_server_key text, p_token text)
returns void language plpgsql set search_path = '' as $$
begin
  perform owner_panel._check_server_key(p_server_key);
  update owner_panel.sessions
     set last_seen_at = now()
   where token_hash = owner_panel._sha256(p_token)
     and revoked_at is null
     and expires_at > now();
  if not found then raise exception 'SESSION_EXPIRED' using errcode = '42501'; end if;
end $$;

revoke all on all functions in schema owner_panel from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Connexion / déconnexion
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_login(p_server_key text, p_password text, p_ip text default null, p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  v_fail_ip int;
  v_fail_all int;
  v_token text;
begin
  perform owner_panel._check_server_key(p_server_key);

  -- Verrouillage : 5 échecs par IP ou 20 échecs au total sur 15 minutes
  select count(*) filter (where not success and ip is not distinct from left(p_ip, 64)),
         count(*) filter (where not success)
    into v_fail_ip, v_fail_all
    from owner_panel.attempts
   where created_at > now() - interval '15 minutes';
  if v_fail_ip >= 5 or v_fail_all >= 20 then
    return jsonb_build_object('ok', false, 'error', 'LOCKED', 'retry_after_minutes', 15);
  end if;

  select password_hash into v_hash from owner_panel.config where id = 1;
  if p_password is null or length(p_password) > 200 or extensions.crypt(p_password, v_hash) <> v_hash then
    insert into owner_panel.attempts (ip, user_agent, success) values (left(p_ip, 64), left(p_user_agent, 300), false);
    insert into public.audit_logs (actor_id, action, entity_type, metadata)
    values (null, 'owner_panel.login_failed', 'owner_panel', jsonb_build_object('ip', left(p_ip, 64)));
    return jsonb_build_object('ok', false, 'error', 'INVALID_PASSWORD',
      'remaining', greatest(0, 4 - v_fail_ip));
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into owner_panel.sessions (token_hash, expires_at, ip, user_agent)
  values (owner_panel._sha256(v_token), now() + interval '8 hours', left(p_ip, 64), left(p_user_agent, 300));
  insert into owner_panel.attempts (ip, user_agent, success) values (left(p_ip, 64), left(p_user_agent, 300), true);
  insert into public.audit_logs (actor_id, action, entity_type, metadata)
  values (null, 'owner_panel.login', 'owner_panel', jsonb_build_object('ip', left(p_ip, 64)));
  -- Ménage : sessions expirées et tentatives anciennes
  delete from owner_panel.sessions where expires_at < now() - interval '7 days';
  delete from owner_panel.attempts where created_at < now() - interval '90 days';
  return jsonb_build_object('ok', true, 'token', v_token, 'expires_in', 8 * 3600);
end $$;

create or replace function public.owner_panel_logout(p_server_key text, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._check_server_key(p_server_key);
  update owner_panel.sessions set revoked_at = now()
   where token_hash = owner_panel._sha256(p_token) and revoked_at is null;
  if found then
    insert into public.audit_logs (actor_id, action, entity_type) values (null, 'owner_panel.logout', 'owner_panel');
  end if;
end $$;

create or replace function public.owner_panel_session_valid(p_server_key text, p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return true;
exception when sqlstate '42501' then
  return false;
end $$;

-- ---------------------------------------------------------------------------
-- Données du tableau de bord
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_overview(p_server_key text, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_tz constant text := 'Africa/Porto-Novo';
  v_today date := (now() at time zone v_tz)::date;
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return jsonb_build_object(
    'generated_at', now(),
    'kpis', jsonb_build_object(
      'users', (select count(*) from public.profiles where deleted_at is null),
      'users_7d', (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
      'clients', (select count(*) from public.user_roles where role = 'client'),
      'workers', (select count(*) from public.user_roles where role = 'worker'),
      'admins', (select count(*) from public.user_roles where role = 'admin'),
      'suspended', (select count(*) from public.profiles where is_suspended and deleted_at is null),
      'jobs_total', (select count(*) from public.jobs where deleted_at is null),
      'jobs_open', (select count(*) from public.jobs where deleted_at is null and status in ('published', 'reviewing') and not is_hidden),
      'jobs_active', (select count(*) from public.jobs where deleted_at is null and status in ('assigned', 'in_progress')),
      'jobs_completed', (select count(*) from public.jobs where status = 'completed'),
      'jobs_7d', (select count(*) from public.jobs where deleted_at is null and created_at > now() - interval '7 days'),
      'applications', (select count(*) from public.applications),
      'volume', (select coalesce(sum(amount), 0) from public.payments where status = 'succeeded'),
      'commissions', (select coalesce(sum(commission_amount), 0) from public.payments where status = 'succeeded'),
      'commissions_30d', (select coalesce(sum(commission_amount), 0) from public.payments
                          where status = 'succeeded' and coalesce(paid_at, created_at) > now() - interval '30 days'),
      'payments_pending', (select count(*) from public.payments where status in ('pending', 'processing')),
      'payouts_pending', (select count(*) from public.payments where status = 'succeeded' and payout_status in ('not_started', 'pending')),
      'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
      'disputes_open', (select count(*) from public.disputes where status in ('open', 'under_review')),
      'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
      'contact_new', (select count(*) from public.contact_messages where status = 'new')
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'users', u, 'jobs', j) order by d), '[]'::jsonb)
      from (
        select g::date as d,
          (select count(*) from public.profiles p where (p.created_at at time zone v_tz)::date = g::date) as u,
          (select count(*) from public.jobs x where (x.created_at at time zone v_tz)::date = g::date) as j
        from generate_series(v_today - 29, v_today, interval '1 day') as g
      ) s
    ),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'count', c.n) order by c.n desc), '[]'::jsonb)
      from (
        select cat.name, count(j.id) as n
          from public.categories cat
          left join public.jobs j on j.category_id = cat.id and j.deleted_at is null
         group by cat.name
        having count(j.id) > 0
         order by n desc
         limit 8
      ) c
    ),
    'by_city', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t.city, 'count', t.n) order by t.n desc), '[]'::jsonb)
      from (
        select coalesce(nullif(city, ''), 'Non renseignée') as city, count(*) as n
          from public.profiles where deleted_at is null
         group by 1 order by n desc limit 6
      ) t
    ),
    'recent_users', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select p.id, p.first_name, p.last_name, p.email, p.city, p.created_at, p.is_suspended,
               coalesce((select array_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = p.id), '{}') as roles
          from public.profiles p where p.deleted_at is null
         order by p.created_at desc limit 8
      ) x
    ),
    'recent_jobs', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select j.id, j.title, j.city, j.neighborhood, j.budget_amount, j.status, j.is_hidden, j.created_at,
               j.applications_count, cat.name as category
          from public.jobs j join public.categories cat on cat.id = j.category_id
         where j.deleted_at is null
         order by j.created_at desc limit 8
      ) x
    ),
    'recent_payments', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select p.id, p.amount, p.commission_amount, p.status, p.provider, p.receipt_number, p.created_at
          from public.payments p order by p.created_at desc limit 8
      ) x
    ),
    'open_reports', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at
          from public.reports r where r.status in ('open', 'reviewing')
         order by r.created_at desc limit 8
      ) x
    ),
    'contact_messages', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select m.id, m.name, m.email, m.subject, m.message, m.status, m.created_at
          from public.contact_messages m order by m.created_at desc limit 6
      ) x
    ),
    'recent_logins', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select a.created_at, a.ip, a.success from owner_panel.attempts a order by a.created_at desc limit 8
      ) x
    )
  );
end $$;

create or replace function public.owner_panel_users(p_server_key text, p_token text, p_search text default null, p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_q text := nullif(trim(coalesce(p_search, '')), '');
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return jsonb_build_object(
    'total', (select count(*) from public.profiles p where p.deleted_at is null
               and (v_q is null or p.email ilike '%' || v_q || '%' or (p.first_name || ' ' || p.last_name) ilike '%' || v_q || '%'
                    or coalesce(p.phone, '') ilike '%' || v_q || '%' or coalesce(p.city, '') ilike '%' || v_q || '%')),
    'items', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select p.id, p.first_name, p.last_name, p.email, p.phone, p.city, p.neighborhood, p.created_at,
               p.is_suspended, p.suspended_reason,
               coalesce((select array_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = p.id), '{}') as roles,
               (select count(*) from public.jobs j where j.client_id = p.id and j.deleted_at is null) as jobs_count,
               (select count(*) from public.applications a where a.worker_id = p.id) as applications_count
          from public.profiles p
         where p.deleted_at is null
           and (v_q is null or p.email ilike '%' || v_q || '%' or (p.first_name || ' ' || p.last_name) ilike '%' || v_q || '%'
                or coalesce(p.phone, '') ilike '%' || v_q || '%' or coalesce(p.city, '') ilike '%' || v_q || '%')
         order by p.created_at desc
         limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
      ) x
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Actions (journalisées)
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_set_suspension(p_server_key text, p_token text, p_user uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  update public.profiles
     set is_suspended = p_suspended,
         suspended_reason = case when p_suspended then left(p_reason, 500) end,
         suspended_at = case when p_suspended then now() end
   where id = p_user and deleted_at is null;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, case when p_suspended then 'owner_panel.user_suspended' else 'owner_panel.user_reactivated' end,
          'user', p_user::text, jsonb_build_object('reason', left(p_reason, 500)));
end $$;

create or replace function public.owner_panel_moderate_job(p_server_key text, p_token text, p_job uuid, p_hide boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  update public.jobs set is_hidden = p_hide, moderation_note = left(p_note, 1000) where id = p_job and deleted_at is null;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, case when p_hide then 'owner_panel.job_hidden' else 'owner_panel.job_restored' end,
          'job', p_job::text, jsonb_build_object('note', left(p_note, 1000)));
end $$;

create or replace function public.owner_panel_update_report(p_server_key text, p_token text, p_report uuid, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  update public.reports set status = p_status, resolution_note = left(p_note, 2000), handled_at = now() where id = p_report;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'owner_panel.report_updated', 'report', p_report::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.owner_panel_mark_contact(p_server_key text, p_token text, p_message uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  update public.contact_messages set status = 'handled' where id = p_message;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (null, 'owner_panel.contact_handled', 'contact_message', p_message::text);
end $$;

-- Exposition minimale : uniquement ces RPC, protégées par clé serveur + session.
revoke all on function
  public.owner_panel_login(text, text, text, text),
  public.owner_panel_logout(text, text),
  public.owner_panel_session_valid(text, text),
  public.owner_panel_overview(text, text),
  public.owner_panel_users(text, text, text, int, int),
  public.owner_panel_set_suspension(text, text, uuid, boolean, text),
  public.owner_panel_moderate_job(text, text, uuid, boolean, text),
  public.owner_panel_update_report(text, text, uuid, public.report_status, text),
  public.owner_panel_mark_contact(text, text, uuid)
from public;
grant execute on function
  public.owner_panel_login(text, text, text, text),
  public.owner_panel_logout(text, text),
  public.owner_panel_session_valid(text, text),
  public.owner_panel_overview(text, text),
  public.owner_panel_users(text, text, text, int, int),
  public.owner_panel_set_suspension(text, text, uuid, boolean, text),
  public.owner_panel_moderate_job(text, text, uuid, boolean, text),
  public.owner_panel_update_report(text, text, uuid, public.report_status, text),
  public.owner_panel_mark_contact(text, text, uuid)
to anon, authenticated;
