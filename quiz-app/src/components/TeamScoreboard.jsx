import Box, { A } from './Box';
import FitText from './FitText';

// Adaptive bottom scoreboard for the gameplay stage. Renders 1–10 team bars in
// one row (≤5 teams) or two centred rows (6–10), all sharing a single bottom
// edge so the band stays aligned no matter how many teams there are. Each bar is
// the ornate team-bracket art scaled by one factor (so the artwork never warps),
// with its name + score scaled to match. The active / buzzer-locked team glows
// gold, and in a Buzzer round every bar is a buzz button.

const MARGIN = 24;          // min gap from the stage edges
const GAP = 14;             // horizontal gap between bars
const ROW_GAP = 12;         // vertical gap between the two rows
const BAND_BOTTOM = 978;    // bottom edge of the whole band
const BAND_TOP_MIN = 846;   // top edge cannot rise into the answer options (@842)
const BAND_BUDGET = BAND_BOTTOM - BAND_TOP_MIN; // vertical room for all rows
const BAR = { w: 497, h: 94 };
const AR = BAR.w / BAR.h;   // bracket aspect ratio (~5.29)
// Inner element offsets, measured from a full-size bar's top-left corner.
const NAME  = { dx: 119, dy: 27, w: 151, h: 36, size: 24 };
const SCORE = { dx: 280, dy: 13, w: 130, h: 59, size: 36 };

function layout(n) {
  const rows = n <= 5 ? 1 : 2;
  const cols = rows === 1 ? n : Math.ceil(n / 2);
  // A bar is constrained by BOTH the available row width and the vertical band
  // budget; take the smaller so two rows never grow up into the options. The
  // bracket keeps its aspect ratio (no squish) — extra space just centres it.
  const wFromWidth = (1536 - 2 * MARGIN - (cols - 1) * GAP) / cols;
  const maxH = (BAND_BUDGET - (rows - 1) * ROW_GAP) / rows;
  const wFromHeight = maxH * AR;
  const w = Math.min(BAR.w, wFromWidth, wFromHeight);
  const h = w / AR;
  const scale = w / BAR.w;
  const bandH = rows * h + (rows - 1) * ROW_GAP;
  const top0 = BAND_BOTTOM - bandH;
  return Array.from({ length: n }, (_, i) => {
    const r = rows === 1 ? 0 : (i < cols ? 0 : 1);
    const idxInRow = r === 0 ? i : i - cols;
    const countInRow = r === 0 ? Math.min(cols, n) : n - cols;
    const rowW = countInRow * w + (countInRow - 1) * GAP;
    const startX = (1536 - rowW) / 2;       // centre each row (handles short last row)
    return {
      x: startX + idxInRow * (w + GAP),
      y: top0 + r * (h + ROW_GAP),
      w, h, scale,
    };
  });
}

export default function TeamScoreboard({
  teams = [],
  isBuzzer = false,
  turnTeamIndex = 0,
  lockedTeamIndex = null,
  awaitingBuzz = false,
  onBuzz,
}) {
  const visible = teams.slice(0, 10);
  const slots = layout(visible.length);

  return visible.map((team, i) => {
    const s = slots[i];
    const locked = isBuzzer && lockedTeamIndex === i;
    const active = locked || (!isBuzzer && i === turnTeamIndex);
    return (
      <div key={i} style={active ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.7))' } : undefined}>
        <Box img={A('team-bracket.png')} x={s.x} y={s.y} w={s.w} h={s.h} style={{ pointerEvents: 'none' }} />
        {/* Name is capped so a long/negative score (right-anchored) can never
            collide with it — there's always a gap between the two. */}
        <Box x={s.x + NAME.dx * s.scale} y={s.y + NAME.dy * s.scale}
          w={NAME.w * s.scale} h={NAME.h * s.scale} size={NAME.size * s.scale}
          color="#F3E1F5" valign="center"
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {team.name}
        </Box>
        <Box x={s.x + SCORE.dx * s.scale} y={s.y + SCORE.dy * s.scale}
          w={SCORE.w * s.scale} h={SCORE.h * s.scale} size={SCORE.size * s.scale}
          color={team.score < 0 ? '#ff7a7a' : '#F3E1F5'} align="right" valign="center"
          style={{ pointerEvents: 'none' }}>
          <FitText maxWidth={SCORE.w * s.scale} align="right" value={team.score.toLocaleString()} />
        </Box>
        {awaitingBuzz && (
          <Box as="button" className="hot hotspot" x={s.x} y={s.y} w={s.w} h={s.h}
            onClick={() => onBuzz?.(i)} aria-label={`${team.name} buzzed`}
            style={{ borderRadius: 12 * s.scale }} />
        )}
      </div>
    );
  });
}
