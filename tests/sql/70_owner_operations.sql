-- Tableau de bord propriétaire : missions, fiche utilisateur, paiements, litiges, vérifications.
\set key '''test-server-key-0123456789abcdef0123456789abcdef'''
\set pwd '''Mot-de-passe-de-test-42!'''

-- Données de test : une demande de vérification en attente
insert into public.verification_requests (user_id, document_type, document_path)
select w.user_id, 'cni', w.user_id || '/cni.jpg' from public.worker_profiles w
 where not exists (select 1 from public.verification_requests v where v.user_id = w.user_id and v.status = 'pending')
 limit 1;
select id as vreq from public.verification_requests where status = 'pending' limit 1 \gset
select id as anyuser from public.profiles where deleted_at is null order by created_at limit 1 \gset

set role anon;
select tests.throws($q$select public.owner_panel_jobs('test-server-key-0123456789abcdef0123456789abcdef', 'jeton-bidon')$q$, 'SESSION_EXPIRED', 'missions sans session refusées');
select tests.throws($q$select public.owner_panel_payments('mauvaise-cle', 'x')$q$, 'FORBIDDEN', 'paiements sans clé refusés');
select tests.throws($q$select public._resolve_dispute(gen_random_uuid(), 'closed', 'xxxxx', null)$q$, 'permission denied', 'cœur des litiges non exposé');
select tests.throws($q$select public._review_verification(gen_random_uuid(), true, null, null)$q$, 'permission denied', 'cœur des vérifications non exposé');

select (public.owner_panel_login(:key, :pwd, '7.7.7.9', 'test') ->> 'token') as tok \gset

-- Missions
select tests.ok((public.owner_panel_jobs(:key, :'tok', null, null, 5, 0) ->> 'total')::int >= 1, 'liste des missions');
select tests.ok(jsonb_array_length(public.owner_panel_jobs(:key, :'tok', null, null, 1, 0) -> 'items') = 1, 'pagination des missions');
select tests.ok((public.owner_panel_jobs(:key, :'tok', 'zzz-introuvable-zzz', null, 5, 0) ->> 'total')::int = 0, 'recherche de missions');
select tests.ok((public.owner_panel_jobs(:key, :'tok', null, 'completed', 50, 0) -> 'items') @> '[{"status":"completed"}]'
                or (public.owner_panel_jobs(:key, :'tok', null, 'completed', 50, 0) ->> 'total')::int = 0, 'filtre par statut');

-- Fiche utilisateur
select tests.ok((public.owner_panel_user_detail(:key, :'tok', :'anyuser'::uuid) -> 'profile' ->> 'id') = :'anyuser', 'fiche utilisateur');
select tests.throws(format($q$select public.owner_panel_user_detail('test-server-key-0123456789abcdef0123456789abcdef', %L, gen_random_uuid())$q$, :'tok'), 'USER_NOT_FOUND', 'utilisateur inconnu');

-- Paiements et versement
select tests.ok((public.owner_panel_payments(:key, :'tok', 'payout', 10, 0) -> 'summary' ->> 'payout')::int >= 1, 'versements à effectuer comptés');
select (public.owner_panel_payments(:key, :'tok', 'payout', 1, 0) -> 'items' -> 0 ->> 'id') as pay \gset
select tests.throws(format($q$select public.owner_panel_record_payout('test-server-key-0123456789abcdef0123456789abcdef', %L, %L, ' ')$q$, :'tok', :'pay'), 'INVALID_REFERENCE', 'référence de versement exigée');
select public.owner_panel_record_payout(:key, :'tok', :'pay'::uuid, 'MOMO-TEST-001');
reset role;
select tests.ok((select payout_status = 'completed' and payout_reference = 'MOMO-TEST-001' from public.payments where id = :'pay'), 'versement enregistré');
set role anon;

-- Litiges (le seul litige de test a déjà été résolu)
select tests.ok(jsonb_array_length(public.owner_panel_disputes(:key, :'tok', true)) >= 1, 'historique des litiges');
reset role;
select id as disp from public.disputes limit 1 \gset
set role anon;
select tests.throws(format($q$select public.owner_panel_resolve_dispute('test-server-key-0123456789abcdef0123456789abcdef', %L, %L, 'closed', 'Déjà traité')$q$, :'tok', :'disp'), 'INVALID_TRANSITION', 'litige clos non modifiable');
select tests.throws(format($q$select public.owner_panel_resolve_dispute('test-server-key-0123456789abcdef0123456789abcdef', %L, %L, 'closed', 'x')$q$, :'tok', :'disp'), 'NOTE_REQUIRED', 'décision motivée exigée');

-- Vérifications
select tests.ok(jsonb_array_length(public.owner_panel_verifications(:key, :'tok')) >= 1, 'vérifications en attente listées');
select tests.throws(format($q$select public.owner_panel_review_verification('test-server-key-0123456789abcdef0123456789abcdef', %L, %L, false, null)$q$, :'tok', :'vreq'), 'NOTE_REQUIRED', 'refus motivé exigé');
select public.owner_panel_review_verification(:key, :'tok', :'vreq'::uuid, true, null);
reset role;
select tests.ok((select status = 'approved' from public.verification_requests where id = :'vreq'), 'vérification approuvée');
select tests.ok((select w.is_verified from public.worker_profiles w join public.verification_requests v on v.user_id = w.user_id where v.id = :'vreq'), 'badge vérifié attribué');
select tests.ok((select count(*) from public.audit_logs where action in ('owner_panel.payout_recorded', 'owner_panel.verification_reviewed')) = 2, 'actions propriétaire journalisées');
