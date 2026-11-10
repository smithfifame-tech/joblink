-- Annonce du site : lecture publique filtrée, écriture réservée à la session propriétaire.
\set key '''test-server-key-0123456789abcdef0123456789abcdef'''
\set pwd '''Mot-de-passe-de-test-42!'''

set role anon;
select tests.throws('select * from public.site_announcement', 'permission denied', 'anon ne lit pas la table des annonces');
select tests.ok(public.public_announcement() is null, 'aucune annonce publique par défaut');
select tests.throws($q$select public.owner_panel_set_announcement('test-server-key-0123456789abcdef0123456789abcdef', 'jeton-bidon', 'x', 'info', null, null, true, null)$q$, 'SESSION_EXPIRED', 'annonce sans session refusée');
select (public.owner_panel_login(:key, :pwd, '7.7.7.8', 'test') ->> 'token') as tok \gset
select tests.throws(format($q$select public.owner_panel_set_announcement('test-server-key-0123456789abcdef0123456789abcdef', %L, 'x', 'info', 'https://pirate.example', null, true, null)$q$, :'tok'), 'INVALID_ANNOUNCEMENT', 'lien externe refusé');
select tests.throws(format($q$select public.owner_panel_set_announcement('test-server-key-0123456789abcdef0123456789abcdef', %L, '', 'info', null, null, true, null)$q$, :'tok'), 'INVALID_ANNOUNCEMENT', 'annonce active vide refusée');
select tests.throws(format($q$select public.owner_panel_set_announcement('test-server-key-0123456789abcdef0123456789abcdef', %L, 'x', 'rouge', null, null, true, null)$q$, :'tok'), 'INVALID_ANNOUNCEMENT', 'ton invalide refusé');

select public.owner_panel_set_announcement(:key, :'tok', '  Bienvenue   sur JOBLINK ', 'success', '/jobs', null, true, 24);
select tests.ok(public.public_announcement() ->> 'message' = 'Bienvenue sur JOBLINK', 'annonce publiée et nettoyée');
select tests.ok(public.public_announcement() ->> 'link_label' = 'En savoir plus', 'libellé du lien par défaut');
select tests.ok((public.owner_panel_get_announcement(:key, :'tok') ->> 'visible')::boolean, 'le propriétaire voit l''annonce comme visible');
reset role;

update public.site_announcement set expires_at = now() - interval '1 minute';
set role anon;
select tests.ok(public.public_announcement() is null, 'annonce expirée : plus affichée');
select public.owner_panel_set_announcement(:key, :'tok', 'Bienvenue', 'info', null, null, false, null);
select tests.ok(public.public_announcement() is null, 'annonce désactivée : plus affichée');
reset role;
select tests.ok((select count(*) from public.audit_logs where action like 'owner.announcement_%') >= 2, 'changements d''annonce journalisés');
