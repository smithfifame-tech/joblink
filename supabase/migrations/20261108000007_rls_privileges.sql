-- JOBLINK — 007 : Row Level Security, privilèges par colonne, Storage, Realtime
-- Principe : tout est refusé par défaut, puis ouvert explicitement table par table.

-- ---------------------------------------------------------------------------
-- 1. Remise à zéro des privilèges par défaut de Supabase sur le schéma public
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Fonctions/tables créées plus tard par des migrations : pas d'accès anon/authenticated implicite
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Activation RLS sur toutes les tables
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_roles','worker_profiles','categories','worker_categories','skills','worker_skills',
    'user_locations','platform_settings','jobs','job_images','applications','contracts','contract_events',
    'conversations','conversation_members','messages','message_attachments','user_blocks','notifications',
    'payments','transactions','webhook_events','reviews','reports','disputes','favorites',
    'verification_requests','audit_logs','rate_limits','contact_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Fonctions d'aide (SECURITY DEFINER : évitent la récursion entre politiques)
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and user_id = auth.uid());
$$;

create or replace function public.is_job_party(p_job uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = p_job and client_id = auth.uid())
      or exists (select 1 from public.contracts where job_id = p_job and worker_id = auth.uid() and status <> 'cancelled');
$$;

create or replace function public.can_message(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_conversation_member(p_conversation)
     and public.is_active_user()
     and not exists (
       select 1 from public.conversation_members cm
       join public.user_blocks b on (b.blocker_id = cm.user_id and b.blocked_id = auth.uid())
                                 or (b.blocker_id = auth.uid() and b.blocked_id = cm.user_id)
       where cm.conversation_id = p_conversation and cm.user_id <> auth.uid()
     );
$$;

-- ---------------------------------------------------------------------------
-- 3. Politiques et privilèges par table
-- ---------------------------------------------------------------------------

-- profiles : lecture de son propre profil ; mise à jour limitée aux colonnes non sensibles
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, country_code, city, neighborhood, avatar_url, bio, locale,
              notify_email, notify_new_jobs) on public.profiles to authenticated;

-- Vues publiques (exécutées avec les droits du propriétaire, colonnes non sensibles uniquement)
grant select on public.public_profiles to anon, authenticated;
grant select on public.public_jobs to anon, authenticated;

-- user_roles : lecture seule de ses rôles. Aucune écriture possible côté client.
create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
grant select on public.user_roles to authenticated;

-- worker_profiles : profil professionnel public ; badge/notes non modifiables
create policy worker_profiles_select_all on public.worker_profiles for select to anon, authenticated using (true);
create policy worker_profiles_update_own on public.worker_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.worker_profiles to anon, authenticated;
grant update (headline, experience_years, experiences, rate_min, rate_max, rate_unit, travel_radius_km,
              availability, availability_notes, portfolio_urls, show_on_map) on public.worker_profiles to authenticated;

-- categories / skills : lecture publique, écriture admin
create policy categories_select on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.categories to anon, authenticated;
grant insert (slug, name, description, icon, sort_order, is_active),
      update (slug, name, description, icon, sort_order, is_active) on public.categories to authenticated;

create policy skills_select on public.skills for select to anon, authenticated using (true);
create policy skills_admin_insert on public.skills for insert to authenticated with check (public.is_admin());
create policy skills_admin_update on public.skills for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.skills to anon, authenticated;
grant insert (slug, name, category_id), update (slug, name, category_id) on public.skills to authenticated;

create policy worker_categories_select on public.worker_categories for select to anon, authenticated using (true);
create policy worker_categories_insert on public.worker_categories for insert to authenticated
  with check (worker_id = auth.uid());
create policy worker_categories_delete on public.worker_categories for delete to authenticated
  using (worker_id = auth.uid());
grant select on public.worker_categories to anon, authenticated;
grant insert (worker_id, category_id), delete on public.worker_categories to authenticated;

create policy worker_skills_select on public.worker_skills for select to anon, authenticated using (true);
create policy worker_skills_insert on public.worker_skills for insert to authenticated with check (worker_id = auth.uid());
create policy worker_skills_delete on public.worker_skills for delete to authenticated using (worker_id = auth.uid());
grant select on public.worker_skills to anon, authenticated;
grant insert (worker_id, skill_id), delete on public.worker_skills to authenticated;

-- user_locations : strictement privé (écriture via set_my_location)
create policy user_locations_own on public.user_locations for select to authenticated using (user_id = auth.uid());
create policy user_locations_delete_own on public.user_locations for delete to authenticated using (user_id = auth.uid());
grant select (user_id, source, city, neighborhood, updated_at), delete on public.user_locations to authenticated;

-- platform_settings : paramètres publics lisibles par tous
create policy settings_select on public.platform_settings for select to anon, authenticated
  using (is_public or public.is_admin());
grant select on public.platform_settings to anon, authenticated;

-- jobs : propriétaire, prestataire sous contrat et admin. Le public passe par la vue public_jobs.
create policy jobs_select_parties on public.jobs for select to authenticated
  using (client_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.contracts c where c.job_id = jobs.id and c.worker_id = auth.uid() and c.status <> 'cancelled'));
create policy jobs_insert_client on public.jobs for insert to authenticated
  with check (client_id = auth.uid() and public.has_role('client') and public.is_active_user()
              and status in ('draft', 'published'));
create policy jobs_update_owner on public.jobs for update to authenticated
  using (client_id = auth.uid() and status in ('draft', 'published', 'reviewing') and public.is_active_user())
  with check (client_id = auth.uid());
create policy jobs_delete_draft on public.jobs for delete to authenticated
  using (client_id = auth.uid() and status = 'draft');
grant select on public.jobs to authenticated;
grant insert (client_id, category_id, title, description, skills_required, budget_amount, pay_type,
              allow_price_proposal, start_date, deadline, country_code, city, neighborhood, address,
              location, work_mode, workers_needed, status) on public.jobs to authenticated;
grant update (category_id, title, description, skills_required, budget_amount, pay_type, allow_price_proposal,
              start_date, deadline, country_code, city, neighborhood, address, location, work_mode,
              workers_needed) on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

-- job_images : publiques (comme l'annonce), gérées par le propriétaire de la mission
create policy job_images_select on public.job_images for select to anon, authenticated using (true);
create policy job_images_insert on public.job_images for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.client_id = auth.uid())
              and storage_path like auth.uid()::text || '/%');
create policy job_images_delete on public.job_images for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.client_id = auth.uid()));
grant select on public.job_images to anon, authenticated;
grant insert (job_id, storage_path, sort_order), delete on public.job_images to authenticated;

-- applications : candidat, client de la mission, admin. Écriture via fonctions uniquement.
create policy applications_select on public.applications for select to authenticated
  using (worker_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.jobs j where j.id = job_id and j.client_id = auth.uid()));
grant select on public.applications to authenticated;

-- contracts : parties + admin. Écriture via fonctions uniquement.
create policy contracts_select on public.contracts for select to authenticated
  using (client_id = auth.uid() or worker_id = auth.uid() or public.is_admin());
grant select on public.contracts to authenticated;

create policy contract_events_select on public.contract_events for select to authenticated
  using (public.is_job_party(job_id) or public.is_admin());
grant select on public.contract_events to authenticated;

-- Messagerie
create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
grant select on public.conversations to authenticated;

create policy conversation_members_select on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
grant select on public.conversation_members to authenticated;

create policy messages_select on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id)
         or (public.is_admin() and exists (select 1 from public.reports r
                                            where r.target_type = 'message' and r.target_id = messages.id)));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and kind = 'text' and public.can_message(conversation_id));
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

create policy message_attachments_select on public.message_attachments for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy message_attachments_insert on public.message_attachments for insert to authenticated
  with check (public.can_message(conversation_id)
              and exists (select 1 from public.messages m where m.id = message_id
                          and m.sender_id = auth.uid() and m.conversation_id = message_attachments.conversation_id)
              and storage_path like conversation_id::text || '/' || auth.uid()::text || '/%');
grant select on public.message_attachments to authenticated;
grant insert (message_id, conversation_id, storage_path, file_name, mime_type, size_bytes)
  on public.message_attachments to authenticated;

create policy user_blocks_own on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy user_blocks_insert on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy user_blocks_delete on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());
grant select, delete on public.user_blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.user_blocks to authenticated;

-- Notifications : chacun ne voit que les siennes
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Paiements : lecture par le payeur, le bénéficiaire et l'admin. Écriture : fonctions uniquement.
create policy payments_select on public.payments for select to authenticated
  using (payer_id = auth.uid() or payee_id = auth.uid() or public.is_admin());
grant select on public.payments to authenticated;

create policy transactions_select on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
grant select on public.transactions to authenticated;

create policy webhook_events_admin on public.webhook_events for select to authenticated using (public.is_admin());
grant select on public.webhook_events to authenticated;

-- Avis : publics (sauf masqués), modération admin
create policy reviews_select on public.reviews for select to anon, authenticated
  using (not is_hidden or reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.is_admin());
create policy reviews_admin_update on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.reviews to anon, authenticated;
grant update (is_hidden) on public.reviews to authenticated;

-- Signalements
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

-- Litiges
create policy disputes_select on public.disputes for select to authenticated
  using (opened_by = auth.uid() or against_id = auth.uid() or public.is_admin());
grant select on public.disputes to authenticated;

-- Favoris
create policy favorites_own on public.favorites for select to authenticated using (user_id = auth.uid());
create policy favorites_insert on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy favorites_delete on public.favorites for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.favorites to authenticated;
grant insert (user_id, target_type, target_id) on public.favorites to authenticated;

-- Vérifications d'identité
create policy verification_select on public.verification_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy verification_insert on public.verification_requests for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('worker') and public.is_active_user()
              and document_path like auth.uid()::text || '/%');
grant select on public.verification_requests to authenticated;
grant insert (user_id, document_type, document_path, note) on public.verification_requests to authenticated;

-- Audit & contact : administrateurs uniquement (écriture serveur)
create policy audit_logs_admin on public.audit_logs for select to authenticated using (public.is_admin());
grant select on public.audit_logs to authenticated;

create policy contact_admin_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.contact_messages to authenticated;
grant update (status) on public.contact_messages to authenticated;

-- rate_limits : aucun accès client (service_role uniquement)

-- ---------------------------------------------------------------------------
-- 4. Droits d'exécution des fonctions
-- ---------------------------------------------------------------------------
grant execute on function
  public.has_role(public.app_role), public.is_admin(), public.is_active_user(),
  public.is_conversation_member(uuid), public.is_job_party(uuid), public.can_message(uuid),
  public.search_jobs(double precision, double precision, double precision, text, text, text, bigint, bigint,
                     public.work_mode, double precision, double precision, double precision, double precision,
                     text, integer, integer),
  public.nearby_workers(double precision, double precision, double precision, text, integer),
  public.public_stats(), public.compute_commission(bigint, numeric), public.approx_point(extensions.geography)
to anon, authenticated;

grant execute on function
  public.my_role(),
  public.start_conversation(uuid, uuid), public.mark_conversation_read(uuid),
  public.publish_job(uuid), public.cancel_job(uuid, text),
  public.apply_to_job(uuid, text, bigint), public.withdraw_application(uuid),
  public.accept_application(uuid), public.reject_application(uuid, text),
  public.respond_to_contract(uuid, boolean), public.submit_completion(uuid, text, text[]),
  public.request_changes(uuid, text), public.validate_completion(uuid),
  public.open_dispute(uuid, text, text), public.submit_review(uuid, smallint, text),
  public.get_contact_info(uuid), public.mark_notifications_read(uuid[]),
  public.create_payment_intent(uuid, text, text), public.cancel_payment_intent(uuid),
  public.record_payout(uuid, boolean, text), public.admin_refund_payment(uuid, text),
  public.set_my_location(double precision, double precision, text, text, text),
  public.client_dashboard_stats(), public.worker_dashboard_stats(), public.admin_stats(),
  public.admin_set_suspension(uuid, boolean, text), public.admin_set_worker_verified(uuid, boolean),
  public.admin_review_verification(uuid, boolean, text), public.admin_moderate_job(uuid, boolean, text),
  public.admin_update_report(uuid, public.report_status, text),
  public.admin_resolve_dispute(uuid, public.dispute_status, text),
  public.admin_set_setting(text, jsonb), public.log_audit(text, text, text, jsonb)
to authenticated;

-- Réservées au service_role (webhooks, rate limiting, maintenance, attribution admin) :
-- confirm_payment, fail_payment, attach_payment_reference, check_rate_limit, purge_expired_data,
-- grant_admin, _notify, _log_event, _audit, _ensure_conversation, _system_message.

-- ---------------------------------------------------------------------------
-- 5. Storage : buckets et politiques par dossier (premier segment = propriétaire)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('job-images', 'job-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-attachments', 'message-attachments', false, 10485760,
     array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('proofs', 'proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('verifications', 'verifications', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "joblink public read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'job-images'));

create policy "joblink own folder write" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'job-images', 'proofs', 'verifications')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "joblink own folder update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'job-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "joblink own folder delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'job-images', 'proofs', 'verifications')
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Pièces jointes : <conversation_id>/<user_id>/<fichier>
create policy "joblink attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments'
         and public.is_conversation_member(((storage.foldername(name))[1])::uuid));
create policy "joblink attachments write" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments'
              and (storage.foldername(name))[2] = auth.uid()::text
              and public.can_message(((storage.foldername(name))[1])::uuid));

-- Preuves : <worker_id>/<contract_id>/<fichier>, lisibles par les parties du contrat
create policy "joblink proofs read" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
    or exists (select 1 from public.contracts c
               where c.id::text = (storage.foldername(name))[2] and c.client_id = auth.uid())));

-- Pièces d'identité : propriétaire et admin uniquement
create policy "joblink verifications read" on storage.objects for select to authenticated
  using (bucket_id = 'verifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------------
-- 6. Realtime (RLS appliquée aux abonnements)
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null; end $$;
