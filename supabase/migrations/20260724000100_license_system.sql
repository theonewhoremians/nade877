-- Private licensing schema. No client role is granted table access.
create extension if not exists pgcrypto;

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  access_code text not null unique check (access_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  plan text not null check (char_length(plan) between 1 and 80),
  duration_days integer null check (duration_days is null or duration_days > 0),
  activated_at timestamptz null,
  expires_at timestamptz null,
  device_id text null check (char_length(device_id) between 16 and 256),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activation_count integer not null default 0 check (activation_count >= 0),
  max_devices smallint not null default 1 check (max_devices = 1),
  notes text null check (notes is null or char_length(notes) <= 2000),
  constraint license_lifetime_has_no_expiry check ((duration_days is null and expires_at is null) or duration_days is not null)
);

create index licenses_active_expiry_idx on public.licenses (active, expires_at);
create index licenses_created_at_idx on public.licenses (created_at desc);
alter table public.licenses enable row level security;
alter table public.licenses force row level security;
revoke all on public.licenses from anon, authenticated, public;

create or replace function public.set_license_updated_at() returns trigger
language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger licenses_updated_at before update on public.licenses for each row execute function public.set_license_updated_at();

-- Called only by an Edge Function using the service-role database connection.
-- The row lock ensures two devices cannot activate a code concurrently.
create or replace function public.activate_license(p_access_code text, p_device_id text)
returns public.licenses language plpgsql security definer set search_path = public as $$
declare v_license public.licenses;
begin
  select * into v_license from public.licenses where access_code = upper(trim(p_access_code)) for update;
  if not found then raise exception 'LICENSE_NOT_FOUND'; end if;
  if not v_license.active then raise exception 'LICENSE_DISABLED'; end if;
  if v_license.expires_at is not null and v_license.expires_at <= now() then raise exception 'LICENSE_EXPIRED'; end if;
  if v_license.device_id is not null and v_license.device_id <> p_device_id then raise exception 'DEVICE_MISMATCH'; end if;
  if v_license.device_id is null then
    update public.licenses set device_id = p_device_id, activated_at = coalesce(activated_at, now()),
      expires_at = case when duration_days is null then null else coalesce(expires_at, now() + make_interval(days => duration_days)) end,
      activation_count = activation_count + 1 where id = v_license.id returning * into v_license;
  end if;
  return v_license;
end; $$;
revoke all on function public.activate_license(text, text) from public, anon, authenticated;
