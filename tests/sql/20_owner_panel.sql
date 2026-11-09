-- Tests du tableau de bord propriétaire (/admin/joblink) : clé serveur, mot de passe haché,
-- verrouillage, sessions, données et actions. Valeurs de TEST uniquement.

\set key '''test-server-key-0123456789abcdef0123456789abcdef'''
\set pwd '''Mot-de-passe-de-test-42!'''

-- Configuration (en production : faite hors dépôt, mot de passe jamais en clair)
insert into owner_panel.config (id, password_hash, server_key_hash)
values (1, extensions.crypt(:pwd, extensions.gen_salt('bf', 8)), owner_panel._sha256(:key))
on conflict (id) do update set password_hash = excluded.password_hash, server_key_hash = excluded.server_key_hash;

select tests.ok((select password_hash from owner_panel.config) not like '%Mot-de-passe%', 'mot de passe stocké uniquement haché (bcrypt)');

-- Le rôle anon n'a aucun accès direct aux tables du panneau
set role anon;
select tests.throws('select * from owner_panel.config', 'permission denied', 'anon ne lit pas la config');
select tests.throws('select * from owner_panel.sessions', 'permission denied', 'anon ne lit pas les sessions');
-- Sans la clé serveur, l'API est inutilisable même avec le bon mot de passe
select tests.throws($q$select public.owner_panel_login('mauvaise-cle-mauvaise-cle-mauvaise-cle', 'Mot-de-passe-de-test-42!')$q$, 'FORBIDDEN', 'clé serveur requise');
select tests.throws($q$select public.owner_panel_overview(null, 'x')$q$, 'FORBIDDEN', 'overview sans clé refusé');
-- Mauvais mot de passe
select tests.ok((public.owner_panel_login(:key, 'faux', '1.2.3.4') ->> 'error') = 'INVALID_PASSWORD', 'mauvais mot de passe refusé');
-- Session invalide
select tests.throws($q$select public.owner_panel_overview('test-server-key-0123456789abcdef0123456789abcdef', 'jeton-bidon')$q$, 'SESSION_EXPIRED', 'jeton invalide refusé');
select tests.ok(public.owner_panel_session_valid(:key, 'jeton-bidon') = false, 'session_valid = false pour un jeton bidon');
reset role;

-- Connexion valide
set role anon;
select (public.owner_panel_login(:key, :pwd, '9.9.9.9', 'test')) as login \gset
reset role;
select tests.ok((:'login'::jsonb ->> 'ok')::boolean, 'bon mot de passe accepté');
select (:'login'::jsonb ->> 'token') as tok \gset
select tests.ok(not exists (select 1 from owner_panel.sessions where token_hash = :'tok'), 'jeton stocké haché, jamais en clair');

set role anon;
select tests.ok(public.owner_panel_session_valid(:key, :'tok'), 'session valide');
select tests.ok((public.owner_panel_overview(:key, :'tok') -> 'kpis' ->> 'users')::int >= 1, 'overview renvoie les KPI');
select tests.ok(jsonb_array_length(public.owner_panel_overview(:key, :'tok') -> 'series') = 30, 'série sur 30 jours');
select tests.ok((public.owner_panel_users(:key, :'tok', 'demo', 10, 0) ->> 'total')::int >= 0, 'liste des utilisateurs');
reset role;

-- Action : suspension puis réactivation d'un utilisateur, journalisées
select id as uid from public.profiles where deleted_at is null order by created_at limit 1 \gset
set role anon;
select public.owner_panel_set_suspension(:key, :'tok', :'uid'::uuid, true, 'test');
reset role;
select tests.ok((select is_suspended from public.profiles where id = :'uid'::uuid), 'utilisateur suspendu');
set role anon;
select public.owner_panel_set_suspension(:key, :'tok', :'uid'::uuid, false);
reset role;
select tests.ok(not (select is_suspended from public.profiles where id = :'uid'::uuid), 'utilisateur réactivé');
select tests.ok((select count(*) from public.audit_logs where action like 'owner_panel.user_%') = 2, 'actions journalisées');

-- Déconnexion : le jeton ne fonctionne plus
set role anon;
select public.owner_panel_logout(:key, :'tok');
select tests.ok(public.owner_panel_session_valid(:key, :'tok') = false, 'session révoquée après déconnexion');
reset role;

-- Verrouillage après 5 échecs pour une même IP (même avec le bon mot de passe ensuite)
set role anon;
select public.owner_panel_login(:key, 'faux', '5.5.5.5') from generate_series(1, 5);
select tests.ok((public.owner_panel_login(:key, :pwd, '5.5.5.5') ->> 'error') = 'LOCKED', 'verrouillage après 5 échecs');
select tests.ok((public.owner_panel_login(:key, :pwd, '6.6.6.6') ->> 'ok')::boolean, 'une autre IP reste autorisée');
reset role;
