-- Incidents techniques : signalement protégé par la clé serveur, dédoublonnage,
-- consultation et décision réservées à la session propriétaire.
\set k '''test-internal-key-0123456789abcdef0123456789abcdef'''
\set key '''test-server-key-0123456789abcdef0123456789abcdef'''
\set pwd '''Mot-de-passe-de-test-42!'''

set role anon;
select tests.throws('select * from public.incidents', 'permission denied', 'anon ne lit pas les incidents');
select tests.throws($q$select public.srv_report_incident('mauvaise-cle-mauvaise-cle-mauvaise-cle-xx', 'fp-00000001', 'client', 'normal', 'x')$q$, 'FORBIDDEN', 'signalement sans clé refusé');
select tests.throws($q$select public.srv_report_incident('test-internal-key-0123456789abcdef0123456789abcdef', 'fp-00000001', 'pirate', 'normal', 'x')$q$, 'INVALID_INCIDENT', 'source invalide refusée');

select public.srv_report_incident(:k, 'fp-test-0001', 'client', 'normal', 'TypeError sur /jobs', 'détail', '/jobs');
select public.srv_report_incident(:k, 'fp-test-0001', 'server', 'high', 'TypeError sur /jobs', null, '/jobs');
select public.srv_report_incident(:k, 'fp-test-0002', 'monitor', 'critical', 'Site inaccessible', null, '/');
select tests.throws($q$select public.owner_panel_incidents('test-server-key-0123456789abcdef0123456789abcdef', 'jeton-bidon')$q$, 'SESSION_EXPIRED', 'consultation sans session refusée');
reset role;

select tests.ok((select occurrences from public.incidents where fingerprint = 'fp-test-0001') = 2, 'même incident dédoublonné (compteur = 2)');
select tests.ok((select severity from public.incidents where fingerprint = 'fp-test-0001') = 'high', 'gravité relevée au niveau le plus haut');
select tests.ok((select details from public.incidents where fingerprint = 'fp-test-0001') = 'détail', 'détail conservé');

-- Session propriétaire (config créée par 20_owner_panel.sql)
select id as inc from public.incidents where fingerprint = 'fp-test-0001' \gset
set role anon;
select (public.owner_panel_login(:key, :pwd, '7.7.7.7', 'test') ->> 'token') as tok \gset
select tests.ok(jsonb_array_length(public.owner_panel_incidents(:key, :'tok') -> 'items') >= 2, 'le propriétaire voit les incidents');
select tests.ok((public.owner_panel_incidents(:key, :'tok') -> 'counts' ->> 'critical')::int >= 1, 'compteur des incidents critiques');
select public.owner_panel_set_incident(:key, :'tok', :'inc', 'approve');
select tests.throws($q$select public.owner_panel_set_incident('test-server-key-0123456789abcdef0123456789abcdef', 'jeton-bidon', gen_random_uuid(), 'approve')$q$, 'SESSION_EXPIRED', 'décision sans session refusée');
reset role;
select tests.ok((select status from public.incidents where fingerprint = 'fp-test-0001') = 'approved', 'incident autorisé pour l''IA');
select tests.ok((select approved_at is not null from public.incidents where fingerprint = 'fp-test-0001'), 'date d''autorisation enregistrée');

-- Un incident résolu qui revient plus d'une heure après est rouvert
update public.incidents set status = 'resolved', resolved_at = now() - interval '2 hours' where fingerprint = 'fp-test-0001';
select public.srv_report_incident(:k, 'fp-test-0001', 'client', 'normal', 'TypeError sur /jobs');
select tests.ok((select status from public.incidents where fingerprint = 'fp-test-0001') = 'open', 'incident résolu qui revient : rouvert');
-- Un incident ignoré reste ignoré
update public.incidents set status = 'dismissed' where fingerprint = 'fp-test-0002';
select public.srv_report_incident(:k, 'fp-test-0002', 'monitor', 'critical', 'Site inaccessible');
select tests.ok((select status from public.incidents where fingerprint = 'fp-test-0002') = 'dismissed', 'incident ignoré : reste ignoré');
