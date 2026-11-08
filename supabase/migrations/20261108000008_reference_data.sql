-- JOBLINK — 008 : données de référence nécessaires en production (catégories, compétences, paramètres)
-- Ce ne sont PAS des données de démonstration : elles structurent le catalogue.

insert into public.categories (slug, name, description, icon, sort_order) values
  ('plomberie', 'Plomberie', 'Fuites, installations sanitaires, chauffe-eau, canalisations.', 'wrench', 10),
  ('electricite', 'Électricité', 'Installations, dépannages, tableaux électriques, éclairage.', 'zap', 20),
  ('mecanique', 'Mécanique', 'Entretien et réparation de véhicules, motos et engins.', 'car', 30),
  ('menage', 'Ménage & entretien', 'Ménage à domicile, nettoyage de bureaux, repassage.', 'sparkles', 40),
  ('aide-domicile', 'Aide à domicile', 'Aide ménagère, accompagnement, garde d''enfants.', 'house', 50),
  ('livraison', 'Livraison & courses', 'Livraison de colis, courses, coursiers à moto.', 'bike', 60),
  ('jardinage', 'Jardinage', 'Entretien de jardins, taille, désherbage, plantations.', 'leaf', 70),
  ('maconnerie', 'Maçonnerie & BTP', 'Construction, carrelage, peinture, rénovation.', 'hammer', 80),
  ('menuiserie', 'Menuiserie', 'Meubles, portes, fenêtres, réparations bois et alu.', 'drill', 90),
  ('climatisation', 'Climatisation & froid', 'Installation et entretien de climatiseurs et réfrigérateurs.', 'snowflake', 100),
  ('developpement', 'Développement web & mobile', 'Sites web, applications, intégrations, maintenance.', 'code', 110),
  ('graphisme', 'Graphisme & design', 'Logos, affiches, identité visuelle, réseaux sociaux.', 'palette', 120),
  ('informatique', 'Dépannage informatique', 'Ordinateurs, réseaux, téléphones, installation de logiciels.', 'monitor-smartphone', 130),
  ('evenementiel', 'Événementiel', 'Service, décoration, sonorisation, traiteur.', 'party-popper', 140),
  ('couture', 'Couture & mode', 'Confection, retouches, tenues sur mesure.', 'scissors', 150),
  ('cours', 'Cours & formation', 'Soutien scolaire, cours de langues, formations.', 'graduation-cap', 160),
  ('demenagement', 'Déménagement & manutention', 'Transport, chargement, montage de meubles.', 'truck', 170),
  ('autres', 'Autres services', 'Toute autre mission ponctuelle.', 'briefcase', 999)
on conflict (slug) do nothing;

insert into public.skills (slug, name, category_id)
select s.slug, s.name, c.id from (values
  ('installation-sanitaire', 'Installation sanitaire', 'plomberie'),
  ('reparation-fuite', 'Réparation de fuites', 'plomberie'),
  ('cablage', 'Câblage électrique', 'electricite'),
  ('installation-solaire', 'Installation solaire', 'electricite'),
  ('vidange', 'Vidange & entretien', 'mecanique'),
  ('diagnostic-auto', 'Diagnostic automobile', 'mecanique'),
  ('nettoyage', 'Nettoyage', 'menage'),
  ('repassage', 'Repassage', 'menage'),
  ('garde-enfants', 'Garde d''enfants', 'aide-domicile'),
  ('livraison-moto', 'Livraison à moto', 'livraison'),
  ('taille-haies', 'Taille de haies', 'jardinage'),
  ('carrelage', 'Carrelage', 'maconnerie'),
  ('peinture', 'Peinture', 'maconnerie'),
  ('react', 'React / Next.js', 'developpement'),
  ('wordpress', 'WordPress', 'developpement'),
  ('flutter', 'Flutter', 'developpement'),
  ('logo', 'Création de logo', 'graphisme'),
  ('reseaux-sociaux', 'Visuels réseaux sociaux', 'graphisme'),
  ('reseau-informatique', 'Réseaux informatiques', 'informatique'),
  ('climatiseur', 'Entretien de climatiseurs', 'climatisation')
) as s(slug, name, cat)
join public.categories c on c.slug = s.cat
on conflict (slug) do nothing;

insert into public.platform_settings (key, value, is_public, description) values
  ('payments.commission_rate', '0.05', true, 'Commission JOBLINK prélevée sur chaque mission payée (5 %).'),
  ('payments.provider_fee_rate', '0', true, 'Estimation des frais du prestataire de paiement, déduits et affichés avant paiement.'),
  ('payments.currency', '"XOF"', true, 'Devise principale.'),
  ('platform.launch_country', '"BJ"', true, 'Pays de lancement.'),
  ('platform.default_timezone', '"Africa/Porto-Novo"', true, 'Fuseau horaire par défaut.'),
  ('platform.support_email', '"support@joblink.bj"', true, 'Adresse de contact du support.'),
  ('jobs.max_images', '6', true, 'Nombre maximum de photos par mission.'),
  ('data.retention_days_notifications', '180', false, 'Durée de conservation des notifications lues.')
on conflict (key) do nothing;
