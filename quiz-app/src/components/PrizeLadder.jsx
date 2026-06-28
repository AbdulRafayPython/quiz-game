import Box, { A } from './Box';
import FitText from './FitText';
import { roundById } from '../data/rounds';

// Right-side prize ladder — same art and full, readable sizing as the original,
// but as a SCROLLING WINDOW so it works for any number of levels. Each round
// block holds one level per question (= team count). Only ~13 rows are visible
// at once; the reel auto-scrolls to keep the active level in view and the top &
// bottom edges fade to transparent so finished/upcoming levels slide away
// smoothly (e.g. the Buzzer round's 10 levels show, then it scrolls up to Timer).

const GOLD = '#FAB700';
const WHITE = '#FFFFFF';

const COL_LEFT = 1237;   // left edge of the right column
const COL_W = 263;       // column width
const TOP = 250;         // viewport top (below the SCORE BOARD header)
const BOTTOM = 840;      // viewport bottom (above the team bars)
const WINDOW_H = BOTTOM - TOP;
const PITCH = 45;        // native row pitch — full readable size, ~13 rows visible
const ANCHOR = 0.58;     // where the active row sits in the window (fraction down)
const FADE = 20;         // thin edge-fade (px) — only softens off-screen rows

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Group-local x (relative to COL_LEFT) for each element, matching the original
// stage coordinates (score-number @1240, bracket @1322, points @1340, …).
const X_NUM = 1240 - COL_LEFT;
const X_BR = 1322 - COL_LEFT;
const X_PTS_VAL = 1340 - COL_LEFT;
const X_PTS = 1464 - COL_LEFT;
const X_RND = 1297 - COL_LEFT;
const X_RING = 1294 - COL_LEFT;
const X_ARROW = 1271 - COL_LEFT;

export default function PrizeLadder({ roundSequence = [], ladder = [], activeLevel = 1, currentRoundId = null }) {
  const R = roundSequence.length;
  if (R === 0) return null;

  // Cumulative level offset per round (play order), so level numbers run 1..L.
  let acc = 0;
  const offsets = roundSequence.map((r) => { const o = acc; acc += r.count; return o; });

  // Build rows top-to-bottom: highest prize on top → rounds in reverse play
  // order, each round's levels listed high → low.
  const rows = [];
  for (let p = R - 1; p >= 0; p--) {
    rows.push({ type: 'label', roundId: roundSequence[p].id });
    for (let k = roundSequence[p].count - 1; k >= 0; k--) {
      rows.push({ type: 'level', level: offsets[p] + k + 1 });
    }
  }

  const contentH = rows.length * PITCH;
  const activeIdx = rows.findIndex((r) => r.type === 'level' && r.level === activeLevel);
  // Scroll the reel so the active row sits at ANCHOR, clamped so the window
  // never shows empty space past the first/last row.
  const lo = Math.min(0, WINDOW_H - contentH);
  const raw = ANCHOR * WINDOW_H - ((activeIdx < 0 ? 0 : activeIdx) * PITCH + PITCH / 2);
  const transY = clamp(raw, lo, 0);

  // Fade an edge ONLY when rows are actually hidden beyond it, and keep the band
  // thin — so the first/last visible level (e.g. level 1 pinned at the bottom)
  // stays fully solid and only off-screen rows soften away.
  const top = transY < -0.5 ? `transparent 0, #000 ${FADE}px` : '#000 0';
  const bot = transY > lo + 0.5 ? `#000 calc(100% - ${FADE}px), transparent 100%` : '#000 100%';
  const fade = `linear-gradient(to bottom, ${top}, ${bot})`;

  return (
    <div style={{
      position: 'absolute', left: COL_LEFT, top: TOP, width: COL_W, height: WINDOW_H,
      overflow: 'hidden', pointerEvents: 'none',
      WebkitMaskImage: fade, maskImage: fade,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: COL_W,
        transform: `translateY(${transY}px)`,
        transition: 'transform 520ms cubic-bezier(0.22, 0.61, 0.36, 1)',
      }}>
        {rows.map((row, i) => {
          const cy = i * PITCH + PITCH / 2;   // row centre, inner-content coords

          if (row.type === 'label') {
            const active = row.roundId === currentRoundId;
            const label = roundById(row.roundId).label;
            return (
              <div key={`r${i}`} style={{
                opacity: active ? 1 : 0.4,
                filter: active ? 'drop-shadow(0 0 14px rgba(250,183,0,1))' : undefined,
              }}>
                <Box img={A('round-bracket.png')} x={X_RND} y={cy - 15.5} w={140} h={31} style={{ pointerEvents: 'none' }} />
                {active && (
                  <Box x={X_RING} y={cy - 18.5} w={146} h={37} style={{
                    pointerEvents: 'none', border: '2px solid #FAB700', borderRadius: 9,
                    background: 'rgba(250,183,0,0.22)',
                    boxShadow: '0 0 14px rgba(250,183,0,0.9), inset 0 0 8px rgba(250,183,0,0.45)',
                  }} />
                )}
                <Box x={X_RND} y={cy - 15.5} w={140} h={31} size={active ? 13 : 11} color={active ? GOLD : WHITE}
                  align="center" valign="center"
                  style={{ pointerEvents: 'none', fontWeight: active ? 800 : 400, letterSpacing: active ? 0.4 : 0 }}>
                  {label}
                </Box>
                {active && (
                  <Box x={X_ARROW} y={cy - 15.5} w={22} h={31} size={17} color={GOLD} align="center" valign="center"
                    style={{ pointerEvents: 'none', textShadow: '0 0 8px rgba(250,183,0,0.9)' }}>▶</Box>
                )}
              </div>
            );
          }

          const active = row.level === activeLevel;
          const pts = ladder[row.level - 1] ?? 0;
          return (
            <div key={`r${i}`} style={active ? { filter: 'drop-shadow(0 0 10px rgba(250,183,0,0.95))' } : undefined}>
              <Box img={A('score-number.png')} x={X_NUM} y={cy - 16.5} w={74} h={33} style={{ pointerEvents: 'none' }} />
              <Box img={A('score-bracket.png')} x={X_BR} y={cy - 18} w={175} h={36} style={{ pointerEvents: 'none' }} />
              <Box x={X_NUM} y={cy - 16.5} w={74} h={33} size={16} color={GOLD} align="center" valign="center"
                style={{ pointerEvents: 'none' }}>{row.level}</Box>
              <Box x={X_PTS_VAL} y={cy - 18} w={118} h={36} size={16} color={active ? GOLD : WHITE} valign="center"
                style={{ pointerEvents: 'none' }}>
                <FitText maxWidth={118} align="left" value={pts.toLocaleString()} />
              </Box>
              <Box x={X_PTS} y={cy - 18} w={30} h={36} size={12} color={GOLD} valign="center"
                style={{ pointerEvents: 'none' }}>PTS</Box>
            </div>
          );
        })}
      </div>
    </div>
  );
}
