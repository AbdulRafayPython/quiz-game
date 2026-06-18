// Sound manager for the game — a small "music director" that makes the audio
// follow the player through the game (Who-Wants-to-Be-a-Millionaire style),
// rather than looping one track aimlessly in the background. All clips are
// extracted from the QSTSS competition deck and live in /public/assets/sounds/.
//
// There is always at most ONE background track ("bg") playing, chosen by which
// screen we're on (App drives this from its screen state):
//   • menu    → theme-intro.mp3   (title / home / mode-select)
//   • setup   → round-start.mp3   (after picking a mode, through team setup)
//   • select  → fanfare.wav       (quiz-selection screen)
//   • game    → question-bed.mp3  ("Main Theme" — thinking music during a Q)
//   • results → win.wav           (winner music — plays ONCE, then stops)
//   • null    → silence           (login / admin area)
// Switching the bg always stops the previous one, so a screen's music can never
// bleed into the next screen.
//
// On top of the bg, short CUES play at the moments that matter and get the bg
// out of their way while they sound:
//   • correct / wrong — the answer is revealed   → lower the bg
//   • audience / friend — lifelines              → pause the bg
//   • click — UI button                          → no ducking
// A "suspense" hold (set while a locked answer awaits its reveal) also lowers the
// bg, so the music drops to a tense hush exactly when the player is waiting.
//
// A single syncMusic() is the source of truth: it picks which bg is audible and
// at what volume given the active bg, the user's on/off + volume settings, and
// any active ducks/pauses. Every action just flips a flag and re-syncs, so
// overlapping cues can never desync the music. Everything is best-effort:
// missing files / autoplay restrictions quietly no-op.

const BASE = '/assets/sounds/';
const DEFAULT_VOLUME = 0.22;  // 0..1
const DUCK_RATIO = 0.27;      // ducked volume = userVolume * this
const LS_ENABLED = 'qm_music_enabled';
const LS_VOLUME = 'qm_music_volume';

// Background tracks — one active at a time (key -> file + whether it loops). The
// winner music plays once; every other phase loops until the screen changes.
const BG = {
  menu:    { file: 'theme-intro.mp3',  loop: true },
  setup:   { file: 'round-start.mp3',  loop: true },
  select:  { file: 'fanfare.wav',      loop: true },
  game:    { file: 'question-bed.mp3', loop: true },
  results: { file: 'win.wav',          loop: false },
};

// One-shot cues. duck: 'lower' dips the bg while playing; 'pause' silences it.
const CUES = {
  correct: { file: 'correct.wav', volume: 1.0, duck: 'lower' },         // reveal — right
  wrong: { file: 'wrong.wav', volume: 1.0, duck: 'lower' },             // reveal — wrong / timeout
  audience: { file: 'audience.mp3', volume: 0.9, duck: 'pause' },       // lifeline — Ask the Audience
  friend: { file: 'call_a_friend.mp3', volume: 0.9, duck: 'pause' },    // lifeline — Phone a Friend
  click: { file: 'button_click.mp3', volume: 0.6 },                     // UI button click (no ducking)
};

const bgs = new Map();      // key -> Audio (background track)
const cues = new Map();      // id -> Audio (one-shot cue)
const ducking = new Set();   // ids/holds currently lowering the bg ('suspense' + duck cues)
const pausing = new Set();   // ids currently pausing the bg (lifelines)
let activeBg = null;         // 'menu' | 'setup' | 'select' | 'game' | 'results' | null
let unlockBound = false;     // a one-shot listener to satisfy autoplay policy is armed

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const readBool = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const readNum = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };

// User settings (persisted).
let musicEnabled = readBool(LS_ENABLED, true);
let musicVolume = clamp(readNum(LS_VOLUME, DEFAULT_VOLUME), 0, 1);

function bgEl(key) {
  const def = BG[key];
  if (!def) return null;
  let a = bgs.get(key);
  if (!a) {
    a = new Audio(BASE + def.file);
    a.loop = !!def.loop;
    a.preload = 'auto';
    // A non-looping bg (the winner music) clears itself when it finishes so a
    // later syncMusic() — e.g. a volume tweak — never restarts it.
    if (!def.loop) a.onended = () => { if (activeBg === key) { activeBg = null; syncMusic(); } };
    bgs.set(key, a); // bg volume is managed by syncMusic
  }
  return a;
}

function cueEl(id) {
  const def = CUES[id];
  if (!def) return null;
  let a = cues.get(id);
  if (!a) {
    a = new Audio(BASE + def.file);
    a.loop = false;
    a.preload = 'auto';
    a.volume = def.volume ?? 1;
    cues.set(id, a);
  }
  return a;
}

// If the browser blocked play() (autoplay policy), re-try once on the first user
// interaction so the music starts as soon as it's allowed.
function armAutoplayUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  const handler = () => { unlockBound = false; syncMusic(); };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

// Single source of truth for which bg is audible and at what volume.
function syncMusic() {
  const vol = clamp(musicVolume * (ducking.size > 0 ? DUCK_RATIO : 1), 0, 1);
  const canPlay = musicEnabled && pausing.size === 0;
  for (const [key, a] of bgs) {
    if (key === activeBg && canPlay) {
      a.volume = vol;
      if (a.paused) a.play().catch(() => armAutoplayUnlock()); // blocked → retry on next gesture
    } else if (!a.paused) {
      a.pause();
    }
  }
}

// ---- background track ---------------------------------------------------------
/** Switch the active background ('menu' | 'setup' | 'select' | 'game' |
 *  'results' | null). Idempotent: asking for the bg that's already active just
 *  keeps it going (no restart); switching stops the previous one. */
function setBg(key) {
  if (activeBg === key) { syncMusic(); return; }
  activeBg = key;
  // New screen → drop any held ducks/pauses from the previous one.
  ducking.clear();
  pausing.clear();
  const a = key && bgEl(key);
  if (a) { try { a.currentTime = 0; } catch { /* ignore */ } } // start each phase from the top
  syncMusic();
}

/** Title / home / mode-select theme. */
export const enterMenuMusic = () => setBg('menu');
/** After a mode is chosen, through team setup. */
export const enterSetupMusic = () => setBg('setup');
/** Quiz-selection screen. */
export const enterSelectMusic = () => setBg('select');
/** Gameplay thinking bed ("Main Theme"). */
export const enterGameplayMusic = () => setBg('game');
/** Results: winner music (plays once). */
export const enterResultsMusic = () => setBg('results');
/** Stop the background entirely (login / admin / logout). */
export const stopMusic = () => setBg(null);

/** Hold/release a "suspense" duck on the bg (a locked answer awaiting reveal). */
export function setSuspense(on) {
  if (on) ducking.add('suspense'); else ducking.delete('suspense');
  syncMusic();
}

/** User setting: turn background music on/off (persisted). */
export function setMusicEnabled(on) {
  musicEnabled = !!on;
  try { localStorage.setItem(LS_ENABLED, on ? '1' : '0'); } catch { /* ignore */ }
  syncMusic();
}
/** User setting: background music volume 0..1 (persisted). */
export function setMusicVolume(v) {
  musicVolume = clamp(Number(v) || 0, 0, 1);
  try { localStorage.setItem(LS_VOLUME, String(musicVolume)); } catch { /* ignore */ }
  syncMusic();
}
export const isMusicEnabled = () => musicEnabled;
export const getMusicVolume = () => musicVolume;

// ---- cues --------------------------------------------------------------------
/** Play a cue from the start, ducking/pausing the bg as configured. */
export function playSound(id) {
  const def = CUES[id];
  if (!def) return;
  const a = cueEl(id);
  if (!a) return;
  if (def.duck === 'lower') { ducking.add(id); syncMusic(); }
  else if (def.duck === 'pause') { pausing.add(id); syncMusic(); }
  try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
  // Release the cue's hold on the bg when it finishes.
  if (def.duck) {
    a.onended = () => { ducking.delete(id); pausing.delete(id); syncMusic(); };
  }
}

/** Stop a single cue, releasing any duck/pause it held on the bg. */
export function stopSound(id) {
  const a = cues.get(id);
  if (a) { try { a.pause(); a.currentTime = 0; } catch { /* ignore */ } }
  if (ducking.delete(id) || pausing.delete(id)) syncMusic();
}

/** Stop every cue EXCEPT the background (used when leaving gameplay). The short
 *  UI click is left alone so a click that triggers navigation can finish. */
export function stopGameSounds() {
  for (const [id, a] of cues) {
    if (id === 'click') continue;
    try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
  }
  ducking.clear();
  pausing.clear();
  syncMusic();
}

/** Stop everything including the background (logout / leaving the game). */
export function stopAllSounds() {
  for (const [id, a] of cues) {
    if (id === 'click') continue; // let a navigation/logout click finish
    try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
  }
  stopMusic();
}

// Dev only: before Vite hot-swaps this module, stop and release every audio
// element. Otherwise the previous module's looping bg keeps playing as an orphan
// that the reloaded module (and the settings toggle) can no longer control.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const a of [...bgs.values(), ...cues.values()]) {
      try { a.pause(); a.src = ''; } catch { /* ignore */ }
    }
    bgs.clear();
    cues.clear();
  });
}
