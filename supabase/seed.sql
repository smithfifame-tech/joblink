-- JOBLINK — Données de DÉMONSTRATION (environnement local uniquement : `supabase db reset`).
-- Toutes les données sont clairement identifiées : e-mails @demo.joblink.test et titres préfixés « [DÉMO] ».
-- Ce fichier n'est jamais appliqué à la base de production par `supabase db push`.
-- Mot de passe de tous les comptes de démo : Demo!Joblink2026

do $$
declare
  c1 uuid := '11111111-1111-4111-8111-111111111111';
  c2 uuid := '22222222-2222-4222-8222-222222222222';
  w1 uuid := '33333333-3333-4333-8333-333333333333';
  w2 uuid := '44444444-4444-4444-8444-444444444444';
  a1 uuid := '55555555-5555-4555-8555-555555555555';
  pw text := extensions.crypt('Demo!Joblink2026', extensions.gen_salt('bf'));
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (c1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client1@demo.joblink.test', pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"Démo","last_name":"Client Un","account_type":"client","phone":"+22990000001","city":"Cotonou","neighborhood":"Cadjèhoun","country_code":"BJ","terms_accepted":"true"}', now(), now()),
    (c2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client2@demo.joblink.test', pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"Démo","last_name":"Client Deux","account_type":"client","phone":"+22990000002","city":"Abomey-Calavi","neighborhood":"Godomey","country_code":"BJ","terms_accepted":"true"}', now(), now()),
    (w1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker1@demo.joblink.test', pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"Démo","last_name":"Travailleur Un","account_type":"worker","phone":"+22990000003","city":"Cotonou","neighborhood":"Akpakpa","country_code":"BJ","terms_accepted":"true"}', now(), now()),
    (w2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker2@demo.joblink.test', pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"Démo","last_name":"Travailleur Deux","account_type":"worker","phone":"+22990000004","city":"Porto-Novo","neighborhood":"Ouando","country_code":"BJ","terms_accepted":"true"}', now(), now()),
    -- Tentative d'élévation : account_type=admin doit être ignoré par le trigger (devient client)
    (a1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.joblink.test', pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"first_name":"Démo","last_name":"Admin","account_type":"admin","city":"Cotonou","neighborhood":"Haie Vive","country_code":"BJ","terms_accepted":"true"}', now(), now())
  on conflict (id) do nothing;

  -- Rôle admin attribué par la procédure administrative officielle
  perform public.grant_admin('admin@demo.joblink.test');

  update public.worker_profiles set headline = '[DÉMO] Plombier-électricien, 8 ans d''expérience',
    experience_years = 8, rate_min = 5000, rate_max = 25000, travel_radius_km = 15, show_on_map = true
   where user_id = w1;
  update public.worker_profiles set headline = '[DÉMO] Développeuse web Next.js',
    experience_years = 4, rate_min = 50000, rate_max = 300000, travel_radius_km = 50, show_on_map = true
   where user_id = w2;

  insert into public.worker_categories (worker_id, category_id)
  select w1, id from public.categories where slug in ('plomberie', 'electricite') on conflict do nothing;
  insert into public.worker_categories (worker_id, category_id)
  select w2, id from public.categories where slug in ('developpement', 'graphisme') on conflict do nothing;

  insert into public.user_locations (user_id, location, source, city, neighborhood) values
    (w1, 'SRID=4326;POINT(2.4612 6.3654)', 'manual', 'Cotonou', 'Akpakpa'),
    (w2, 'SRID=4326;POINT(2.6290 6.4969)', 'manual', 'Porto-Novo', 'Ouando')
  on conflict (user_id) do nothing;

  insert into public.jobs (id, client_id, category_id, title, description, skills_required, budget_amount,
                           pay_type, allow_price_proposal, start_date, deadline, city, neighborhood, address,
                           location, work_mode, workers_needed, status)
  select '66666666-6666-4666-8666-666666666661', c1, id,
         '[DÉMO] Réparation d''une fuite sous l''évier',
         'Données de démonstration. Fuite au niveau du siphon de l''évier de la cuisine, intervention rapide souhaitée avec fourniture du joint.',
         array['Réparation de fuites'], 10000, 'fixed', true, current_date, current_date + 7,
         'Cotonou', 'Cadjèhoun', 'Rue de démonstration', 'SRID=4326;POINT(2.3912 6.3571)', 'on_site', 1, 'published'
    from public.categories where slug = 'plomberie'
  on conflict (id) do nothing;

  insert into public.jobs (id, client_id, category_id, title, description, skills_required, budget_amount,
                           pay_type, allow_price_proposal, start_date, deadline, city, neighborhood,
                           location, work_mode, workers_needed, status)
  select '66666666-6666-4666-8666-666666666662', c2, id,
         '[DÉMO] Site vitrine pour une boutique',
         'Données de démonstration. Création d''un site vitrine de 5 pages avec formulaire de contact et intégration WhatsApp.',
         array['React / Next.js'], 250000, 'fixed', true, current_date + 2, current_date + 30,
         'Abomey-Calavi', 'Godomey', null, 'remote', 1, 'published'
    from public.categories where slug = 'developpement'
  on conflict (id) do nothing;

  insert into public.jobs (id, client_id, category_id, title, description, skills_required, budget_amount,
                           pay_type, allow_price_proposal, start_date, deadline, city, neighborhood, address,
                           location, work_mode, workers_needed, status)
  select '66666666-6666-4666-8666-666666666663', c1, id,
         '[DÉMO] Nettoyage complet d''un appartement',
         'Données de démonstration. Nettoyage d''un appartement de 3 pièces après déménagement, produits fournis.',
         array['Nettoyage'], 15000, 'fixed', false, current_date + 1, current_date + 10,
         'Cotonou', 'Fidjrossè', 'Adresse de démonstration', 'SRID=4326;POINT(2.3540 6.3720)', 'on_site', 2, 'published'
    from public.categories where slug = 'menage'
  on conflict (id) do nothing;
end $$;
