-- JOBLINK — 009 : durcissement suite à l'analyse Supabase (Advisors)
-- search_path figé et fonctions d'aide RLS non exposées au rôle anonyme.
alter function public.compute_commission(bigint, numeric) set search_path = public;
revoke execute on function public.can_message(uuid), public.is_conversation_member(uuid),
  public.is_job_party(uuid), public.is_active_user(), public.has_role(public.app_role) from anon;
