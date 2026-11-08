-- JOBLINK — 005 : logique métier côté serveur (transitions contrôlées)
-- Toute transition de statut passe par ces fonctions : les colonnes de statut ne sont pas
-- modifiables directement par les clients (voir privilèges en 008).
-- Les erreurs utilisent des codes stables (ex. 'JOB_NOT_OPEN') traduits dans l'interface.

-- ---------------------------------------------------------------------------
-- Utilitaires internes
-- ---------------------------------------------------------------------------
create or replace function public._notify(
  p_user uuid, p_type text, p_title text, p_body text default null,
  p_link text default null, p_data jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link, data)
  values (p_user, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'));
end $$;

create or replace function public._log_event(
  p_job uuid, p_contract uuid, p_type text, p_from text default null,
  p_to text default null, p_payload jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.contract_events (job_id, contract_id, actor_id, event_type, from_status, to_status, payload)
  values (p_job, p_contract, auth.uid(), p_type, p_from, p_to, coalesce(p_payload, '{}'));
end $$;

create or replace function public._audit(
  p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'));
end $$;

-- Journal d'audit appelable par un administrateur (actions effectuées par l'application)
create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform public._audit(p_action, p_entity_type, p_entity_id, p_metadata);
end $$;

create or replace function public._require_active() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_active_user() then raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function public._full_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(first_name || ' ' || left(last_name, 1) || '.', 'Utilisateur') from public.profiles where id = p_user;
$$;

-- ---------------------------------------------------------------------------
-- Inscription : création du profil et attribution du rôle CÔTÉ SERVEUR
-- Le rôle admin ne peut jamais provenir des métadonnées d'inscription.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.app_role := case when meta->>'account_type' = 'worker'
                                 then 'worker'::public.app_role else 'client'::public.app_role end;
  v_phone text := case when coalesce(meta->>'phone', '') ~ '^\+[0-9]{8,15}$' then meta->>'phone' end;
begin
  insert into public.profiles
    (id, first_name, last_name, email, phone, country_code, city, neighborhood, terms_accepted_at)
  values (
    new.id,
    left(coalesce(nullif(trim(meta->>'first_name'), ''), 'Utilisateur'), 80),
    left(coalesce(nullif(trim(meta->>'last_name'), ''), 'JOBLINK'), 80),
    coalesce(new.email, ''),
    v_phone,
    upper(left(coalesce(nullif(meta->>'country_code', ''), 'BJ'), 2)),
    left(nullif(trim(meta->>'city'), ''), 120),
    left(nullif(trim(meta->>'neighborhood'), ''), 120),
    case when meta->>'terms_accepted' = 'true' then now() end
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, v_role) on conflict do nothing;
  if v_role = 'worker' then
    insert into public.worker_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Attribution du rôle ADMIN : réservé au SQL Editor / service_role (procédure administrative)
create or replace function public.grant_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles where lower(email) = lower(p_email);
  if v_id is null then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.user_roles (user_id, role) values (v_id, 'admin') on conflict do nothing;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'admin.granted', 'user', v_id::text, jsonb_build_object('email', p_email));
end $$;

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create or replace function public._ensure_conversation(p_a uuid, p_b uuid, p_job uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_key text := least(p_a::text, p_b::text) || ':' || greatest(p_a::text, p_b::text);
  v_id uuid;
begin
  select id into v_id from public.conversations
   where pair_key = v_key and coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid)
                            = coalesce(p_job, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_id is null then
    insert into public.conversations (job_id, pair_key, created_by)
    values (p_job, v_key, auth.uid())
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.conversations
       where pair_key = v_key and coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid)
                                = coalesce(p_job, '00000000-0000-0000-0000-000000000000'::uuid);
    end if;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_id, p_a), (v_id, p_b) on conflict do nothing;
  end if;
  return v_id;
end $$;

-- Ouverture d'une conversation : uniquement entre un client et un candidat/prestataire de sa mission
create or replace function public.start_conversation(p_other uuid, p_job uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active();
begin
  if p_other = uid then raise exception 'INVALID_RECIPIENT'; end if;
  if not exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where a.job_id = p_job and (
      (j.client_id = uid and a.worker_id = p_other) or (j.client_id = p_other and a.worker_id = uid)
    )
  ) then
    raise exception 'CONVERSATION_NOT_ALLOWED' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_blocks
             where (blocker_id = p_other and blocked_id = uid) or (blocker_id = uid and blocked_id = p_other)) then
    raise exception 'BLOCKED' using errcode = '42501';
  end if;
  return public._ensure_conversation(uid, p_other, p_job);
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and type = 'new_message'
     and data->>'conversation_id' = p_conversation_id::text;
end $$;

-- Après chaque message : aperçu + notification (regroupée par conversation non lue)
create or replace function public.on_message_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare m record; v_name text := public._full_name(new.sender_id);
begin
  update public.conversations
     set last_message_at = new.created_at, last_message_preview = left(new.body, 140)
   where id = new.conversation_id;

  for m in select cm.user_id from public.conversation_members cm
            where cm.conversation_id = new.conversation_id and cm.user_id <> coalesce(new.sender_id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    if new.kind = 'system' then continue; end if;
    if exists (select 1 from public.user_blocks where blocker_id = m.user_id and blocked_id = new.sender_id) then
      continue;
    end if;
    update public.notifications
       set body = left(new.body, 140), created_at = now()
     where user_id = m.user_id and type = 'new_message' and read_at is null
       and data->>'conversation_id' = new.conversation_id::text;
    if not found then
      perform public._notify(m.user_id, 'new_message', 'Nouveau message de ' || v_name, left(new.body, 140),
        '/messages/' || new.conversation_id, jsonb_build_object('conversation_id', new.conversation_id));
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_created();

create or replace function public._system_message(p_conversation uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.messages (conversation_id, sender_id, body, kind) values (p_conversation, null, p_body, 'system');
end $$;

-- ---------------------------------------------------------------------------
-- Missions
-- ---------------------------------------------------------------------------
create or replace function public.publish_job(p_job_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); v public.jobs;
begin
  select * into v from public.jobs where id = p_job_id for update;
  if not found or v.client_id <> uid then raise exception 'JOB_NOT_FOUND' using errcode = '42501'; end if;
  if v.status <> 'draft' then raise exception 'INVALID_TRANSITION'; end if;
  if v.work_mode = 'on_site' and v.location is null then raise exception 'LOCATION_REQUIRED'; end if;
  update public.jobs set status = 'published', published_at = now() where id = p_job_id;
  perform public._log_event(p_job_id, null, 'job.published', 'draft', 'published');
end $$;

-- Trigger : horodatage de publication à l'insertion directe en 'published'
create or replace function public.on_job_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
drop trigger if exists jobs_before_insert on public.jobs;
create trigger jobs_before_insert before insert on public.jobs
  for each row execute function public.on_job_created();

create or replace function public.on_job_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.contract_events (job_id, actor_id, event_type, to_status)
  values (new.id, new.client_id, 'job.created', new.status::text);
  return new;
end $$;
drop trigger if exists jobs_after_insert on public.jobs;
create trigger jobs_after_insert after insert on public.jobs
  for each row execute function public.on_job_inserted();

-- Historise toute modification importante du contenu par le client
create or replace function public.on_job_updated()
returns trigger language plpgsql security definer set search_path = public as $$
declare changed text[] := '{}';
begin
  if new.title is distinct from old.title then changed := array_append(changed, 'title'); end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'description'); end if;
  if new.budget_amount is distinct from old.budget_amount then changed := array_append(changed, 'budget_amount'); end if;
  if new.deadline is distinct from old.deadline then changed := array_append(changed, 'deadline'); end if;
  if new.start_date is distinct from old.start_date then changed := array_append(changed, 'start_date'); end if;
  if new.location is distinct from old.location then changed := array_append(changed, 'location'); end if;
  if new.workers_needed is distinct from old.workers_needed then changed := array_append(changed, 'workers_needed'); end if;
  if cardinality(changed) > 0 then
    insert into public.contract_events (job_id, actor_id, event_type, payload)
    values (new.id, auth.uid(), 'job.updated', jsonb_build_object('fields', changed));
  end if;
  return new;
end $$;
drop trigger if exists jobs_after_update on public.jobs;
create trigger jobs_after_update after update on public.jobs
  for each row execute function public.on_job_updated();

create or replace function public.cancel_job(p_job_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); v public.jobs; a record;
begin
  select * into v from public.jobs where id = p_job_id for update;
  if not found or v.client_id <> uid then raise exception 'JOB_NOT_FOUND' using errcode = '42501'; end if;
  if v.status not in ('draft', 'published', 'reviewing', 'assigned') then
    raise exception 'CANCEL_NOT_ALLOWED'; -- une mission démarrée passe par un litige
  end if;
  if exists (select 1 from public.contracts c where c.job_id = p_job_id
             and c.status not in ('pending_acceptance', 'cancelled')) then
    raise exception 'CANCEL_NOT_ALLOWED';
  end if;

  update public.contracts set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Mission annulée par le client'
   where job_id = p_job_id and status = 'pending_acceptance';

  for a in select id, worker_id from public.applications where job_id = p_job_id and status in ('pending', 'accepted') loop
    update public.applications set status = 'rejected', decided_at = now(), decision_note = 'Mission annulée'
     where id = a.id;
    perform public._notify(a.worker_id, 'job_cancelled', 'Mission annulée',
      'La mission « ' || v.title || ' » a été annulée par le client.', '/worker/applications',
      jsonb_build_object('job_id', p_job_id));
  end loop;

  update public.jobs set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 500),
         archived_at = now() where id = p_job_id;
  perform public._log_event(p_job_id, null, 'job.cancelled', v.status::text, 'cancelled',
    jsonb_build_object('reason', left(p_reason, 500)));
end $$;

-- ---------------------------------------------------------------------------
-- Candidatures
-- ---------------------------------------------------------------------------
create or replace function public.apply_to_job(p_job_id uuid, p_cover_letter text, p_proposed_amount bigint default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); v public.jobs; v_id uuid;
begin
  if not public.has_role('worker') then raise exception 'WORKER_ROLE_REQUIRED' using errcode = '42501'; end if;
  select * into v from public.jobs where id = p_job_id and deleted_at is null and not is_hidden for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if v.client_id = uid then raise exception 'CANNOT_APPLY_OWN_JOB'; end if;
  if v.status not in ('published', 'reviewing') then raise exception 'JOB_NOT_OPEN'; end if;
  if v.deadline < current_date then raise exception 'JOB_EXPIRED'; end if;
  if p_proposed_amount is not null and not v.allow_price_proposal then
    raise exception 'PRICE_PROPOSAL_NOT_ALLOWED';
  end if;
  if exists (select 1 from public.user_blocks where blocker_id = v.client_id and blocked_id = uid) then
    raise exception 'BLOCKED' using errcode = '42501';
  end if;
  if exists (select 1 from public.applications where job_id = p_job_id and worker_id = uid) then
    raise exception 'ALREADY_APPLIED';
  end if;

  insert into public.applications (job_id, worker_id, cover_letter, proposed_amount)
  values (p_job_id, uid, p_cover_letter, p_proposed_amount)
  returning id into v_id;

  update public.jobs set applications_count = applications_count + 1,
         status = case when status = 'published' then 'reviewing'::public.job_status else status end
   where id = p_job_id;

  perform public._log_event(p_job_id, null, 'application.created', null, 'pending',
    jsonb_build_object('application_id', v_id));
  perform public._notify(v.client_id, 'new_application', 'Nouvelle candidature',
    public._full_name(uid) || ' a postulé à « ' || v.title || ' ».',
    '/client/jobs/' || p_job_id, jsonb_build_object('job_id', p_job_id, 'application_id', v_id));
  return v_id;
end $$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); a public.applications;
begin
  select * into a from public.applications where id = p_application_id for update;
  if not found or a.worker_id <> uid then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  update public.applications set status = 'withdrawn', withdrawn_at = now() where id = p_application_id;
  perform public._log_event(a.job_id, null, 'application.withdrawn', 'pending', 'withdrawn',
    jsonb_build_object('application_id', p_application_id));
end $$;

create or replace function public.accept_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._require_active();
  a public.applications; v public.jobs; v_contract uuid; v_conv uuid; v_active int; r record;
begin
  select * into a from public.applications where id = p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v from public.jobs where id = a.job_id for update;
  if v.client_id <> uid then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  if v.status not in ('published', 'reviewing') then raise exception 'JOB_NOT_OPEN'; end if;

  select count(*) into v_active from public.contracts where job_id = v.id and status <> 'cancelled';
  if v_active >= v.workers_needed then raise exception 'JOB_FULL'; end if;

  insert into public.contracts (job_id, application_id, client_id, worker_id, agreed_amount, currency)
  values (v.id, a.id, v.client_id, a.worker_id, coalesce(a.proposed_amount, v.budget_amount), v.currency)
  returning id into v_contract;

  update public.applications set status = 'accepted', decided_at = now() where id = a.id;

  if v_active + 1 >= v.workers_needed then
    update public.jobs set status = 'assigned', assigned_at = now() where id = v.id;
    perform public._log_event(v.id, v_contract, 'job.assigned', v.status::text, 'assigned');
    -- Mission complète : les autres candidatures sont refusées automatiquement
    for r in select id, worker_id from public.applications where job_id = v.id and status = 'pending' loop
      update public.applications set status = 'rejected', decided_at = now(),
             decision_note = 'Mission attribuée à un autre prestataire' where id = r.id;
      perform public._notify(r.worker_id, 'application_rejected', 'Candidature non retenue',
        'La mission « ' || v.title || ' » a été attribuée.', '/worker/applications',
        jsonb_build_object('job_id', v.id));
    end loop;
  end if;

  v_conv := public._ensure_conversation(v.client_id, a.worker_id, v.id);
  perform public._system_message(v_conv, 'Candidature acceptée. Le prestataire doit confirmer la mission.');

  perform public._log_event(v.id, v_contract, 'application.accepted', 'pending', 'accepted',
    jsonb_build_object('application_id', a.id, 'agreed_amount', coalesce(a.proposed_amount, v.budget_amount)));
  perform public._notify(a.worker_id, 'application_accepted', 'Candidature acceptée',
    'Votre candidature pour « ' || v.title || ' » a été acceptée. Confirmez la mission.',
    '/worker/contracts/' || v_contract, jsonb_build_object('contract_id', v_contract, 'job_id', v.id));
  return v_contract;
end $$;

create or replace function public.reject_application(p_application_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); a public.applications; v public.jobs;
begin
  select * into a from public.applications where id = p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v from public.jobs where id = a.job_id;
  if v.client_id <> uid then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  update public.applications set status = 'rejected', decided_at = now(), decision_note = left(p_note, 500)
   where id = a.id;
  perform public._log_event(v.id, null, 'application.rejected', 'pending', 'rejected',
    jsonb_build_object('application_id', a.id));
  perform public._notify(a.worker_id, 'application_rejected', 'Candidature non retenue',
    'Votre candidature pour « ' || v.title || ' » n''a pas été retenue.', '/worker/applications',
    jsonb_build_object('job_id', v.id));
end $$;

-- ---------------------------------------------------------------------------
-- Contrats (exécution de la mission)
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_contract(p_contract_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v public.jobs; v_pending int;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found or c.worker_id <> uid then raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501'; end if;
  if c.status <> 'pending_acceptance' then raise exception 'INVALID_TRANSITION'; end if;
  select * into v from public.jobs where id = c.job_id for update;

  if p_accept then
    update public.contracts set status = 'in_progress', accepted_at = now(), started_at = now() where id = c.id;
    if v.status in ('published', 'reviewing', 'assigned') then
      update public.jobs set status = 'in_progress' where id = v.id;
    end if;
    perform public._log_event(v.id, c.id, 'contract.started', 'pending_acceptance', 'in_progress');
    perform public._notify(c.client_id, 'mission_started', 'Mission démarrée',
      public._full_name(uid) || ' a confirmé et démarré « ' || v.title || ' ».',
      '/client/jobs/' || v.id, jsonb_build_object('contract_id', c.id));
  else
    update public.contracts set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Refusée par le prestataire'
     where id = c.id;
    update public.applications set status = 'withdrawn', withdrawn_at = now() where id = c.application_id;
    if v.status = 'assigned' then
      select count(*) into v_pending from public.applications where job_id = v.id and status = 'pending';
      update public.jobs set status = case when v_pending > 0 then 'reviewing'::public.job_status
                                           else 'published'::public.job_status end,
             assigned_at = null
       where id = v.id;
    end if;
    perform public._log_event(v.id, c.id, 'contract.declined', 'pending_acceptance', 'cancelled');
    perform public._notify(c.client_id, 'mission_declined', 'Mission refusée par le prestataire',
      'Le prestataire a décliné « ' || v.title || ' ». La mission est de nouveau ouverte.',
      '/client/jobs/' || v.id, jsonb_build_object('contract_id', c.id));
  end if;
end $$;

create or replace function public.submit_completion(p_contract_id uuid, p_note text, p_proof_paths text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v public.jobs; p text;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found or c.worker_id <> uid then raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501'; end if;
  if c.status <> 'in_progress' then raise exception 'INVALID_TRANSITION'; end if;
  -- Les preuves doivent appartenir au dossier Storage du prestataire
  foreach p in array coalesce(p_proof_paths, '{}') loop
    if p not like uid::text || '/%' then raise exception 'INVALID_PROOF_PATH' using errcode = '42501'; end if;
  end loop;
  select * into v from public.jobs where id = c.job_id;
  update public.contracts set status = 'submitted', submitted_at = now(), completion_note = left(p_note, 2000),
         proof_paths = coalesce(p_proof_paths, '{}') where id = c.id;
  perform public._log_event(v.id, c.id, 'contract.submitted', 'in_progress', 'submitted',
    jsonb_build_object('proofs', cardinality(coalesce(p_proof_paths, '{}'))));
  perform public._notify(c.client_id, 'mission_submitted', 'Travail déclaré terminé',
    public._full_name(uid) || ' a déclaré « ' || v.title || ' » terminé. Vérifiez et validez.',
    '/client/jobs/' || v.id, jsonb_build_object('contract_id', c.id));
end $$;

create or replace function public.request_changes(p_contract_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v public.jobs;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found or c.client_id <> uid then raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501'; end if;
  if c.status <> 'submitted' then raise exception 'INVALID_TRANSITION'; end if;
  select * into v from public.jobs where id = c.job_id;
  update public.contracts set status = 'in_progress', submitted_at = null where id = c.id;
  perform public._log_event(v.id, c.id, 'contract.changes_requested', 'submitted', 'in_progress',
    jsonb_build_object('note', left(p_note, 1000)));
  perform public._notify(c.worker_id, 'changes_requested', 'Corrections demandées',
    left(coalesce(p_note, 'Le client demande des corrections.'), 200),
    '/worker/contracts/' || c.id, jsonb_build_object('contract_id', c.id));
end $$;

create or replace function public.validate_completion(p_contract_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v public.jobs; v_remaining int;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found or c.client_id <> uid then raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501'; end if;
  if c.status <> 'submitted' then raise exception 'INVALID_TRANSITION'; end if;
  select * into v from public.jobs where id = c.job_id for update;

  update public.contracts set status = 'completed', completed_at = now() where id = c.id;
  update public.worker_profiles set completed_jobs_count = completed_jobs_count + 1 where user_id = c.worker_id;

  select count(*) into v_remaining from public.contracts
   where job_id = v.id and status not in ('completed', 'cancelled');
  if v_remaining = 0 then
    update public.jobs set status = 'completed', completed_at = now(), archived_at = now() where id = v.id;
    perform public._log_event(v.id, null, 'job.completed', v.status::text, 'completed');
  end if;

  perform public._log_event(v.id, c.id, 'contract.completed', 'submitted', 'completed');
  perform public._notify(c.worker_id, 'mission_completed', 'Mission validée',
    'Le client a validé « ' || v.title || ' ». Le paiement va être déclenché.',
    '/worker/contracts/' || c.id, jsonb_build_object('contract_id', c.id));
  perform public._notify(c.client_id, 'payment_due', 'Paiement à effectuer',
    'Vous avez validé « ' || v.title || ' ». Procédez au paiement du prestataire.',
    '/client/payments', jsonb_build_object('contract_id', c.id));
end $$;

create or replace function public.open_dispute(p_contract_id uuid, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v public.jobs; v_id uuid; v_other uuid; adm record;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if not found or uid not in (c.client_id, c.worker_id) then
    raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501';
  end if;
  if c.status not in ('in_progress', 'submitted', 'completed') then raise exception 'INVALID_TRANSITION'; end if;
  if exists (select 1 from public.payments where contract_id = c.id and status = 'succeeded' and payout_status = 'completed') then
    raise exception 'ALREADY_PAID_OUT';
  end if;
  v_other := case when uid = c.client_id then c.worker_id else c.client_id end;
  select * into v from public.jobs where id = c.job_id for update;

  insert into public.disputes (contract_id, job_id, opened_by, against_id, reason, details)
  values (c.id, v.id, uid, v_other, left(p_reason, 200), left(p_details, 4000)) returning id into v_id;
  update public.contracts set status = 'disputed' where id = c.id;
  update public.jobs set status = 'disputed' where id = v.id;

  perform public._log_event(v.id, c.id, 'dispute.opened', c.status::text, 'disputed',
    jsonb_build_object('dispute_id', v_id));
  perform public._notify(v_other, 'dispute_opened', 'Un litige a été ouvert',
    'Un problème a été signalé sur « ' || v.title || ' ». L''équipe JOBLINK va l''examiner.',
    case when v_other = c.client_id then '/client/jobs/' || v.id else '/worker/contracts/' || c.id end,
    jsonb_build_object('dispute_id', v_id));
  for adm in select user_id from public.user_roles where role = 'admin' loop
    perform public._notify(adm.user_id, 'admin_dispute', 'Nouveau litige', left(p_reason, 140),
      '/admin/disputes', jsonb_build_object('dispute_id', v_id));
  end loop;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Avis
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(p_contract_id uuid, p_rating smallint, p_comment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_active(); c public.contracts; v_target uuid; v_id uuid;
begin
  select * into c from public.contracts where id = p_contract_id;
  if not found or uid not in (c.client_id, c.worker_id) then
    raise exception 'CONTRACT_NOT_FOUND' using errcode = '42501';
  end if;
  if c.status <> 'completed' then raise exception 'REVIEW_NOT_ALLOWED'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  v_target := case when uid = c.client_id then c.worker_id else c.client_id end;
  insert into public.reviews (contract_id, job_id, reviewer_id, reviewee_id, rating, comment)
  values (c.id, c.job_id, uid, v_target, p_rating, nullif(left(p_comment, 1500), ''))
  returning id into v_id;
  perform public._notify(v_target, 'new_review', 'Nouvel avis reçu',
    public._full_name(uid) || ' vous a attribué ' || p_rating || '/5.',
    case when v_target = c.worker_id then '/worker/reviews' else '/client/reviews' end,
    jsonb_build_object('review_id', v_id));
  return v_id;
exception when unique_violation then
  raise exception 'ALREADY_REVIEWED';
end $$;

create or replace function public.refresh_worker_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.worker_profiles wp set
    rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r
                            where r.reviewee_id = v_target and not r.is_hidden), 0),
    rating_count = (select count(*) from public.reviews r where r.reviewee_id = v_target and not r.is_hidden)
  where wp.user_id = v_target;
  return null;
end $$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_worker_rating();

-- ---------------------------------------------------------------------------
-- Coordonnées : visibles uniquement entre parties d'un contrat (ou admin)
-- ---------------------------------------------------------------------------
create or replace function public.get_contact_info(p_user uuid)
returns table (email text, phone text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or exists (
    select 1 from public.contracts c
     where c.status <> 'cancelled'
       and ((c.client_id = auth.uid() and c.worker_id = p_user) or (c.worker_id = auth.uid() and c.client_id = p_user))
  )) then
    raise exception 'CONTACT_NOT_ALLOWED' using errcode = '42501';
  end if;
  return query select p.email, p.phone from public.profiles p where p.id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
end $$;

-- ---------------------------------------------------------------------------
-- Limitation de débit (appelée côté serveur avec la clé service_role)
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning count into v_count;
  return v_count <= p_max;
end $$;

-- Conservation des données (à planifier via pg_cron ou un cron Vercel)
create or replace function public.purge_expired_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics a = row_count;
  delete from public.notifications where read_at is not null and created_at < now() - interval '180 days';
  get diagnostics b = row_count;
  delete from public.webhook_events where received_at < now() - interval '400 days' and status <> 'error';
  get diagnostics c = row_count;
  return jsonb_build_object('rate_limits', a, 'notifications', b, 'webhook_events', c);
end $$;
