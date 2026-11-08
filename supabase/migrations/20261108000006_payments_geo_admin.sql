-- JOBLINK — 006 : paiements (transactions SQL atomiques), recherche géographique, statistiques, admin

-- ---------------------------------------------------------------------------
-- Commission : montant × taux, arrondi au franc (XOF n'a pas de décimales)
-- ---------------------------------------------------------------------------
create or replace function public.compute_commission(p_amount bigint, p_rate numeric)
returns bigint language sql immutable as $$
  select round(p_amount::numeric * p_rate)::bigint;
$$;

-- Création (idempotente) d'une intention de paiement par le client.
-- Le montant provient TOUJOURS du contrat en base, jamais du navigateur.
create or replace function public.create_payment_intent(p_contract_id uuid, p_provider text, p_idempotency_key text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._require_active();
  c public.contracts; p public.payments;
  v_rate numeric := public.setting_numeric('payments.commission_rate', 0.05);
  v_fee_rate numeric := public.setting_numeric('payments.provider_fee_rate', 0);
  v_commission bigint; v_fee bigint;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) < 16 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  select * into p from public.payments where idempotency_key = p_idempotency_key;
  if found then
    if p.payer_id <> uid then raise exception 'PAYMENT_NOT_FOUND' using errcode = '42501'; end if;
    return p;
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found or c.client_id <> uid then raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501'; end if;
  if c.status <> 'completed' then raise exception 'PAYMENT_NOT_ALLOWED'; end if;

  select * into p from public.payments where contract_id = c.id and status = 'succeeded' limit 1;
  if found then raise exception 'ALREADY_PAID'; end if;
  select * into p from public.payments where contract_id = c.id and status in ('pending', 'processing') limit 1;
  if found then return p; end if; -- empêche le double paiement : on réutilise l'intention en cours

  v_commission := public.compute_commission(c.agreed_amount, v_rate);
  v_fee := public.compute_commission(c.agreed_amount, v_fee_rate);

  insert into public.payments (contract_id, job_id, payer_id, payee_id, amount, commission_rate, commission_amount,
                               provider_fee_amount, net_amount, currency, provider, idempotency_key)
  values (c.id, c.job_id, c.client_id, c.worker_id, c.agreed_amount, v_rate, v_commission,
          v_fee, c.agreed_amount - v_commission - v_fee, c.currency, p_provider, p_idempotency_key)
  returning * into p;

  perform public._log_event(c.job_id, c.id, 'payment.initiated', null, 'pending',
    jsonb_build_object('payment_id', p.id, 'amount', p.amount, 'provider', p_provider));
  return p;
end $$;

-- Rattache la référence du prestataire (service_role uniquement)
create or replace function public.attach_payment_reference(p_payment_id uuid, p_reference text, p_checkout_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.payments set provider_reference = p_reference, checkout_url = p_checkout_url,
         status = case when status = 'pending' then 'processing'::public.payment_status else status end
   where id = p_payment_id and status in ('pending', 'processing');
end $$;

-- Confirmation suite à un webhook SIGNÉ (service_role uniquement). Idempotente et atomique.
create or replace function public.confirm_payment(p_payment_id uuid, p_provider_reference text, p_provider_fee bigint default null)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare p public.payments; v_fee bigint; v_title text;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if p.status = 'succeeded' then return p; end if; -- déjà traité : idempotence
  if p.status not in ('pending', 'processing') then raise exception 'INVALID_TRANSITION'; end if;
  if p.provider_reference is not null and p_provider_reference is not null
     and p.provider_reference <> p_provider_reference then
    raise exception 'REFERENCE_MISMATCH';
  end if;

  v_fee := coalesce(p_provider_fee, p.provider_fee_amount);
  if v_fee < 0 or v_fee > p.amount - p.commission_amount then raise exception 'INVALID_FEE'; end if;

  update public.payments set
    status = 'succeeded', paid_at = now(),
    provider_reference = coalesce(p_provider_reference, provider_reference),
    provider_fee_amount = v_fee,
    net_amount = amount - commission_amount - v_fee,
    payout_status = 'pending',
    receipt_number = 'JL-' || to_char(now() at time zone 'Africa/Porto-Novo', 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
  where id = p.id
  returning * into p;

  insert into public.transactions (payment_id, user_id, type, amount, currency, status, provider_reference, description)
  values
    (p.id, p.payer_id, 'charge', p.amount, p.currency, 'completed', p.provider_reference, 'Paiement de la mission'),
    (p.id, null, 'commission', p.commission_amount, p.currency, 'completed', null, 'Commission JOBLINK'),
    (p.id, p.payee_id, 'payout', p.net_amount, p.currency, 'pending', null, 'Montant net dû au prestataire');
  if v_fee > 0 then
    insert into public.transactions (payment_id, user_id, type, amount, currency, status, description)
    values (p.id, null, 'provider_fee', v_fee, p.currency, 'completed', 'Frais du prestataire de paiement');
  end if;

  select title into v_title from public.jobs where id = p.job_id;
  insert into public.contract_events (job_id, contract_id, actor_id, event_type, from_status, to_status, payload)
  values (p.job_id, p.contract_id, null, 'payment.succeeded', 'processing', 'succeeded',
          jsonb_build_object('payment_id', p.id, 'receipt', p.receipt_number));
  perform public._notify(p.payer_id, 'payment_confirmed', 'Paiement confirmé',
    'Votre paiement de ' || p.amount || ' FCFA pour « ' || v_title || ' » est confirmé.',
    '/client/payments', jsonb_build_object('payment_id', p.id));
  perform public._notify(p.payee_id, 'payment_confirmed', 'Paiement reçu',
    'Le paiement de « ' || v_title || ' » est confirmé. Montant net : ' || p.net_amount || ' FCFA.',
    '/worker/earnings', jsonb_build_object('payment_id', p.id));
  return p;
end $$;

create or replace function public.fail_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.status not in ('pending', 'processing') then return; end if;
  update public.payments set status = 'failed', failure_reason = left(p_reason, 500) where id = p.id;
  perform public._notify(p.payer_id, 'payment_failed', 'Paiement échoué',
    'Le paiement n''a pas abouti. Vous pouvez réessayer.', '/client/payments',
    jsonb_build_object('payment_id', p.id));
end $$;

-- Annulation d'une intention non aboutie par le client (permet une nouvelle tentative)
create or replace function public.cancel_payment_intent(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); p public.payments;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.payer_id <> uid then raise exception 'PAYMENT_NOT_FOUND' using errcode = '42501'; end if;
  if p.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  update public.payments set status = 'cancelled' where id = p.id;
end $$;

-- Versement au prestataire (admin ou service_role après appel à l'API de reversement)
create or replace function public.record_payout(p_payment_id uuid, p_success boolean, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.status <> 'succeeded' then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if p.payout_status = 'completed' then return; end if;
  update public.payments set payout_status = case when p_success then 'completed' else 'failed' end,
         payout_reference = p_reference, payout_at = case when p_success then now() end
   where id = p.id;
  update public.transactions set status = case when p_success then 'completed'::public.transaction_status
                                               else 'failed'::public.transaction_status end,
         provider_reference = p_reference
   where payment_id = p.id and type = 'payout';
  perform public._audit('payment.payout_recorded', 'payment', p.id::text,
    jsonb_build_object('success', p_success, 'reference', p_reference));
  if p_success then
    perform public._notify(p.payee_id, 'payout_sent', 'Versement effectué',
      p.net_amount || ' FCFA vous ont été versés.', '/worker/earnings', jsonb_build_object('payment_id', p.id));
  end if;
end $$;

-- Remboursement (admin, après remboursement effectif chez le prestataire)
create or replace function public.admin_refund_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.status <> 'succeeded' then raise exception 'INVALID_TRANSITION'; end if;
  if p.payout_status = 'completed' then raise exception 'ALREADY_PAID_OUT'; end if;
  update public.payments set status = 'refunded', refunded_at = now(), payout_status = 'failed' where id = p.id;
  update public.transactions set status = 'reversed' where payment_id = p.id and type in ('payout', 'commission');
  insert into public.transactions (payment_id, user_id, type, amount, currency, status, description)
  values (p.id, p.payer_id, 'refund', p.amount - p.provider_fee_amount, p.currency, 'completed', left(p_reason, 300));
  perform public._audit('payment.refunded', 'payment', p.id::text, jsonb_build_object('reason', p_reason));
  perform public._notify(p.payer_id, 'payment_refunded', 'Remboursement effectué',
    'Votre paiement a été remboursé.', '/client/payments', jsonb_build_object('payment_id', p.id));
end $$;

-- ---------------------------------------------------------------------------
-- Recherche de missions (texte + filtres + rayon PostGIS + emprise de carte)
-- Ne renvoie que des missions publiées et ouvertes, jamais de position exacte.
-- ---------------------------------------------------------------------------
create or replace function public.search_jobs(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_query text default null,
  p_category_slug text default null,
  p_city text default null,
  p_min_budget bigint default null,
  p_max_budget bigint default null,
  p_work_mode public.work_mode default null,
  p_west double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_north double precision default null,
  p_sort text default 'recent',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, title text, description text, category_slug text, category_name text, category_icon text,
  budget_amount bigint, currency char(3), pay_type public.pay_type, city text, neighborhood text,
  work_mode public.work_mode, status public.job_status, deadline date, start_date date, workers_needed smallint,
  applications_count integer, created_at timestamptz, approx_lat double precision, approx_lng double precision,
  distance_km double precision, cover_image text, total_count bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (
    select case when p_lat is not null and p_lng is not null
           then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  ),
  base as (
    select j.*, c.slug as c_slug, c.name as c_name, c.icon as c_icon,
           case when o.g is not null and j.public_location is not null
                then round((st_distance(j.public_location, o.g) / 1000.0)::numeric, 1)::double precision end as dist
    from public.jobs j
    join public.categories c on c.id = j.category_id
    cross join origin o
    where j.deleted_at is null and not j.is_hidden
      and j.status in ('published', 'reviewing')
      and j.deadline >= current_date
      and (p_query is null or p_query = '' or j.search @@ websearch_to_tsquery('french', p_query)
           or j.title ilike '%' || p_query || '%')
      and (p_category_slug is null or c.slug = p_category_slug)
      and (p_city is null or p_city = '' or lower(j.city) = lower(p_city) or lower(j.neighborhood) = lower(p_city))
      and (p_min_budget is null or j.budget_amount >= p_min_budget)
      and (p_max_budget is null or j.budget_amount <= p_max_budget)
      and (p_work_mode is null or j.work_mode = p_work_mode)
      and (o.g is null or p_radius_km is null
           or (j.public_location is not null and st_dwithin(j.public_location, o.g, p_radius_km * 1000)))
      and (p_west is null or (j.public_location is not null and
           st_intersects(j.public_location::geometry, st_makeenvelope(p_west, p_south, p_east, p_north, 4326))))
  )
  select b.id, b.title, left(b.description, 280), b.c_slug, b.c_name, b.c_icon, b.budget_amount, b.currency,
         b.pay_type, b.city, b.neighborhood, b.work_mode, b.status, b.deadline, b.start_date, b.workers_needed,
         b.applications_count, b.created_at,
         st_y(b.public_location::geometry), st_x(b.public_location::geometry), b.dist,
         (select ji.storage_path from public.job_images ji where ji.job_id = b.id order by ji.sort_order limit 1),
         count(*) over ()
  from base b
  order by
    case when p_sort = 'distance' then b.dist end asc nulls last,
    case when p_sort = 'budget_desc' then b.budget_amount end desc,
    case when p_sort = 'budget_asc' then b.budget_amount end asc,
    case when p_sort = 'deadline' then b.deadline end asc,
    b.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Travailleurs disponibles à proximité : uniquement ceux qui ont donné leur accord (show_on_map)
create or replace function public.nearby_workers(
  p_lat double precision, p_lng double precision, p_radius_km double precision default 10,
  p_category_slug text default null, p_limit integer default 12
)
returns table (
  id uuid, first_name text, last_initial text, avatar_url text, city text, neighborhood text,
  headline text, is_verified boolean, rating_avg numeric, rating_count integer, completed_jobs_count integer,
  availability public.availability_status, approx_lat double precision, approx_lng double precision,
  distance_km double precision, categories text[]
)
language sql stable security definer set search_path = public, extensions as $$
  with o as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select p.id, p.first_name, left(p.last_name, 1) || '.', p.avatar_url, p.city, p.neighborhood,
         wp.headline, wp.is_verified, wp.rating_avg, wp.rating_count, wp.completed_jobs_count, wp.availability,
         st_y(ul.approx_location::geometry), st_x(ul.approx_location::geometry),
         greatest(1, round((st_distance(ul.approx_location, o.g) / 1000.0)::numeric))::double precision,
         array(select c.name from public.worker_categories wc join public.categories c on c.id = wc.category_id
               where wc.worker_id = p.id order by c.sort_order)
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  join public.user_locations ul on ul.user_id = wp.user_id
  cross join o
  where wp.show_on_map and wp.availability <> 'unavailable'
    and not p.is_suspended and p.deleted_at is null
    and st_dwithin(ul.approx_location, o.g, least(p_radius_km, 50) * 1000)
    and (p_category_slug is null or exists (
      select 1 from public.worker_categories wc join public.categories c on c.id = wc.category_id
      where wc.worker_id = p.id and c.slug = p_category_slug))
  order by 15 asc, wp.rating_avg desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

-- Mise à jour de la position de l'utilisateur courant
create or replace function public.set_my_location(
  p_lat double precision, p_lng double precision, p_source text default 'manual',
  p_city text default null, p_neighborhood text default null
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public._require_active();
begin
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
  insert into public.user_locations (user_id, location, source, city, neighborhood)
  values (uid, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          case when p_source = 'gps' then 'gps' else 'manual' end, left(p_city, 120), left(p_neighborhood, 120))
  on conflict (user_id) do update set location = excluded.location, source = excluded.source,
    city = excluded.city, neighborhood = excluded.neighborhood;
end $$;

-- ---------------------------------------------------------------------------
-- Statistiques des tableaux de bord
-- ---------------------------------------------------------------------------
create or replace function public.client_dashboard_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'published', (select count(*) from public.jobs where client_id = auth.uid() and status <> 'draft' and deleted_at is null),
    'in_progress', (select count(*) from public.jobs where client_id = auth.uid() and status in ('assigned', 'in_progress')),
    'completed', (select count(*) from public.jobs where client_id = auth.uid() and status = 'completed'),
    'applications', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id
                     where j.client_id = auth.uid()),
    'pending_applications', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id
                     where j.client_id = auth.uid() and a.status = 'pending'),
    'spent', (select coalesce(sum(amount), 0) from public.payments where payer_id = auth.uid() and status = 'succeeded'),
    'to_validate', (select count(*) from public.contracts where client_id = auth.uid() and status = 'submitted'),
    'to_pay', (select count(*) from public.contracts c where c.client_id = auth.uid() and c.status = 'completed'
               and not exists (select 1 from public.payments p where p.contract_id = c.id and p.status = 'succeeded'))
  );
$$;

create or replace function public.worker_dashboard_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'applications', (select count(*) from public.applications where worker_id = auth.uid()),
    'pending_applications', (select count(*) from public.applications where worker_id = auth.uid() and status = 'pending'),
    'active_contracts', (select count(*) from public.contracts where worker_id = auth.uid()
                         and status in ('pending_acceptance', 'in_progress', 'submitted')),
    'completed', (select count(*) from public.contracts where worker_id = auth.uid() and status = 'completed'),
    'earned', (select coalesce(sum(net_amount), 0) from public.payments where payee_id = auth.uid() and status = 'succeeded'),
    'pending_payout', (select coalesce(sum(net_amount), 0) from public.payments where payee_id = auth.uid()
                       and status = 'succeeded' and payout_status in ('pending', 'not_started')),
    'rating_avg', (select rating_avg from public.worker_profiles where user_id = auth.uid()),
    'rating_count', (select rating_count from public.worker_profiles where user_id = auth.uid())
  );
$$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles where deleted_at is null),
    'clients', (select count(*) from public.user_roles where role = 'client'),
    'workers', (select count(*) from public.user_roles where role = 'worker'),
    'jobs_published', (select count(*) from public.jobs where status in ('published', 'reviewing')),
    'jobs_in_progress', (select count(*) from public.jobs where status in ('assigned', 'in_progress')),
    'jobs_completed', (select count(*) from public.jobs where status = 'completed'),
    'volume', (select coalesce(sum(amount), 0) from public.payments where status = 'succeeded'),
    'commissions', (select coalesce(sum(commission_amount), 0) from public.payments where status = 'succeeded'),
    'payments_pending', (select count(*) from public.payments where status in ('pending', 'processing')),
    'payouts_pending', (select count(*) from public.payments where status = 'succeeded' and payout_status = 'pending'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'disputes_open', (select count(*) from public.disputes where status in ('open', 'under_review')),
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending')
  );
end $$;

-- Statistiques publiques (page d'accueil) — agrégats non sensibles
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open_jobs', (select count(*) from public.jobs where status in ('published', 'reviewing') and not is_hidden
                  and deleted_at is null and deadline >= current_date),
    'workers', (select count(*) from public.user_roles where role = 'worker'),
    'completed_jobs', (select count(*) from public.jobs where status = 'completed')
  );
$$;

-- ---------------------------------------------------------------------------
-- Actions administrateur (toutes journalisées)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_suspension(p_user uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_SUSPEND_SELF'; end if;
  update public.profiles set is_suspended = p_suspended,
         suspended_reason = case when p_suspended then left(p_reason, 500) end,
         suspended_at = case when p_suspended then now() end
   where id = p_user;
  perform public._audit(case when p_suspended then 'user.suspended' else 'user.reactivated' end,
    'user', p_user::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_set_worker_verified(p_user uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.worker_profiles set is_verified = p_verified, verified_at = case when p_verified then now() end
   where user_id = p_user;
  perform public._audit(case when p_verified then 'worker.verified' else 'worker.unverified' end, 'user', p_user::text);
  if p_verified then
    perform public._notify(p_user, 'profile_verified', 'Profil vérifié',
      'Votre profil affiche désormais le badge « Vérifié ».', '/worker/profile');
  end if;
end $$;

create or replace function public.admin_review_verification(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.verification_requests;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into r from public.verification_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  update public.verification_requests set status = case when p_approve then 'approved'::public.verification_status
                                                     else 'rejected'::public.verification_status end,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(p_note, 1000)
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

create or replace function public.admin_moderate_job(p_job uuid, p_hide boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.jobs;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.jobs set is_hidden = p_hide, moderation_note = left(p_note, 1000) where id = p_job returning * into v;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  perform public._audit(case when p_hide then 'job.hidden' else 'job.restored' end, 'job', p_job::text,
    jsonb_build_object('note', p_note));
  if p_hide then
    perform public._notify(v.client_id, 'job_moderated', 'Mission masquée par la modération',
      coalesce(p_note, 'Votre mission ne respecte pas les conditions d''utilisation.'), '/client/jobs/' || p_job);
  end if;
end $$;

create or replace function public.admin_update_report(p_report uuid, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.reports set status = p_status, resolution_note = left(p_note, 2000),
         handled_by = auth.uid(), handled_at = now() where id = p_report;
  perform public._audit('report.updated', 'report', p_report::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_resolve_dispute(p_dispute uuid, p_status public.dispute_status, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare d public.disputes; c public.contracts;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into d from public.disputes where id = p_dispute for update;
  if not found then raise exception 'DISPUTE_NOT_FOUND'; end if;
  select * into c from public.contracts where id = d.contract_id for update;

  update public.disputes set status = p_status, resolution_note = left(p_note, 4000),
         resolved_by = case when p_status in ('resolved_client', 'resolved_worker', 'closed') then auth.uid() end,
         resolved_at = case when p_status in ('resolved_client', 'resolved_worker', 'closed') then now() end
   where id = d.id;

  if p_status = 'resolved_worker' then
    -- En faveur du prestataire : le travail est considéré comme réalisé
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
  values (d.job_id, d.contract_id, auth.uid(), 'dispute.updated', p_status::text, jsonb_build_object('dispute_id', d.id));
  perform public._audit('dispute.updated', 'dispute', d.id::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_key = 'payments.commission_rate' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 0.5) then
    raise exception 'INVALID_SETTING';
  end if;
  update public.platform_settings set value = p_value, updated_by = auth.uid() where key = p_key;
  if not found then raise exception 'SETTING_NOT_FOUND'; end if;
  perform public._audit('setting.updated', 'platform_setting', p_key, jsonb_build_object('value', p_value));
end $$;
