-- StudyLyn account policy: only DEKUT BBIT 2026 class emails may create accounts.
create or replace function public.enforce_class_signup_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email !~* '^[a-z0-9._%+-]*26@students\.dkut\.ac\.ke$' then
    raise exception 'Only student emails ending in 26@students.dkut.ac.ke can sign up on StudyLyn.'
      using hint = 'Use your DEKUT student email ending in 26@students.dkut.ac.ke.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signup_email on auth.users;
create trigger on_auth_user_signup_email
before insert on auth.users
for each row execute function public.enforce_class_signup_email();

-- Platform owner account is granted the admin role automatically.
create or replace function public.promote_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'kariuki.macharia26@students.dkut.ac.ke' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
    delete from public.user_roles where user_id = new.id and role = 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_promote_admin on auth.users;
create trigger on_auth_user_promote_admin
after insert on auth.users
for each row execute function public.promote_platform_admin();