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

5. **Create an admin.** Open the app's **ADMIN PANEL** login and sign in once with
   the username/password you want (this creates the auth user + a `player`
   profile). Then promote it in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@quizmaster.local');
   ```

   (Swap in your chosen username before `@quizmaster.local`.) Players self-register
   on their first game login; admins must be promoted this way.

### Auth model

- **Players** sign in on the GAME panel and self-register on first login.
- **Admins** sign in on the ADMIN panel; the app verifies the `admin` role and
  signs out non-admins.
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
