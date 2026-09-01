# Creating the first Studio admin

`profiles.permission_role` defaults to `'team_member'` for every account, and the
`profiles` row itself is only ever created by the `handle_new_user()` trigger on
`auth.users` (migration `20260831000002_profiles.sql`) — a browser signup can
never set `permission_role = 'admin'` directly, by design (see §25 of the
architecture audit).

That means **every** first sign-in lands as `team_member`, including yours.
Promoting the first real admin is therefore a deliberate, one-time, manual step
— never something the app itself exposes.

## Steps

1. Deploy the migrations (`supabase db push`, or paste them into the Supabase
   SQL editor in order) and confirm they applied cleanly.
2. Sign up for a Studio account from the deployed (or local) Dashboard's
   `login.html`, using the email you want to administer the Studio with.
   This creates your `auth.users` row and, via the trigger, a matching
   `profiles` row with `permission_role = 'team_member'`.
3. In the Supabase SQL editor, run:

   ```sql
   update public.profiles
   set permission_role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   Replace the email with the one you signed up with.
4. Sign out and back in (or just refresh) so the Dashboard picks up the new
   role on its next profile fetch.

From this point on, **only an existing admin can promote anyone else** —
`profiles_update`'s RLS policy plus the `prevent_self_role_change` trigger
(migration `20260831000002_profiles.sql`) block a user from changing their
own `permission_role`, and there is no INSERT policy on `profiles` at all, so
nobody can create a profile pre-set to admin either.

## If you also want to attach this admin to the team directory

The admin you just created is an **auth account** — it is not automatically a
`team_members` row (those are separate on purpose; see the audit's §7). If
you want "you" to also be assignable to projects/milestones as a team
member, either:

- link an existing `team_members` row to your new login:

  ```sql
  update public.team_members
  set profile_id = (select id from auth.users where email = 'you@example.com')
  where full_name = 'Lewis Kariuki';
  ```

- or create a new one, if you seeded the directory without yourself in it:

  ```sql
  insert into public.team_members (full_name, job_title, profile_id)
  values ('Your Name', 'Administrator',
          (select id from auth.users where email = 'you@example.com'));
  ```
