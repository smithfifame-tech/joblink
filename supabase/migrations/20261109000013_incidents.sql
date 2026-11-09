-- =============================================================================
-- Incidents techniques + agent de maintenance IA
--
-- - Les erreurs du site (navigateur et serveur) et les contrôles de santé créent des incidents,
--   dédoublonnés par empreinte (le même bug n'apparaît qu'une fois, avec un compteur).
-- - Le propriétaire les voit dans /admin/joblink et décide : « Autoriser l'IA », « Ignorer »,
--   « Marquer résolu ». L'agent IA ne travaille que sur les incidents autorisés (status = approved),
--   SAUF urgence « site inaccessible » (severity = critical, source = monitor) où il agit seul
--   (retour à la dernière version qui fonctionnait) et le signale (auto_action = true).
-- - Aucune lecture publique : table sans politique RLS, accès uniquement par fonctions protégées
--   par la clé serveur (signalement) ou la session propriétaire (consultation / décision).
-- =============================================================================

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check (char_length(fingerprint) between 8 and 128),
  source text not null check (source in ('client', 'server', 'monitor', 'ai')),
  severity text not null default 'normal' check (severity in ('critical', 'high', 'normal')),
  title text not null check (char_length(title) between 1 and 200),
  details text check (char_length(details) <= 4000),
  path text check (char_length(path) <= 300),
  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'approved', 'fixing', 'resolved', 'dismissed')),
  approved_at timestamptz,
  resolved_at timestamptz,
  auto_action boolean not null default false,
  ai_notes text check (char_length(ai_notes) <= 8000)
);
create index if not exists incidents_status_idx on public.incidents (status, last_seen desc);
alter table public.incidents enable row level security;
revoke all on public.incidents from public, anon, authenticated;

-- Signalement par le serveur Next (clé interne). Dédoublonnage + plafond anti-inondation.
create or replace function public.srv_report_incident(
  p_key text, p_fingerprint text, p_source text, p_severity text, p_title text, p_details text default null, p_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform server_api._check(p_key);
  if p_source not in ('client', 'server', 'monitor', 'ai') or p_severity not in ('critical', 'high', 'normal') then
    raise exception 'INVALID_INCIDENT';
  end if;
  -- Plafond : au-delà de 1000 incidents non clos, les nouvelles empreintes sont ignorées.
  if not exists (select 1 from public.incidents where fingerprint = p_fingerprint)
     and (select count(*) from public.incidents where status in ('open', 'approved', 'fixing')) >= 1000 then
    return;
  end if;
  insert into public.incidents as i (fingerprint, source, severity, title, details, path)
  values (left(p_fingerprint, 128), p_source, p_severity, left(p_title, 200), left(p_details, 4000), left(p_path, 300))
  on conflict (fingerprint) do update set
    occurrences = least(i.occurrences + 1, 1000000),
    last_seen = now(),
    details = coalesce(excluded.details, i.details),
    severity = case
      when (case excluded.severity when 'critical' then 3 when 'high' then 2 else 1 end)
         > (case i.severity when 'critical' then 3 when 'high' then 2 else 1 end) then excluded.severity
      else i.severity end,
    -- Un problème « résolu » qui revient (plus d'une heure après) est rouvert ; « ignoré » reste ignoré.
    status = case when i.status = 'resolved' and i.resolved_at < now() - interval '1 hour' then 'open' else i.status end;
end $$;

revoke all on function public.srv_report_incident(text, text, text, text, text, text, text) from public;
grant execute on function public.srv_report_incident(text, text, text, text, text, text, text) to anon, authenticated;

-- Consultation par le propriétaire
create or replace function public.owner_panel_incidents(p_server_key text, p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform owner_panel._require_session(p_server_key, p_token);
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'open', (select count(*) from public.incidents where status = 'open'),
      'approved', (select count(*) from public.incidents where status in ('approved', 'fixing')),
      'critical', (select count(*) from public.incidents where severity = 'critical' and status in ('open', 'approved', 'fixing')),
      'resolved_7d', (select count(*) from public.incidents where status = 'resolved' and resolved_at > now() - interval '7 days'),
      'auto_7d', (select count(*) from public.incidents where auto_action and last_seen > now() - interval '7 days')
    ),
    'items', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.ord, x.last_seen desc)
      from (
        select id, source, severity, title, details, path, occurrences, first_seen, last_seen, status,
               approved_at, resolved_at, auto_action, ai_notes,
               case status when 'fixing' then 0 when 'approved' then 1 when 'open' then 2 else 3 end as ord
          from public.incidents
         order by case status when 'fixing' then 0 when 'approved' then 1 when 'open' then 2 else 3 end, last_seen desc
         limit 100
      ) x
    ), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- Décision du propriétaire : autoriser l'IA, ignorer, rouvrir, marquer résolu
create or replace function public.owner_panel_set_incident(p_server_key text, p_token text, p_incident uuid, p_action text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  if p_action not in ('approve', 'dismiss', 'reopen', 'resolve') then raise exception 'INVALID_ACTION'; end if;
  update public.incidents set
    status = case p_action when 'approve' then 'approved' when 'dismiss' then 'dismissed' when 'reopen' then 'open' else 'resolved' end,
    approved_at = case when p_action = 'approve' then now() else approved_at end,
    resolved_at = case when p_action = 'resolve' then now() when p_action = 'reopen' then null else resolved_at end
  where id = p_incident;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public._audit('owner.incident_' || p_action, 'incident', p_incident::text, '{}'::jsonb);
end $$;

revoke all on function public.owner_panel_incidents(text, text), public.owner_panel_set_incident(text, text, uuid, text) from public;
grant execute on function public.owner_panel_incidents(text, text), public.owner_panel_set_incident(text, text, uuid, text) to anon, authenticated;
