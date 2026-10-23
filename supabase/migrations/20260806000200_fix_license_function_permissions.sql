-- Repair for existing deployments. Do not create the licenses table again.
-- Only the backend service role may read or write licenses; the browser keeps
-- no direct database access.
alter table public.licenses no force row level security;
alter table public.licenses enable row level security;

create or replace function public.activate_license(p_access_code text, p_device_id text)
returns public.licenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_license public.licenses;
begin
  select * into v_license
  from public.licenses
  where access_code = upper(trim(p_access_code))
  for update;

  if not found then raise exception 'LICENSE_NOT_FOUND'; end if;
  if not v_license.active then raise exception 'LICENSE_DISABLED'; end if;
  if v_license.expires_at is not null and v_license.expires_at <= now() then
    raise exception 'LICENSE_EXPIRED';
  end if;
  if v_license.device_id is not null and v_license.device_id <> p_device_id then
    raise exception 'DEVICE_MISMATCH';
  end if;

  if v_license.device_id is null then
    update public.licenses
    set
      device_id = p_device_id,
      activated_at = coalesce(activated_at, now()),
      expires_at = case
        when duration_days is null or duration_days = 0 then null
        else coalesce(expires_at, now() + make_interval(days => duration_days))
      end,
      activation_count = activation_count + 1,
      updated_at = now()
    where id = v_license.id
    returning * into v_license;
  end if;

  return v_license;
end;
$$;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.licenses to service_role;
grant execute on function public.activate_license(text, text) to service_role;

-- Keep the previous public lock-down explicit when this migration is applied
-- to a project that has other default grants configured.
revoke all on table public.licenses from anon, authenticated, public;
revoke all on function public.activate_license(text, text) from anon, authenticated, public;
