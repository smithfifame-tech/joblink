-- =============================================================================
-- Connexion Google + finalisation du profil (« onboarding »)
--
-- Un compte créé via Google n'a ni téléphone, ni ville, ni acceptation des CGU.
-- Il reste « incomplet » (terms_accepted_at IS NULL) : l'application l'envoie sur
-- /onboarding tant que les conditions ne sont pas remplies. complete_onboarding()
-- valide tout côté serveur (le rôle n'est jamais fourni librement : client ou travailleur,
-- jamais admin) et ne peut être exécutée qu'une seule fois.
-- =============================================================================

-- Noms issus de Google (given_name / family_name / full_name / name) en plus du formulaire classique.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.app_role := case when meta->>'account_type' = 'worker'
                                 then 'worker'::public.app_role else 'client'::public.app_role end;
  v_phone text := case when coalesce(meta->>'phone', '') ~ '^\+[0-9]{8,15}$' then meta->>'phone' end;
  v_full text := nullif(trim(coalesce(meta->>'full_name', meta->>'name', '')), '');
  v_first text := coalesce(nullif(trim(meta->>'first_name'), ''), nullif(trim(meta->>'given_name'), ''),
                           nullif(split_part(coalesce(v_full, ''), ' ', 1), ''));
  v_last text := coalesce(nullif(trim(meta->>'last_name'), ''), nullif(trim(meta->>'family_name'), ''),
                          nullif(trim(substr(coalesce(v_full, ''), length(split_part(coalesce(v_full, ''), ' ', 1)) + 1)), ''));
begin
  insert into public.profiles
    (id, first_name, last_name, email, phone, country_code, city, neighborhood, terms_accepted_at)
  values (
    new.id,
    left(coalesce(v_first, 'Utilisateur'), 80),
    left(coalesce(v_last, 'JOBLINK'), 80),
    coalesce(new.email, ''),
    v_phone,
    upper(left(coalesce(nullif(meta->>'country_code', ''), 'BJ'), 2)),
    left(nullif(trim(meta->>'city'), ''), 120),
    left(nullif(trim(meta->>'neighborhood'), ''), 120),
    case when meta->>'terms_accepted' = 'true' then now() end
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, v_role) on conflict do nothing;
  if v_role = 'worker' then
    insert into public.worker_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.complete_onboarding(
  p_account_type text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_country_code text,
  p_city text,
  p_neighborhood text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.terms_accepted_at is not null then raise exception 'ALREADY_ONBOARDED'; end if;
  if v_profile.is_suspended then raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501'; end if;

  if p_account_type not in ('client', 'worker') then raise exception 'INVALID_ACCOUNT_TYPE'; end if;
  if char_length(trim(coalesce(p_first_name, ''))) not between 1 and 80
     or char_length(trim(coalesce(p_last_name, ''))) not between 1 and 80 then
    raise exception 'INVALID_NAME';
  end if;
  if coalesce(p_phone, '') !~ '^\+[0-9]{8,15}$' then raise exception 'INVALID_PHONE'; end if;
  if coalesce(p_country_code, '') !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY'; end if;
  if char_length(trim(coalesce(p_city, ''))) not between 2 and 120
     or char_length(trim(coalesce(p_neighborhood, ''))) not between 2 and 120 then
    raise exception 'INVALID_PLACE';
  end if;

  update public.profiles
     set first_name = trim(p_first_name),
         last_name = trim(p_last_name),
         phone = p_phone,
         country_code = p_country_code,
         city = trim(p_city),
         neighborhood = trim(p_neighborhood),
         terms_accepted_at = now()
   where id = v_uid;

  -- Rôle choisi : client ou travailleur (jamais admin). Un compte neuf n'a encore rien publié.
  if p_account_type = 'worker' then
    if not exists (select 1 from public.jobs where client_id = v_uid) then
      delete from public.user_roles where user_id = v_uid and role = 'client';
    end if;
    insert into public.user_roles (user_id, role) values (v_uid, 'worker') on conflict do nothing;
    insert into public.worker_profiles (user_id) values (v_uid) on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (v_uid, 'client') on conflict do nothing;
  end if;

  perform public._audit('user.onboarded', 'user', v_uid::text, jsonb_build_object('account_type', p_account_type));
end $$;

revoke all on function public.complete_onboarding(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text, text, text, text) to authenticated;
