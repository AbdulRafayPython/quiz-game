// Sound manager for the game. Clips live in /public/assets/sounds/ and are
// referenced by a short id (see SOUNDS below). Drop your own files in that
// folder (same names) and they play automatically.
//
// Background music (`music`) loops for the whole game once started after the
// game login. Its on/off state and volume are user-controlled (Sound settings,
// persisted to localStorage). Other cues automatically "get out of its way":
//   • duck: 'pause' — pause the music while the clip plays (Ask-Audience clip).
//   • duck: 'lower' — lower the music volume while the clip plays (suspense /
//                     correct / wrong).
//
// A single syncMusic() applies the current state (volume, duck, pause, enabled,
// whether we're in the music part of the app) — every action just flips a flag
// and re-syncs, so overlapping cues can never desync the music. Everything is
// best-effort: missing files / autoplay restrictions quietly no-op.

const BASE = '/assets/sounds/';
const DEFAULT_VOLUME = 0.22;  // 0..1
const DUCK_RATIO = 0.27;      // ducked volume = userVolume * this
const LS_ENABLED = 'qm_music_enabled';
const LS_VOLUME = 'qm_music_volume';

// id -> { file, loop, volume, duck }
const SOUNDS = {
  music: { file: 'music.mp3', loop: true },
  audience: { file: 'audience.mp3', loop: false, volume: 0.9, duck: 'pause' }, // KBC crowd — pauses music
  friend: { file: 'call_a_friend.mp3', loop: false, volume: 0.9, duck: 'pause' }, // phone-a-friend dial/ring — pauses music
  suspense: { file: 'suspense.mp3', loop: true, volume: 0.8, duck: 'lower' },  // locked answer awaiting reveal
  lock: { file: 'lock.mp3', loop: false, volume: 0.9 },                        // answer locked in
  correct: { file: 'correct.wav', loop: false, volume: 1.0, duck: 'lower' },   // reveal — right
  wrong: { file: 'wrong.wav', loop: false, volume: 1.0, duck: 'lower' },       // reveal — wrong / timeout
  click: { file: 'button_click.mp3', loop: false, volume: 0.6 },               // UI button click (no ducking)
};

const cache = new Map();
const ducking = new Set(); // ids currently lowering the music
const pausing = new Set();  // ids currently pausing the music (Ask-Audience)
let musicStarted = false;   // true while we're in the music part of the app (post game-login)
let unlockBound = false;    // a one-shot listener to satisfy autoplay policy is armed

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const readBool = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const readNum = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };

// User settings (persisted).
let musicEnabled = readBool(LS_ENABLED, true);
let musicVolume = clamp(readNum(LS_VOLUME, DEFAULT_VOLUME), 0, 1);

function el(id) {
  const def = SOUNDS[id];
  if (!def) return null;
  let a = cache.get(id);
  if (!a) {
    a = new Audio(BASE + def.file);
    a.loop = !!def.loop;
    a.preload = 'auto';
    if (id !== 'music') a.volume = def.volume ?? 1; // music volume is managed by syncMusic
    cache.set(id, a);
  }
  return a;
}

// If the browser blocked the initial play() (autoplay policy), re-try once on the
// first user interaction so the music starts as soon as it's allowed.
function armAutoplayUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  const handler = () => { unlockBound = false; syncMusic(); };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

// Single source of truth for the background music's volume + play/pause state.
function syncMusic() {
  const m = cache.get('music');
  if (!m) return;
  m.volume = clamp(musicVolume * (ducking.size > 0 ? DUCK_RATIO : 1), 0, 1);
  const shouldPlay = musicStarted && musicEnabled && pausing.size === 0;
  if (shouldPlay) {
    if (m.paused) m.play().catch(() => armAutoplayUnlock()); // blocked → retry on next gesture
  } else if (!m.paused) {
    m.pause();
  }
}

// ---- background music --------------------------------------------------------
/** Ensure the looping background music is playing. Idempotent: if it's already
 *  running this just keeps it going (no restart); otherwise it starts from 0. */
export function startMusic() {
  const wasStarted = musicStarted;
  musicStarted = true;
  if (!wasStarted) {
    ducking.clear();
    pausing.clear();
    const m = el('music');
    if (m) { try { m.currentTime = 0; } catch { /* ignore */ } }
  }
  syncMusic();
}

/** Stop the background music entirely (leaving the game / logout). */
export function stopMusic() {
  musicStarted = false;
  ducking.clear();
  pausing.clear();
  const m = cache.get('music');
  if (m) { try { m.pause(); m.currentTime = 0; } catch { /* ignore */ } }
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
/** Play a cue from the start, ducking/pausing the music as configured. */
export function playSound(id) {
  if (id === 'music') return startMusic();
  const a = el(id);
  if (!a) return;
  const def = SOUNDS[id];
  if (def?.duck === 'lower') { ducking.add(id); syncMusic(); }
  else if (def?.duck === 'pause') { pausing.add(id); syncMusic(); }
  try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
  // Non-looping cues release their hold on the music when they finish.
  if (def?.duck && !def.loop) {
    a.onended = () => { ducking.delete(id); pausing.delete(id); syncMusic(); };
  }
}

/** Stop a single cue, releasing any duck/pause it held on the music. */
export function stopSound(id) {
  const a = cache.get(id);
  if (a) { try { a.pause(); a.currentTime = 0; } catch { /* ignore */ } }
  if (ducking.delete(id) || pausing.delete(id)) syncMusic();
}

/** Stop every cue EXCEPT the background music (used when leaving gameplay).
 *  The short UI click is left alone so a click that triggers navigation can finish. */
export function stopGameSounds() {
  for (const id of cache.keys()) {
    if (id === 'music' || id === 'click') continue;
    const a = cache.get(id);
    try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
  }
  ducking.clear();
  pausing.clear();
  syncMusic();
}

/** Stop everything including the music (used on logout / leaving the game). */
export function stopAllSounds() {
  for (const id of cache.keys()) {
    if (id === 'music' || id === 'click') continue; // let a navigation/logout click finish
    const a = cache.get(id);
    try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
  }
  stopMusic();
}

// Dev only: before Vite hot-swaps this module, stop and release every audio
// element. Otherwise the previous module's looping background music keeps
// playing as an orphan that the reloaded module (and the settings toggle) can
// no longer control. Harmless / tree-shaken in production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const a of cache.values()) {
      try { a.pause(); a.src = ''; } catch { /* ignore */ }
    }
    cache.clear();
  });
}
