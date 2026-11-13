-- =============================================================================
-- Tableau de bord propriétaire (/admin/joblink) : opérations complètes
--  * missions : recherche, filtres par statut, pagination
--  * fiche détaillée d'un utilisateur
--  * paiements : filtres, totaux, enregistrement d'un versement Mobile Money
--  * litiges : liste et décisions
--  * vérifications d'identité : liste et décisions
-- Toutes les fonctions exigent la clé serveur + une session propriétaire valide,
-- et chaque action est inscrite au journal d'audit.
-- La logique métier des litiges et vérifications est factorisée dans des fonctions
-- internes partagées avec les fonctions admin existantes (comportement inchangé).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Cœur partagé : décision sur un litige
-- ---------------------------------------------------------------------------
create or replace function public._resolve_dispute(p_dispute uuid, p_status public.dispute_status, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d public.disputes; c public.contracts;
begin
  select * into d from public.disputes where id = p_dispute for update;
  if not found then raise exception 'DISPUTE_NOT_FOUND'; end if;
  select * into c from public.contracts where id = d.contract_id for update;

  update public.disputes set status = p_status, resolution_note = left(p_note, 4000),
         resolved_by = case when p_status in ('resolved_client', 'resolved_worker', 'closed') then p_actor end,
         resolved_at = case when p_status in ('resolved_client', 'resolved_worker', 'closed') then now() end
   where id = d.id;

  if p_status = 'resolved_worker' then
    update public.contracts set status = 'completed', completed_at = coalesce(completed_at, now()) where id = c.id;
  elsif p_status = 'resolved_client' then
    update public.contracts set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Litige résolu en faveur du client'
     where id = c.id;
  end if;

  if p_status in ('resolved_client', 'resolved_worker', 'closed') then
    update public.jobs j set status = case
        when exists (select 1 from public.contracts x where x.job_id = j.id and x.status = 'disputed') then 'disputed'::public.job_status
        when not exists (select 1 from public.contracts x where x.job_id = j.id and x.status not in ('completed', 'cancelled'))
             and exists (select 1 from public.contracts x where x.job_id = j.id and x.status = 'completed')
          then 'completed'::public.job_status
        when not exists (select 1 from public.contracts x where x.job_id = j.id and x.status <> 'cancelled')
          then 'cancelled'::public.job_status
        else 'in_progress'::public.job_status end
     where j.id = d.job_id;
    perform public._notify(d.opened_by, 'dispute_resolved', 'Litige traité', left(p_note, 200), '/notifications');
    perform public._notify(d.against_id, 'dispute_resolved', 'Litige traité', left(p_note, 200), '/notifications');
  end if;

  insert into public.contract_events (job_id, contract_id, actor_id, event_type, to_status, payload)
  values (d.job_id, d.contract_id, p_actor, 'dispute.updated', p_status::text, jsonb_build_object('dispute_id', d.id));
  perform public._audit('dispute.updated', 'dispute', d.id::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_resolve_dispute(p_dispute uuid, p_status public.dispute_status, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform public._resolve_dispute(p_dispute, p_status, p_note, auth.uid());
end $$;

-- ---------------------------------------------------------------------------
-- Cœur partagé : décision sur une vérification d'identité
-- ---------------------------------------------------------------------------
create or replace function public._review_verification(p_request uuid, p_approve boolean, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.verification_requests;
begin
  select * into r from public.verification_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  update public.verification_requests set status = case when p_approve then 'approved'::public.verification_status
                                                     else 'rejected'::public.verification_status end,
         reviewed_by = p_actor, reviewed_at = now(), review_note = left(p_note, 1000)
   where id = r.id;
  if p_approve then
    update public.worker_profiles set is_verified = true, verified_at = now() where user_id = r.user_id;
  end if;
  perform public._audit('verification.reviewed', 'verification_request', r.id::text,
    jsonb_build_object('approved', p_approve));
  perform public._notify(r.user_id, 'verification_result',
    case when p_approve then 'Vérification approuvée' else 'Vérification refusée' end,
    coalesce(p_note, case when p_approve then 'Votre identité a été vérifiée.' else 'Votre document n''a pas pu être validé.' end),
    '/worker/profile');
end $$;

create or replace function public.admin_review_verification(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform public._review_verification(p_request, p_approve, p_note, auth.uid());
end $$;

revoke all on function public._resolve_dispute(uuid, public.dispute_status, text, uuid),
  public._review_verification(uuid, boolean, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Missions : recherche + filtres + pagination
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_jobs(
  p_server_key text, p_token text, p_search text default null, p_status text default null,
  p_limit int default 25, p_offset int default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_statuses public.job_status[] := case p_status
    when 'open' then array['published', 'reviewing']::public.job_status[]
    when 'active' then array['assigned', 'in_progress']::public.job_status[]
    when 'completed' then array['completed']::public.job_status[]
    when 'disputed' then array['disputed']::public.job_status[]
    when 'cancelled' then array['cancelled']::public.job_status[]
    when 'draft' then array['draft']::public.job_status[]
    else null end;
  v_hidden boolean := coalesce(p_status = 'hidden', false);
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return (
    with f as (
      select j.*, cat.name as category, (c.first_name || ' ' || c.last_name) as client_name
        from public.jobs j
        join public.categories cat on cat.id = j.category_id
        join public.profiles c on c.id = j.client_id
       where j.deleted_at is null
         and (v_statuses is null or j.status = any (v_statuses))
         and (not v_hidden or j.is_hidden)
         and (v_q is null or j.title ilike '%' || v_q || '%' or j.city ilike '%' || v_q || '%'
              or j.neighborhood ilike '%' || v_q || '%' or cat.name ilike '%' || v_q || '%'
              or (c.first_name || ' ' || c.last_name) ilike '%' || v_q || '%')
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'counts', jsonb_build_object(
        'open', (select count(*) from public.jobs where deleted_at is null and status in ('published', 'reviewing')),
        'active', (select count(*) from public.jobs where deleted_at is null and status in ('assigned', 'in_progress')),
        'completed', (select count(*) from public.jobs where deleted_at is null and status = 'completed'),
        'disputed', (select count(*) from public.jobs where deleted_at is null and status = 'disputed'),
        'hidden', (select count(*) from public.jobs where deleted_at is null and is_hidden)
      ),
      'items', (
        select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
          select f.id, f.title, f.city, f.neighborhood, f.budget_amount, f.pay_type, f.status, f.is_hidden,
                 f.moderation_note, f.created_at, f.deadline, f.applications_count, f.category, f.client_id, f.client_name,
                 f.work_mode
            from f order by f.created_at desc
           limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
        ) x
      )
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Fiche détaillée d'un utilisateur
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_user_detail(p_server_key text, p_token text, p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  perform owner_panel._require_session(p_server_key, p_token);
  select * into p from public.profiles where id = p_user and deleted_at is null;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'email', p.email, 'phone', p.phone,
      'city', p.city, 'neighborhood', p.neighborhood, 'avatar_url', p.avatar_url, 'bio', p.bio,
      'created_at', p.created_at, 'is_suspended', p.is_suspended, 'suspended_reason', p.suspended_reason,
      'suspended_at', p.suspended_at
    ),
    'roles', coalesce((select jsonb_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = p.id), '[]'::jsonb),
    'worker', (
      select jsonb_build_object('headline', w.headline, 'is_verified', w.is_verified, 'rating_avg', w.rating_avg,
               'rating_count', w.rating_count, 'completed_jobs_count', w.completed_jobs_count,
               'availability', w.availability, 'experience_years', w.experience_years)
        from public.worker_profiles w where w.user_id = p.id
    ),
    'stats', jsonb_build_object(
      'jobs', (select count(*) from public.jobs j where j.client_id = p.id and j.deleted_at is null),
      'applications', (select count(*) from public.applications a where a.worker_id = p.id),
      'contracts', (select count(*) from public.contracts c where c.client_id = p.id or c.worker_id = p.id),
      'paid', (select coalesce(sum(amount), 0) from public.payments where payer_id = p.id and status = 'succeeded'),
      'earned', (select coalesce(sum(net_amount), 0) from public.payments where payee_id = p.id and status = 'succeeded'),
      'reports_against', (select count(*) from public.reports r where r.target_type = 'user' and r.target_id = p.id)
    ),
    'jobs', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select j.id, j.title, j.status, j.is_hidden, j.budget_amount, j.created_at, j.applications_count
          from public.jobs j where j.client_id = p.id and j.deleted_at is null
         order by j.created_at desc limit 8
      ) x
    ),
    'applications', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select a.id, a.status, a.created_at, j.id as job_id, j.title as job_title
          from public.applications a join public.jobs j on j.id = a.job_id
         where a.worker_id = p.id
         order by a.created_at desc limit 8
      ) x
    ),
    'payments', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select py.id, py.amount, py.net_amount, py.status, py.payout_status, py.created_at,
               case when py.payer_id = p.id then 'payer' else 'payee' end as side
          from public.payments py where py.payer_id = p.id or py.payee_id = p.id
         order by py.created_at desc limit 8
      ) x
    ),
    'history', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select l.action, l.created_at, l.metadata
          from public.audit_logs l
         where (l.entity_type = 'user' and l.entity_id = p.id::text) or l.actor_id = p.id
         order by l.created_at desc limit 10
      ) x
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Paiements : liste filtrée + totaux
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_payments(
  p_server_key text, p_token text, p_filter text default null, p_limit int default 25, p_offset int default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return (
    with f as (
      select py.* from public.payments py
       where case coalesce(p_filter, '')
         when 'pending' then py.status in ('pending', 'processing')
         when 'payout' then py.status = 'succeeded' and py.payout_status <> 'completed'
         when 'succeeded' then py.status = 'succeeded'
         when 'failed' then py.status in ('failed', 'cancelled')
         when 'refunded' then py.status = 'refunded'
         else true end
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'summary', jsonb_build_object(
        'all', (select count(*) from public.payments),
        'pending', (select count(*) from public.payments where status in ('pending', 'processing')),
        'payout', (select count(*) from public.payments where status = 'succeeded' and payout_status <> 'completed'),
        'payout_amount', (select coalesce(sum(net_amount), 0) from public.payments where status = 'succeeded' and payout_status <> 'completed'),
        'succeeded', (select count(*) from public.payments where status = 'succeeded'),
        'failed', (select count(*) from public.payments where status in ('failed', 'cancelled')),
        'refunded', (select count(*) from public.payments where status = 'refunded'),
        'volume', (select coalesce(sum(amount), 0) from public.payments where status = 'succeeded'),
        'commissions', (select coalesce(sum(commission_amount), 0) from public.payments where status = 'succeeded')
      ),
      'items', (
        select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
          select f.id, f.amount, f.commission_amount, f.provider_fee_amount, f.net_amount, f.status, f.payout_status,
                 f.payout_reference, f.payout_at, f.provider, f.provider_reference, f.receipt_number, f.failure_reason,
                 f.created_at, f.paid_at, f.job_id, j.title as job_title,
                 (pa.first_name || ' ' || pa.last_name) as payer_name,
                 (pe.first_name || ' ' || pe.last_name) as payee_name, pe.phone as payee_phone, f.payee_id, f.payer_id
            from f
            join public.jobs j on j.id = f.job_id
            join public.profiles pa on pa.id = f.payer_id
            join public.profiles pe on pe.id = f.payee_id
           order by f.created_at desc
           limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
        ) x
      )
    )
  );
end $$;

-- Enregistre un versement Mobile Money effectué manuellement au travailleur.
create or replace function public.owner_panel_record_payout(p_server_key text, p_token text, p_payment uuid, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ref text := btrim(coalesce(p_reference, ''));
begin
  perform owner_panel._require_session(p_server_key, p_token);
  if char_length(v_ref) < 3 or char_length(v_ref) > 120 then raise exception 'INVALID_REFERENCE'; end if;
  perform public.record_payout(p_payment, true, v_ref);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'owner_panel.payout_recorded', 'payment', p_payment::text, jsonb_build_object('reference', v_ref));
end $$;

-- ---------------------------------------------------------------------------
-- Litiges
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_disputes(p_server_key text, p_token text, p_all boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return (
    select coalesce(jsonb_agg(x order by x.open_first, x.created_at desc), '[]'::jsonb) from (
      select d.id, d.status, d.reason, d.details, d.resolution_note, d.created_at, d.resolved_at,
             d.job_id, j.title as job_title, c.agreed_amount,
             (o.first_name || ' ' || o.last_name) as opened_by_name,
             case when d.opened_by = c.client_id then 'client' else 'worker' end as opened_by_role,
             (a.first_name || ' ' || a.last_name) as against_name,
             (d.status not in ('open', 'under_review')) as open_first
        from public.disputes d
        join public.jobs j on j.id = d.job_id
        join public.contracts c on c.id = d.contract_id
        join public.profiles o on o.id = d.opened_by
        join public.profiles a on a.id = d.against_id
       where coalesce(p_all, false) or d.status in ('open', 'under_review')
       order by d.created_at desc
       limit 100
    ) x
  );
end $$;

create or replace function public.owner_panel_resolve_dispute(
  p_server_key text, p_token text, p_dispute uuid, p_status public.dispute_status, p_note text
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_note text := btrim(coalesce(p_note, ''));
begin
  perform owner_panel._require_session(p_server_key, p_token);
  if char_length(v_note) < 5 then raise exception 'NOTE_REQUIRED'; end if;
  if p_status = 'open' then raise exception 'INVALID_TRANSITION'; end if;
  if not exists (select 1 from public.disputes where id = p_dispute and status in ('open', 'under_review')) then
    raise exception 'INVALID_TRANSITION';
  end if;
  perform public._resolve_dispute(p_dispute, p_status, v_note, null);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'owner_panel.dispute_updated', 'dispute', p_dispute::text, jsonb_build_object('status', p_status));
end $$;

-- ---------------------------------------------------------------------------
-- Vérifications d'identité
-- ---------------------------------------------------------------------------
create or replace function public.owner_panel_verifications(p_server_key text, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return (
    select coalesce(jsonb_agg(x order by x.created_at), '[]'::jsonb) from (
      select v.id, v.user_id, v.document_type, v.document_path, v.note, v.created_at,
             (p.first_name || ' ' || p.last_name) as name, p.email, p.phone, p.city, w.headline
        from public.verification_requests v
        join public.profiles p on p.id = v.user_id
        left join public.worker_profiles w on w.user_id = v.user_id
       where v.status = 'pending'
       order by v.created_at
       limit 100
    ) x
  );
end $$;

create or replace function public.owner_panel_review_verification(
  p_server_key text, p_token text, p_request uuid, p_approve boolean, p_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform owner_panel._require_session(p_server_key, p_token);
  if not coalesce(p_approve, false) and v_note is null then raise exception 'NOTE_REQUIRED'; end if;
  perform public._review_verification(p_request, coalesce(p_approve, false), v_note, null);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'owner_panel.verification_reviewed', 'verification_request', p_request::text,
          jsonb_build_object('approved', coalesce(p_approve, false)));
end $$;

-- ---------------------------------------------------------------------------
-- Exposition : uniquement via clé serveur + session propriétaire
-- ---------------------------------------------------------------------------
revoke all on function
  public.owner_panel_jobs(text, text, text, text, int, int),
  public.owner_panel_user_detail(text, text, uuid),
  public.owner_panel_payments(text, text, text, int, int),
  public.owner_panel_record_payout(text, text, uuid, text),
  public.owner_panel_disputes(text, text, boolean),
  public.owner_panel_resolve_dispute(text, text, uuid, public.dispute_status, text),
  public.owner_panel_verifications(text, text),
  public.owner_panel_review_verification(text, text, uuid, boolean, text)
from public;
grant execute on function
  public.owner_panel_jobs(text, text, text, text, int, int),
  public.owner_panel_user_detail(text, text, uuid),
  public.owner_panel_payments(text, text, text, int, int),
  public.owner_panel_record_payout(text, text, uuid, text),
  public.owner_panel_disputes(text, text, boolean),
  public.owner_panel_resolve_dispute(text, text, uuid, public.dispute_status, text),
  public.owner_panel_verifications(text, text),
  public.owner_panel_review_verification(text, text, uuid, boolean, text)
to anon, authenticated;
