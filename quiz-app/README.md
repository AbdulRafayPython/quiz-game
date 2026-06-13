# The Quiz Master Challenge

A neon game-show style quiz app built with React + Vite. It runs **fully offline**
out of the box (static sample data, pass-through login) and upgrades to a real
backend — auth, quiz/question management, media uploads, and game-result history —
when Supabase credentials are provided.

## Quick start (local, offline)

```bash
npm install
npm run dev
```

Open the printed URL. With no Supabase env vars, the app uses local stub data and
any username/password logs you in — handy for development and demos.

Dev helper: append `?s=<screen>` to jump straight to a screen
(`login-game`, `login-admin`, `home`, `dashboard`, `create-quiz`, `view-quizzes`,
`gameplay`, `results`, …).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run optimize:images` | Convert new `public/assets/figma/*` images to WebP (see below) |

## Enabling the backend (Supabase)

The app auto-detects credentials. Until they're set it stays in offline-stub mode.

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Apply the schema:** open the SQL Editor → New query → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run. It's idempotent (safe to
   re-run) and creates the `profiles`, `quizzes`, `questions`, `game_results`
   tables, the `quizzes_with_counts` view, row-level-security policies, the
   `quiz-media` storage bucket, and a trigger that creates a profile on signup.
   - **Seed ready-to-play quizzes (optional but recommended):** in the SQL Editor,
     paste [`supabase/seed.sql`](supabase/seed.sql) → Run. It inserts 8 quizzes
     (Science, Maths, English, Chemistry, GK, Geography, History, CS) with 10
     questions each, and is safe to re-run. Edit the data in
     [`scripts/seed-quizzes.mjs`](scripts/seed-quizzes.mjs) and `npm run seed:sql`
     to regenerate. Without this the quiz lists are simply empty until an admin
     creates a quiz.
3. **⚠️ Disable email confirmation.** Authentication → Providers → Email → turn
   **off** "Confirm email". The app maps a plain username to a synthetic
   `<username>@quizmaster.local` address, which can never receive a confirmation
   link — with confirmation on, player signup produces **no session** and login
   silently fails.
4. **Set env vars.** Copy `.env.example` to `.env.local` and fill in from
   Project Settings → API (use the client-safe **publishable** key, never the
   secret key):

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```

5. **Admin account (single, fixed credential).** There is exactly **one** admin —
   the app's ADMIN PANEL only signs in (it never self-registers an admin), so the
   admin can only be created/changed directly in the database.

   **Default admin login:**

   | Username | Password |
   | --- | --- |
   | `admin` | `Admin@12345` |

   Seed it (or reset the password) in the SQL Editor — idempotent, creates the
   admin if missing and sets the fixed password either way:

   ```sql
   do $$
   declare
     admin_email text := 'admin@quizmaster.local';
     admin_pass  text := 'Admin@12345';   -- change this to your own password
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

   If `gen_salt`/`crypt` error as "does not exist", prefix them with `extensions.`
   (e.g. `extensions.crypt(...)`). To change the password later, re-run with a new
   `admin_pass`.

### Auth model

- **Single admin account** (`admin` / `Admin@12345` by default, seeded in SQL —
  see step 5) runs everything. There is **no self-registration**; accounts are
  created only in the database.
- **Both panels require that admin account.** Each calls `signIn` then verifies
  the `admin` role and signs out anyone else, so arbitrary credentials are
  rejected. The GAME panel hosts games; the ADMIN panel manages quizzes.
- With no backend configured, the **admin panel is blocked** and the game panel
  falls back to a local demo (no real auth is possible offline).
- Sessions persist across refreshes; a **Log out** control appears top-right while
  authenticated.

## Deploying to Vercel

- **Root Directory:** `quiz-app` (the app lives in this subfolder).
- Framework preset **Vite** is auto-detected (`npm run build` → `dist`).
- Add the two `VITE_SUPABASE_*` env vars in **Project → Settings → Environment
  Variables**, then redeploy. Without them the deploy runs in offline-stub mode.

## Assets / images

All images are optimized **WebP**. The `A('name.png')` helper in
[`src/components/Box.jsx`](src/components/Box.jsx) automatically maps `.png/.jpg`
references to `.webp`. When adding a new figma asset, drop the PNG in
`public/assets/figma/`, run `npm run optimize:images`, then delete the source PNG;
keep passing the `.png` name in code.
