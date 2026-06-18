# Deployment Runbook — Setting up on the client's accounts

End-to-end steps to host **The Quiz Master Challenge** on the **client's own**
Supabase (backend/database) and Vercel (frontend/website) accounts. Follow top to
bottom. Estimated time: 30–45 minutes.

> Backend = **Supabase** (database + auth + media storage).
> Frontend = the **Vite/React app**, deployed as a static site on **Vercel**.

---

## Phase 0 — Before you start

You need:

- [ ] The project code (this `quiz-app` folder) in a **Git repository** the client
      can access — push it to **the client's GitHub** (or a shared GitHub org).
      Vercel deploys straight from GitHub.
- [ ] The **client's email** (or a project email) to create the Supabase and Vercel
      accounts under, so they own them.
- [ ] Node.js installed on your machine (only needed if you run the optional
      seed/optimize scripts locally — not required for the deploy itself).

> **Tip:** Create the GitHub repo under the client's account/org and add yourself as
> a collaborator. That way ownership stays with the client from day one.

---

## Phase 1 — Backend: create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in / sign up **with the
   client's email**.
2. **New project** → name it (e.g. `quiz-master`), pick a region near the client,
   set a strong database password (save it). Wait ~2 min for it to provision.

### 1a. Apply the database schema

3. Left sidebar → **SQL Editor** → **New query**.
4. Open [`supabase/schema.sql`](supabase/schema.sql), copy **all** of it, paste into
   the editor, click **Run**.
   - This creates the `profiles`, `quizzes`, `questions`, `game_results` tables, the
     `quizzes_with_counts` view, security policies, the `quiz-media` storage bucket,
     and the signup trigger. It's safe to re-run.

### 1b. Seed sample quizzes (optional but recommended)

5. New query → paste the contents of [`supabase/seed.sql`](supabase/seed.sql) →
   **Run**. Adds 8 ready-to-play quizzes (10 questions each) so the app isn't empty
   on day one. Skip this if the client wants to start from scratch.

### 1c. ⚠️ Disable email confirmation (critical)

6. **Authentication → Providers → Email** → turn **OFF** "Confirm email" → Save.
   - The app turns a username into a fake `username@quizmaster.local` address that
     can never receive a confirmation email. If this is left ON, **logins silently
     fail.** Don't skip this.

### 1d. Create the admin account

7. SQL Editor → New query → paste the block below (change `admin_pass` to a strong
   password you'll give the client) → **Run**:

   ```sql
   do $$
   declare
     admin_email text := 'admin@quizmaster.local';
     admin_pass  text := 'CHANGE-ME-Strong#Pass1';   -- <-- set the client's password
     uid uuid;
   begin
     select id into uid from auth.users where email = admin_email;
     if uid is null then
       uid := gen_random_uuid();
       insert into auth.users (
         instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
         confirmation_token, recovery_token, email_change_token_new, email_change
       ) values (
         '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
         admin_email, crypt(admin_pass, gen_salt('bf')), now(), now(), now(),
         '{"provider":"email","providers":["email"]}', '{"username":"admin","role":"admin"}',
         '', '', '', ''
       );
     else
       update auth.users
         set encrypted_password = crypt(admin_pass, gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
       where id = uid;
     end if;
     insert into public.profiles (id, username, role) values (uid, 'admin', 'admin')
       on conflict (id) do update set role = 'admin', username = 'admin';
   end $$;
   ```
   - If you get a `gen_salt`/`crypt does not exist` error, prefix them with
     `extensions.` (e.g. `extensions.crypt(...)`, `extensions.gen_salt('bf')`).
   - Login will be username `admin` + the password you set here.

### 1e. Copy the API credentials

8. **Project Settings → API**. Copy two values (keep them for Phase 2):
   - **Project URL** → e.g. `https://abcd1234.supabase.co`
   - **Publishable key** (`sb_publishable_…`) — the client-safe key.
     **Never use the secret/service key in the frontend.**

✅ Backend done.

---

## Phase 2 — Frontend: deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → sign in / sign up **with the client's
   email** → ideally connect their **GitHub**.
2. **Add New… → Project** → **Import** the quiz repo from GitHub.
3. Configure the project:
   - **Project Name:** set to `thequizmasterchallenge`. The free URL is derived
     from this, so the site becomes **`https://thequizmasterchallenge.vercel.app`**
     (lowercase, no spaces; the name must be globally free on Vercel — this one was
     available at setup).
   - **Root Directory:** set to `quiz-app` (the app lives in this subfolder — this
     is the most common mistake, don't leave it at the repo root).
   - **Framework Preset:** Vite (auto-detected). Build command `npm run build`,
     output `dist` — leave as detected.
4. **Environment Variables** — add these two (from Phase 1, step 8):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

5. Click **Deploy**. Wait for the build to finish — the live URL will be
   **`https://thequizmasterchallenge.vercel.app`**.

> If you ever change env vars later, you must **redeploy** for them to take effect
> (Deployments → ⋯ → Redeploy).

✅ Frontend done.

---

## Phase 3 — Verify it works

1. Open the live Vercel URL.
2. Go to the **Admin** login → sign in with `admin` + your password → confirm you
   can see/create quizzes. (If login fails → re-check Phase 1c email confirmation
   and Phase 2 env vars.)
3. Go to the **Game** login → sign in → start a quiz → confirm questions, scoring,
   and the results screen work.
4. If you seeded data, confirm the 8 sample quizzes appear.

---

## Phase 4 — Hand over to the client

Give the client (securely — use a password manager share, not plain email/chat):

- [ ] The **live website URL**.
- [ ] The **admin username + password**.
- [ ] **Supabase account** login (they own the database).
- [ ] **Vercel account** login (they own the hosting).
- [ ] The **GitHub repo** (they own the code).
- [ ] The filled-in [`CLIENT-GUIDE.md`](CLIENT-GUIDE.md) (the non-technical usage
      guide).

---

## Optional / good to know

- **Changing the `.vercel.app` name later:** Project → **Settings → Domains** →
  **Add** the desired `name.vercel.app` (must be globally free), then set it as the
  production domain. Or rename the project in **Settings → General → Project Name**
  to update the auto-assigned URL. The canonical name for this app is
  `thequizmasterchallenge.vercel.app`.
- **Custom domain:** in Vercel → Project → Settings → Domains, add the client's
  domain (e.g. `quiz.theircompany.com`) and follow the DNS instructions.
- **Adding media to questions:** done from the Admin panel; files are stored in the
  Supabase `quiz-media` bucket automatically.
- **Costs:** Supabase and Vercel both have free tiers that comfortably cover a quiz
  app. If usage grows, the client (as account owner) controls any upgrades.
- **Resetting the admin password later:** re-run the SQL block in Phase 1d with a
  new `admin_pass`.
- **Adding new image assets to the design:** drop the PNG in
  `public/assets/figma/`, run `npm run optimize:images`, delete the source PNG, then
  commit/push (Vercel redeploys automatically).
