-- Annonce du site : un bandeau d'information affiché en haut des pages publiques,
-- rédigé par le propriétaire depuis son tableau de bord. Une seule ligne (id = true).
-- Lecture publique uniquement via public_announcement() (annonce active et non expirée) ;
-- écriture uniquement via la session propriétaire. Lien limité aux pages internes du site.

create table if not exists public.site_announcement (
  id boolean primary key default true check (id),
  message text not null default '' check (char_length(message) <= 240),
  tone text not null default 'info' check (tone in ('info', 'success', 'warning')),
  link_url text check (link_url is null or link_url ~ '^/[a-z0-9/?=&_-]*$'),
  link_label text check (link_label is null or char_length(link_label) <= 40),
  active boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.site_announcement (id) values (true) on conflict do nothing;
alter table public.site_announcement enable row level security;
revoke all on public.site_announcement from anon, authenticated;

create or replace function public.public_announcement()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('message', a.message, 'tone', a.tone, 'link_url', a.link_url, 'link_label', a.link_label, 'updated_at', a.updated_at)
  from public.site_announcement a
  where a.active and a.message <> '' and (a.expires_at is null or a.expires_at > now());
$$;

create or replace function public.owner_panel_get_announcement(p_server_key text, p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform owner_panel._require_session(p_server_key, p_token);
  return (
    select jsonb_build_object(
      'message', a.message, 'tone', a.tone, 'link_url', a.link_url, 'link_label', a.link_label,
      'active', a.active, 'expires_at', a.expires_at, 'updated_at', a.updated_at,
      'visible', a.active and a.message <> '' and (a.expires_at is null or a.expires_at > now()))
    from public.site_announcement a
  );
end $$;

create or replace function public.owner_panel_set_announcement(
  p_server_key text, p_token text, p_message text, p_tone text, p_link_url text, p_link_label text, p_active boolean, p_hours integer
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_message text := btrim(regexp_replace(coalesce(p_message, ''), '\s+', ' ', 'g'));
  v_url text := nullif(btrim(coalesce(p_link_url, '')), '');
  v_label text := nullif(btrim(coalesce(p_link_label, '')), '');
begin
  perform owner_panel._require_session(p_server_key, p_token);
  if char_length(v_message) > 240 or p_tone not in ('info', 'success', 'warning')
     or (v_url is not null and v_url !~ '^/[a-z0-9/?=&_-]*$')
     or (v_label is not null and char_length(v_label) > 40)
     or (p_hours is not null and (p_hours < 1 or p_hours > 24 * 90))
     or (coalesce(p_active, false) and v_message = '') then
    raise exception 'INVALID_ANNOUNCEMENT';
  end if;
  update public.site_announcement set
    message = v_message, tone = p_tone, link_url = v_url,
    link_label = case when v_url is null then null else coalesce(v_label, 'En savoir plus') end,
    active = coalesce(p_active, false),
    expires_at = case when p_hours is null then null else now() + make_interval(hours => p_hours) end,
    updated_at = now()
  where id;
  perform public._audit('owner.announcement_' || case when coalesce(p_active, false) then 'published' else 'disabled' end, 'site', 'announcement', '{}'::jsonb);
end $$;

revoke all on function public.public_announcement(), public.owner_panel_get_announcement(text, text),
  public.owner_panel_set_announcement(text, text, text, text, text, text, boolean, integer) from public;
grant execute on function public.public_announcement(), public.owner_panel_get_announcement(text, text),
  public.owner_panel_set_announcement(text, text, text, text, text, text, boolean, integer) to anon, authenticated;
