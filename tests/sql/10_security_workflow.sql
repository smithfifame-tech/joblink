-- Tests d'intégration SQL : RLS, privilèges, workflow missions, paiements, messagerie, géo, admin.
-- Exécutés par scripts/db-test.sh sur une base locale PostgreSQL + PostGIS.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'ÉCHEC : %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create or replace function tests.throws(q text, expected text, msg text) returns void language plpgsql as $$
declare raised boolean := false;
begin
  begin
    execute q;
  exception when others then
    raised := true;
    if sqlerrm not ilike '%' || expected || '%' then
      raise exception 'ÉCHEC : % — erreur inattendue « % » (attendu « % »)', msg, sqlerrm, expected;
    end if;
  end;
  if not raised then raise exception 'ÉCHEC : % — aucune erreur levée (attendu « % »)', msg, expected; end if;
  raise notice 'ok - %', msg;
end $$;

create or replace function tests.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

\set c1 '''11111111-1111-4111-8111-111111111111'''
\set c2 '''22222222-2222-4222-8222-222222222222'''
\set w1 '''33333333-3333-4333-8333-333333333333'''
\set w2 '''44444444-4444-4444-8444-444444444444'''
\set a1 '''55555555-5555-4555-8555-555555555555'''
\set job1 '''66666666-6666-4666-8666-666666666661'''
\set job2 '''66666666-6666-4666-8666-666666666662'''
\set job3 '''66666666-6666-4666-8666-666666666663'''

-- ---------------------------------------------------------------- Rôles à l'inscription
select tests.ok((select count(*) = 2 from public.user_roles where user_id = :a1), 'admin@demo : client (trigger) + admin (grant_admin)');
insert into auth.users (id, email, raw_user_meta_data)
values ('77777777-7777-4777-8777-777777777777', 'hacker@demo.joblink.test',
        '{"first_name":"X","last_name":"Y","account_type":"admin","phone":"bad"}');
select tests.ok((select array_agg(role::text) = array['client'] from public.user_roles
                 where user_id = '77777777-7777-4777-8777-777777777777'), 'account_type=admin ignoré à l''inscription');
select tests.ok((select phone is null from public.profiles where id = '77777777-7777-4777-8777-777777777777'),
                'téléphone invalide non enregistré');
select tests.ok((select count(*) = 1 from public.worker_profiles where user_id = :w1), 'profil travailleur créé automatiquement');
select tests.ok(public.compute_commission(10000, 0.05) = 500, 'commission 5 % de 10 000 = 500');
select tests.ok(public.compute_commission(9999, 0.05) = 500, 'commission arrondie au franc');

-- ---------------------------------------------------------------- Accès anonyme
select tests.login(null);
set role anon;
select tests.ok((select count(*) = 3 from public.public_jobs), 'anon voit les 3 missions publiques');
select tests.ok((select count(*) = 0 from public.public_jobs where approx_lat::text like '%.%___'),
                'coordonnées publiques arrondies (≤ 2 décimales)');
select tests.throws('select * from public.jobs', 'permission denied', 'anon ne lit pas la table jobs');
select tests.throws('select email from public.profiles', 'permission denied', 'anon ne lit pas les profils');
select tests.throws('select * from public.payments', 'permission denied', 'anon ne lit pas les paiements');
select tests.ok((select count(*) >= 1 from public.categories), 'anon lit les catégories');
select tests.ok((select count(*) = 0 from public.public_profiles where account_type is null and id = :w1), 'vue publique profils');
reset role;

-- ---------------------------------------------------------------- Isolation des données
select tests.login(:w1);
set role authenticated;
select tests.ok((select count(*) = 0 from public.profiles where id = :c1), 'w1 ne voit pas le profil privé de c1');
select tests.ok((select count(*) = 1 from public.profiles where id = :w1), 'w1 voit son profil');
select tests.throws($$insert into public.user_roles (user_id, role) values ('33333333-3333-4333-8333-333333333333', 'admin')$$,
                    'permission denied', 'impossible de s''attribuer un rôle');
select tests.throws($$update public.profiles set is_suspended = false where id = auth.uid()$$,
                    'permission denied', 'colonne is_suspended non modifiable');
select tests.throws($$update public.worker_profiles set is_verified = true where user_id = auth.uid()$$,
                    'permission denied', 'badge vérifié non modifiable');
update public.worker_profiles set headline = 'Plombier certifié' where user_id = auth.uid();
select tests.ok((select headline = 'Plombier certifié' from public.worker_profiles where user_id = :w1), 'w1 modifie son profil pro');
select tests.throws($$insert into public.jobs (client_id, category_id, title, description, budget_amount, start_date, deadline, city, neighborhood, work_mode)
  select auth.uid(), id, 'Titre de mission valide', repeat('Description assez longue. ', 3), 5000, current_date, current_date + 1, 'Cotonou', 'Akpakpa', 'remote'
  from public.categories limit 1$$, 'row-level security', 'un travailleur ne publie pas de mission');
select tests.ok((select count(*) = 0 from public.user_locations where user_id <> auth.uid()), 'positions des autres invisibles');
select tests.throws('select location from public.user_locations', 'permission denied', 'position exacte non lisible même pour soi via API');
reset role;

-- ---------------------------------------------------------------- Publication / modification
select tests.login(:c1);
set role authenticated;
select tests.throws($$update public.jobs set status = 'completed' where id = '66666666-6666-4666-8666-666666666661'$$,
                    'permission denied', 'statut non modifiable directement');
update public.jobs set budget_amount = 9000 where id = :job1;
select tests.ok((select budget_amount = 9000 from public.jobs where id = :job1), 'client modifie sa mission non attribuée');
select tests.ok((select count(*) = 1 from public.contract_events where job_id = :job1 and event_type = 'job.updated'),
                'modification historisée');
select tests.throws($$select public.apply_to_job('66666666-6666-4666-8666-666666666662', repeat('Je suis motivé. ', 3), null)$$,
                    'WORKER_ROLE_REQUIRED', 'un client ne candidate pas');
reset role;

-- ---------------------------------------------------------------- Candidatures
select tests.login(:w1);
set role authenticated;
select tests.ok(public.apply_to_job(:job1, repeat('Je suis disponible demain matin. ', 2), 8000) is not null, 'w1 candidate avec proposition de prix');
select tests.throws($$select public.apply_to_job('66666666-6666-4666-8666-666666666661', repeat('Encore une candidature. ', 2), null)$$,
                    'ALREADY_APPLIED', 'pas de double candidature');
select tests.throws($$select public.apply_to_job('66666666-6666-4666-8666-666666666663', repeat('Je propose un prix. ', 2), 9000)$$,
                    'PRICE_PROPOSAL_NOT_ALLOWED', 'proposition de prix refusée si non autorisée');
select tests.ok(public.apply_to_job(:job3, repeat('Je peux faire le ménage. ', 2), null) is not null, 'w1 candidate à job3');
reset role;

select tests.login(:w2);
set role authenticated;
select tests.ok((select count(*) = 0 from public.applications), 'w2 ne voit pas les candidatures des autres');
select tests.ok(public.apply_to_job(:job1, repeat('Je suis aussi disponible. ', 2), null) is not null, 'w2 candidate à job1');
reset role;

select tests.login(:c2);
set role authenticated;
select tests.ok((select count(*) = 0 from public.applications where job_id = :job1), 'c2 ne voit pas les candidatures de c1');
select tests.throws($$select public.accept_application((select id from public.applications limit 1))$$,
                    'APPLICATION_NOT_FOUND', 'c2 ne peut pas accepter pour c1');
reset role;

select tests.login(:c1);
set role authenticated;
select tests.ok((select count(*) = 2 from public.applications where job_id = :job1), 'c1 voit les 2 candidatures');
select tests.ok((select status = 'reviewing' from public.jobs where id = :job1), 'mission passée en reviewing');
select tests.ok(public.accept_application((select id from public.applications where job_id = :job1 and worker_id = :w1)) is not null,
                'c1 accepte w1');
select tests.ok((select status = 'assigned' from public.jobs where id = :job1), 'mission attribuée (1 travailleur)');
select tests.ok((select status = 'rejected' from public.applications where job_id = :job1 and worker_id = :w2), 'autre candidature refusée auto');
select tests.ok((select agreed_amount = 8000 from public.contracts where job_id = :job1), 'montant convenu = prix proposé');
reset role;

select tests.login(:w2);
set role authenticated;
select tests.throws($$select public.apply_to_job('66666666-6666-4666-8666-666666666661', repeat('Tentative tardive. ', 2), null)$$,
                    'JOB_NOT_OPEN', 'mission attribuée : plus aucune candidature');
select tests.throws($$select public.respond_to_contract((select id from public.contracts limit 1), true)$$,
                    'CONTRACT_NOT_FOUND', 'w2 ne voit/accepte pas le contrat de w1');
select tests.ok((select count(*) >= 1 from public.notifications where type = 'application_rejected'), 'w2 notifié du refus');
reset role;

-- ---------------------------------------------------------------- Exécution du contrat
select tests.login(:w1);
set role authenticated;
select tests.ok((select count(*) = 1 from public.notifications where type = 'application_accepted'), 'w1 notifié de l''acceptation');
select tests.ok((select address is not null from public.jobs where id = :job1), 'w1 (sous contrat) voit l''adresse exacte');
select public.respond_to_contract((select id from public.contracts where job_id = :job1), true);
select tests.ok((select status = 'in_progress' from public.jobs where id = :job1), 'mission en cours');
select tests.throws($$select public.submit_completion((select id from public.contracts where job_id = '66666666-6666-4666-8666-666666666661'), 'Fait', array['11111111-1111-4111-8111-111111111111/x.jpg'])$$,
                    'INVALID_PROOF_PATH', 'preuve hors dossier refusée');
select public.submit_completion((select id from public.contracts where job_id = :job1), 'Joint remplacé.',
       array['33333333-3333-4333-8333-333333333333/c/preuve.jpg']);
select tests.throws($$select public.validate_completion((select id from public.contracts where job_id = '66666666-6666-4666-8666-666666666661'))$$,
                    'CONTRACT_NOT_FOUND', 'le travailleur ne valide pas lui-même');
reset role;

select tests.login(:c1);
set role authenticated;
select tests.throws($$select public.create_payment_intent((select id from public.contracts where job_id = '66666666-6666-4666-8666-666666666661'), 'sandbox', 'key-000000000000001')$$,
                    'PAYMENT_NOT_ALLOWED', 'pas de paiement avant validation');
select public.validate_completion((select id from public.contracts where job_id = :job1));
select tests.ok((select status = 'completed' and archived_at is not null from public.jobs where id = :job1), 'mission terminée et archivée');
select tests.ok((select count(*) >= 6 from public.contract_events where job_id = :job1), 'historique complet des événements');

-- ---------------------------------------------------------------- Paiements
select tests.ok((select amount = 8000 and commission_amount = 400 and net_amount = 7600
                 from public.create_payment_intent((select id from public.contracts where job_id = :job1), 'sandbox', 'key-000000000000001')),
                'intention : 8 000 → commission 400, net 7 600');
select tests.ok((select count(*) = 1 from public.create_payment_intent((select id from public.contracts where job_id = :job1), 'sandbox', 'key-000000000000002')),
                'nouvelle clé : réutilise l''intention en cours (anti double paiement)');
select tests.ok((select count(*) = 1 from public.payments), 'un seul paiement créé');
select tests.throws($$select public.confirm_payment((select id from public.payments limit 1), 'ref', 0)$$,
                    'permission denied', 'le client ne peut pas confirmer un paiement');
reset role;

select tests.login(:w1);
set role authenticated;
select tests.throws($$select public.create_payment_intent((select id from public.contracts limit 1), 'sandbox', 'key-000000000000003')$$,
                    'CONTRACT_NOT_FOUND', 'le travailleur ne crée pas de paiement');
reset role;

set role service_role;
select public.attach_payment_reference((select id from public.payments), 'SBX-1', 'https://sandbox.local/checkout');
select tests.ok((select status = 'succeeded' and receipt_number like 'JL-%' from public.confirm_payment((select id from public.payments), 'SBX-1', 0)),
                'webhook : paiement confirmé + reçu');
select tests.ok((select status = 'succeeded' from public.confirm_payment((select id from public.payments), 'SBX-1', 0)), 'confirmation idempotente');
select tests.ok((select count(*) = 3 from public.transactions), 'écritures : charge, commission, versement');
reset role;

select tests.login(:c1);
set role authenticated;
select tests.throws($$select public.create_payment_intent((select id from public.contracts where job_id = '66666666-6666-4666-8666-666666666661'), 'sandbox', 'key-000000000000009')$$,
                    'ALREADY_PAID', 'double paiement impossible');
select tests.ok((select (public.client_dashboard_stats()->>'spent')::bigint = 8000), 'tableau de bord client : dépenses');
-- Avis
select tests.ok(public.submit_review((select id from public.contracts where job_id = :job1), 5::smallint, 'Excellent travail') is not null, 'c1 laisse un avis');
select tests.throws($$select public.submit_review((select id from public.contracts limit 1), 4::smallint, null)$$, 'ALREADY_REVIEWED', 'un seul avis par contrat');
reset role;
select tests.ok((select rating_avg = 5 and rating_count = 1 from public.worker_profiles where user_id = :w1), 'note moyenne recalculée');

-- ---------------------------------------------------------------- Messagerie
select id as conv1 from public.conversations limit 1 \gset
select tests.login(:w1);
set role authenticated;
select tests.ok((select count(*) = 1 from public.conversations), 'conversation créée à l''acceptation');
insert into public.messages (conversation_id, sender_id, body)
values ((select id from public.conversations limit 1), auth.uid(), 'Bonjour, je passe à 9 h.');
select tests.ok((select (public.worker_dashboard_stats()->>'earned')::bigint = 7600), 'tableau de bord travailleur : revenus nets');
reset role;

select tests.login(:c1);
set role authenticated;
select tests.ok((select count(*) = 1 from public.notifications where type = 'new_message' and read_at is null), 'c1 notifié du message');
select public.mark_conversation_read((select id from public.conversations limit 1));
select tests.ok((select count(*) = 0 from public.notifications where type = 'new_message' and read_at is null), 'lecture marque la notification lue');
insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), :w1);
reset role;

select tests.login(:w2);
set role authenticated;
select tests.ok((select count(*) = 0 from public.messages), 'w2 ne lit pas les messages des autres');
select tests.throws(format($$insert into public.messages (conversation_id, sender_id, body) values (%L, auth.uid(), 'spam')$$, :'conv1'),
                    'row-level security', 'w2 n''écrit pas dans une conversation tierce');
reset role;

select tests.login(:w1);
set role authenticated;
select tests.throws($$insert into public.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Re-bonjour' from public.conversations limit 1$$,
                    'row-level security', 'message bloqué après blocage');
reset role;

-- ---------------------------------------------------------------- Litige (job2)
select tests.login(:w2);
set role authenticated;
select public.apply_to_job(:job2, repeat('Je développe en Next.js. ', 2), 240000);
reset role;
select tests.login(:c2);
set role authenticated;
select public.accept_application((select id from public.applications where job_id = :job2));
reset role;
select tests.login(:w2);
set role authenticated;
select public.respond_to_contract((select id from public.contracts where job_id = :job2), true);
reset role;
select tests.login(:c2);
set role authenticated;
select tests.ok(public.open_dispute((select id from public.contracts where job_id = :job2), 'Délais non respectés', null) is not null, 'litige ouvert');
select tests.ok((select status = 'disputed' from public.jobs where id = :job2), 'mission en litige');
reset role;

-- ---------------------------------------------------------------- Administration
select tests.login(:w1);
set role authenticated;
select tests.throws('select public.admin_stats()', 'ADMIN_REQUIRED', 'w1 n''accède pas aux stats admin');
select tests.throws($$select public.admin_set_suspension('44444444-4444-4444-8444-444444444444', true, 'x')$$, 'ADMIN_REQUIRED', 'w1 ne suspend personne');
select tests.ok((select count(*) = 0 from public.audit_logs), 'w1 ne lit pas le journal d''audit');
reset role;

select tests.login(:a1);
set role authenticated;
select tests.ok((select (public.admin_stats()->>'commissions')::bigint = 400), 'stats admin : commissions');
select public.admin_resolve_dispute((select id from public.disputes), 'resolved_worker', 'Travail livré conforme.');
select tests.ok((select status = 'completed' from public.jobs where id = :job2), 'litige résolu → mission terminée');
select public.admin_set_suspension(:w2, true, 'Test de suspension');
select tests.ok((select count(*) >= 2 from public.audit_logs), 'actions admin journalisées');
select tests.ok((select count(*) >= 5 from public.profiles), 'admin lit tous les profils');
reset role;

select tests.login(:w2);
set role authenticated;
select tests.throws($$select public.apply_to_job('66666666-6666-4666-8666-666666666663', repeat('Compte suspendu. ', 2), null)$$,
                    'ACCOUNT_SUSPENDED', 'compte suspendu bloqué');
reset role;

-- ---------------------------------------------------------------- Géolocalisation
select tests.login(null);
set role anon;
select tests.ok((select count(*) = 1 from public.search_jobs(p_lat => 6.3700, p_lng => 2.3600, p_radius_km => 5)),
                'recherche 5 km autour de Fidjrossè : job3 uniquement (job1 terminé)');
select tests.ok((select count(*) = 0 from public.search_jobs(p_lat => 9.3370, p_lng => 2.6280, p_radius_km => 10)),
                'aucune mission dans un rayon de 10 km de Parakou');
select tests.ok((select count(*) = 1 and max(total_count) = 1 from public.search_jobs()), 'recherche sans filtre : seules les missions ouvertes');
select tests.ok((select count(*) = 1 from public.search_jobs(p_query => 'nettoyage')), 'recherche plein texte');
select tests.ok((select bool_and(distance_km is not null) from public.search_jobs(p_lat => 6.37, p_lng => 2.36, p_radius_km => 50)),
                'distance approximative calculée');
select tests.ok((select count(*) = 1 from public.nearby_workers(6.36, 2.43, 10)), 'travailleur consentant trouvé à proximité');
select tests.ok((select count(*) = 1 from public.search_jobs(p_west => 2.30, p_south => 6.30, p_east => 2.40, p_north => 6.40)),
                'recherche par emprise de carte');
reset role;

-- ---------------------------------------------------------------- Storage
select tests.login(:w1);
set role authenticated;
select tests.throws($$insert into storage.objects (bucket_id, name) values ('avatars', '11111111-1111-4111-8111-111111111111/a.png')$$,
                    'row-level security', 'impossible d''écrire dans le dossier d''un autre');
insert into storage.objects (bucket_id, name) values ('avatars', '33333333-3333-4333-8333-333333333333/a.png');
select tests.ok(true, 'écriture dans son propre dossier');
reset role;

select 'TOUS LES TESTS SQL SONT PASSÉS' as resultat;
