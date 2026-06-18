# Game sounds

Audio that follows the player through the game, wired in `src/lib/sound.js` (a
small "music director"). Replace any file with your own (keep the same name) and
it plays automatically. A missing file just means that part is silent.

There is always at most **one background track** playing, chosen by which screen
you're on (App drives this from its screen state). Switching screens stops the
previous track, so a screen's music never bleeds into the next.

| File               | Screen / phase                         | Loops? |
|--------------------|----------------------------------------|--------|
| `theme-intro.mp3`  | Home / mode-select (title theme)        | yes    |
| `round-start.mp3`  | After picking a mode, through team setup | yes    |
| `fanfare.wav`      | Quiz-selection screen                    | yes    |
| `question-bed.mp3` | Gameplay — "Main Theme" thinking music   | yes    |
| `win.wav`          | Results — winner music                   | **no** (plays once) |

On top of the background, short **cues** fire at the moments that matter (and get
the background out of their way):

| File                 | Cue       | When it plays                                    |
|----------------------|-----------|--------------------------------------------------|
| `correct.wav`        | correct   | Answer revealed and it was **correct** — lowers bg |
| `wrong.wav`          | wrong     | Answer revealed **wrong** / timed out — lowers bg  |
| `audience.mp3`       | audience  | **Ask the Audience** lifeline — pauses bg          |
| `call_a_friend.mp3`  | friend    | **Phone a Friend** lifeline — pauses bg            |
| `button_click.mp3`   | click     | UI button click (no ducking)                      |

A "suspense" hold (set while a locked answer awaits its reveal) also dips the
background to a tense hush — see `setSuspense()` in `src/lib/sound.js`.

## Notes
- Looping tracks should loop cleanly. `win.wav` plays once and then stops; it is
  also stopped when you leave the results screen.
- The background plays at low volume (0.22) so it never drowns the cues; tweak
  per-cue volume in `src/lib/sound.js`.
- Browsers block audio until the first click/tap, so music starts once the user
  has interacted with the page.
- The bundled clips are extracted from the QSTSS competition deck (Millionaire
  template). Swap in your own licensed clips for any you can't ship.
