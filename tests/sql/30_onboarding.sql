-- Inscription Google : profil incomplet, puis finalisation unique (rôle client/travailleur, jamais admin).

\set g1 '''77777777-7777-4777-8777-777777777771'''
insert into auth.users (id, email, raw_user_meta_data)
values (:g1, 'google.user@demo.joblink.test', '{"full_name":"Akouavi Marie Dossou","email_verified":true}');

select tests.ok((select first_name from public.profiles where id = :g1) = 'Akouavi', 'prénom extrait du nom Google');
select tests.ok((select last_name from public.profiles where id = :g1) = 'Marie Dossou', 'nom extrait du nom Google');
select tests.ok((select terms_accepted_at from public.profiles where id = :g1) is null, 'compte Google incomplet (CGU non acceptées)');

select tests.login(null);
set role anon;
select tests.throws($q$select public.complete_onboarding('client','A','B','+22997000000','BJ','Cotonou','Akpakpa')$q$, 'permission denied', 'anon ne peut pas finaliser');
reset role;

select tests.login(:g1);
set role authenticated;
select tests.throws($q$select public.complete_onboarding('admin','A','B','+22997000000','BJ','Cotonou','Akpakpa')$q$, 'INVALID_ACCOUNT_TYPE', 'rôle admin refusé');
select tests.throws($q$select public.complete_onboarding('worker','A','B','12345','BJ','Cotonou','Akpakpa')$q$, 'INVALID_PHONE', 'téléphone invalide refusé');
select public.complete_onboarding('worker', 'Akouavi', 'Dossou', '+22997112233', 'BJ', 'Cotonou', 'Fidjrossè');
reset role;

select tests.ok((select terms_accepted_at from public.profiles where id = :g1) is not null, 'CGU acceptées à la finalisation');
select tests.ok(exists (select 1 from public.user_roles where user_id = :g1 and role = 'worker'), 'rôle travailleur attribué');
select tests.ok(not exists (select 1 from public.user_roles where user_id = :g1 and role = 'client'), 'rôle client retiré pour un compte neuf');
select tests.ok(not exists (select 1 from public.user_roles where user_id = :g1 and role = 'admin'), 'jamais admin');
select tests.ok(exists (select 1 from public.worker_profiles where user_id = :g1), 'profil travailleur créé');

set role authenticated;
select tests.throws($q$select public.complete_onboarding('client','A','B','+22997000000','BJ','Cotonou','Akpakpa')$q$, 'ALREADY_ONBOARDED', 'finalisation unique');
reset role;
select tests.login(null);
