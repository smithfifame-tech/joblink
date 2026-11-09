-- API serveur à privilèges minimaux : clé serveur obligatoire, idempotence des webhooks.
\set k '''test-internal-key-0123456789abcdef0123456789abcdef'''
insert into server_api.config (id, key_hash)
values (1, encode(extensions.digest(convert_to(:k, 'UTF8'), 'sha256'), 'hex'))
on conflict (id) do update set key_hash = excluded.key_hash;

set role anon;
select tests.throws($q$select * from server_api.config$q$, 'permission denied', 'anon ne lit pas la config serveur');
select tests.throws($q$select public.srv_check_rate_limit('mauvaise-cle-mauvaise-cle-mauvaise-cle-xx', 'x', 1, 60)$q$, 'FORBIDDEN', 'clé serveur requise');
select tests.throws($q$select public.confirm_payment(gen_random_uuid(), 'x')$q$, 'permission denied', 'confirm_payment reste inaccessible directement');
select tests.ok(public.srv_check_rate_limit(:k, 'test:rl', 2, 60), 'limite 1/2');
select tests.ok(public.srv_check_rate_limit(:k, 'test:rl', 2, 60), 'limite 2/2');
select tests.ok(not public.srv_check_rate_limit(:k, 'test:rl', 2, 60), 'limite dépassée');
select tests.ok((public.srv_webhook_begin(:k, 'sandbox', 'evt-srv-1', 'succeeded', '{}') ->> 'duplicate')::boolean = false, 'premier webhook enregistré');
select tests.ok((public.srv_webhook_begin(:k, 'sandbox', 'evt-srv-1', 'succeeded', '{}') ->> 'duplicate')::boolean = true, 'doublon de webhook détecté (idempotence)');
select tests.ok(public.srv_find_payment(:k, 'sandbox', 'reference-inexistante') is null, 'paiement inconnu : null');
select public.srv_insert_contact(:k, 'Test', 'test@demo.joblink.test', 'Sujet test', 'Message de test assez long.');
reset role;
select tests.ok(exists (select 1 from public.contact_messages where email = 'test@demo.joblink.test'), 'message de contact enregistré');
