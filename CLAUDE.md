# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo root is a **design/asset workspace** — `Screen 1`…`Screen 6`, `figma-frames/`,
`figma-new/`, and `verify-shots/` hold Figma exports and screenshots, not code. The actual
application lives entirely in **`quiz-app/`**. Run all npm commands from there, and when
deploying to Vercel set the **Root Directory to `quiz-app`**.

## Commands

All commands run from `quiz-app/`:

```bash
npm install
npm run dev          # Vite dev server with HMR
npm run build        # production build → dist/
npm run preview      # serve the production build
npm run lint         # ESLint (flat config in eslint.config.js)
npm run optimize:images   # convert public/assets/figma/*.png|jpg → .webp (sharp)
npm run seed:sql     # regenerate supabase/seed.sql from scripts/seed-quizzes.mjs
```

There is **no test suite**. Verification is visual: run `npm run dev` and use the screen-jump
URL param below.

### Screen-jump dev helper

Append `?s=<screen>` to the URL to render any screen directly with sample data, bypassing the
login/navigation flow: `login-game`, `login-admin`, `home`, `mode-select`, `team-setup`,
`quiz-select`, `gameplay`, `results`, `dashboard`, `create-quiz`, `view-quizzes`. On the
gameplay screen, `?bg=audience|phone` forces a lifeline background. See `initialScreen` handling
in [src/App.jsx](quiz-app/src/App.jsx).

## Architecture

### Single-file router
[src/App.jsx](quiz-app/src/App.jsx) is the whole router: a `screen` string in state selects which
screen component to render, and all cross-screen state (teams, selected quiz, loaded questions,
results, auth) lives here and is passed down as props. There is no react-router. Two flows share
this one tree: the **game flow** (login-game → home → mode-select → team-setup → quiz-select →
gameplay → results) and the **admin flow** (login-admin → dashboard → create-quiz / view-quizzes).

### Pixel-exact Stage/Box layout system
The entire UI is composed of Figma-exported background images with live elements positioned on
top at exact design coordinates. This is central — understand it before touching any screen:

- [`Stage`](quiz-app/src/components/Stage.jsx) renders a fixed **1536×1024** canvas, scaled to fit
  the viewport with letterboxing. 1 CSS px on the stage === 1 Figma px.
- [`Box`](quiz-app/src/components/Box.jsx) absolutely positions an element via `x/y/w/h` design-px
  props. With `img` it's an image; otherwise a text/button element (`onClick` auto-makes it a
  `<button>`). Coordinates come straight from the Figma design.
- **`A('name.png')`** (exported from Box.jsx) maps an asset name to its served WebP path. All
  images are optimized WebP but code always passes the original `.png`/`.jpg` name — `A()`
  rewrites the extension. To add an asset: drop the PNG in `public/assets/figma/`, run
  `npm run optimize:images`, delete the source PNG, keep referencing the `.png` name in code.

Screens like CreateQuizScreen layer a baked panel image plus a live HTML form overlay, both sized
from a single `SCALE` constant so they grow together and stay centered.

### Backend: Supabase with offline-stub fallback
[src/lib/supabase.js](quiz-app/src/lib/supabase.js) exports `isSupabaseConfigured` (true only when
real `VITE_SUPABASE_*` env vars are present). **This flag gates everything backend-related** —
when false the app runs fully offline: pass-through login (any credentials), static sample data
from [src/data/](quiz-app/src/data), and the admin panel is blocked. Always branch on
`isSupabaseConfigured` when adding backend calls so offline mode keeps working.

All DB/auth/storage access goes through [src/lib/api.js](quiz-app/src/lib/api.js) (`signIn`,
`createQuiz`, `saveQuestion`, `uploadMedia`, etc.). Schema, RLS policies, and the storage bucket
live in [supabase/schema.sql](quiz-app/supabase/schema.sql) (idempotent — paste into the Supabase
SQL editor). Tables: `profiles`, `quizzes`, `questions`, `game_results`, plus the
`quizzes_with_counts` view.

### Auth model (important gotchas)
- **Single admin account, no self-registration.** Both login panels call `signIn` then verify the
  `admin` role and sign out anyone else. Accounts are created only in SQL. A new row violating the
  `quizzes`/`questions` RLS policy almost always means the signed-in account's `profiles.role` is
  not `'admin'` — fix it in SQL (`update public.profiles set role='admin' …`), not in code.
- A plain username is mapped to a synthetic `<username>@quizmaster.local` email. Because that
  address can't receive mail, **email confirmation must be disabled** in Supabase or sessions
  never get created. Default admin: `admin` / `Admin@12345` (seed SQL in
  [quiz-app/README.md](quiz-app/README.md)).

### Round types and scoring (shared model)
[src/data/rounds.js](quiz-app/src/data/rounds.js) defines the 5 round types (Buzzer, Timer, 50:50,
Ask Audience, General) by integer `id`, which is what's stored in `questions.round`. Both
CreateQuizScreen and GameplayScreen import this so the admin and gameplay stay in sync — add new
round mechanics here. Per-quiz scoring/timer settings (`correctPoints`, `penaltyPoints`, `timer`,
`timerRoundTimer`) default in `DEFAULT_SCORING` and override per quiz from the DB. Note
GameplayScreen also has an independent **prize-ladder** point model (`LADDER_POINTS`) used for the
on-screen scoreboard — distinct from the per-quiz correct/penalty points.

### Sound system
[src/lib/sound.js](quiz-app/src/lib/sound.js) is a self-contained manager. Background `music`
loops for the whole game flow (started after game login, on first user gesture for autoplay
policy). Other cues "duck" the music (`pause` or `lower` volume) and re-sync via a single
`syncMusic()` so overlapping cues can't desync it. Clips live in `public/assets/sounds/` keyed by
short id; missing files quietly no-op. The gameplay flow is **lock → suspense → reveal**: locking
an answer drops the timer to a short suspense window with the looping suspense sound before the
answer is revealed (correct→green / wrong→red).

### Media pipeline
Image/video uploads ([src/lib/media.js](quiz-app/src/lib/media.js) + `uploadMedia` in api.js)
transcode images to WebP and capture a WebP poster frame from videos (stored in
`questions.poster_url`) so video questions display instantly in gameplay. Originals are never
uploaded for images.

## Conventions
- React 19 + Vite 8, plain JS/JSX (no TypeScript despite `@types/react` being present).
- Styling: per-area CSS files (`App.css`, `screens.css`, `Stage.css`, `index.css`) plus inline
  styles on `Box`. Font is Space Mono.
- Keep new screens consistent with the Stage/Box coordinate approach rather than introducing flow
  layout, unless intentionally building an HTML-form overlay (see CreateQuizScreen).
