-- Keep the SECURITY DEFINER function from resolving attacker-controlled objects.
alter function public.activate_license(text, text) set search_path = '';
