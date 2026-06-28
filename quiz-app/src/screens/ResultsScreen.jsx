import { useEffect, useRef } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import FitText from '../components/FitText';
import { isSupabaseConfigured } from '../lib/supabase';
import { saveGameResult } from '../lib/api';
import { playSound } from '../lib/sound';
import './screens.css';

const GOLD = '#FAB700';
const LIGHT = '#F3E1F5';

// Frame 8 (52:7) — Results / Win
// Bottom ranking brackets (1152×71 group @192,884), three 372×71 slots.
const BRACKET_W = 372;
const SLOTS = [
  { bx: 192, nameX: 282 },
  { bx: 582, nameX: 669 },
  { bx: 972, nameX: 1059 },
];

export default function ResultsScreen({ teamResults = [], quizName = null, onRestart }) {
  const ranked = [...teamResults].sort((a, b) => b.score - a.score);
  const winner = ranked[0] || { name: 'No Team', score: 0 };
  const others = ranked.slice(1);       // every runner-up (places 2..N)
  const useBrackets = others.length <= 3; // ≤3 keeps the ornate bracket look
  // For 4+ runners-up, lay them out in a compact ranking grid (2 cols up to 6,
  // 3 cols up to 9) that fits the bottom band without overflowing the stage.
  const gridCols = others.length <= 6 ? 2 : 3;
  const gridRows = Math.ceil(others.length / gridCols);

  // Persist the finished game once (for history / leaderboard).
  const saved = useRef(false);
  useEffect(() => {
    if (saved.current || !isSupabaseConfigured || teamResults.length === 0) return;
    saved.current = true;
    saveGameResult({
      quizName,
      teams: ranked.map((t) => ({ name: t.name, score: t.score })),
      winner: winner.name,
    }).catch((e) => console.error('Failed to save result:', e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />
      <Box img={A('confetti-bg.png')} x={-1} y={-16} w={1537} h={1537} fit="cover"
        style={{ pointerEvents: 'none' }} />

      {/* Next (restart) */}
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={() => { playSound('click'); onRestart?.(); }} aria-label="Continue" />

      {/* Trophy + banner (995×485 @ 270,242) */}
      <Box img={A('trophy-banner.png')} x={270} y={242} w={995} h={485} style={{ pointerEvents: 'none' }} />

      {/* Winner name (64px gold @ 572,551) */}
      <Box x={572} y={551} w={392} h={95} size={64} color={GOLD} upper align="center" valign="center"
        style={{ pointerEvents: 'none' }}>
        {winner.name}
      </Box>
      {/* "Win the Quiz!" (32px regular @ 650,632) */}
      <Box x={650} y={632} w={255} h={47} size={32} regular color={LIGHT} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>
        Win the Quiz!
      </Box>
      {/* Final score (48px gold @ 445,743) — auto-shrinks so a big score fits */}
      <Box x={445} y={743} w={647} h={71} size={48} color={GOLD} upper align="center" valign="center"
        style={{ pointerEvents: 'none' }}>
        <FitText maxWidth={627} value={`Final Score: ${winner.score.toLocaleString()} PTS`} />
      </Box>

      {/* Bottom ranking brackets — the bracket ends in a right-pointing chevron,
          so the score must stay inside the flat fill area (~85% across), not the
          box edge. Right-aligned + FitText so big/negative numbers grow inward. */}
      {useBrackets && others.map((team, i) => {
        const s = SLOTS[i];
        const scoreW = 124;
        const scoreX = s.bx + 188; // right edge lands ~offset 312, clear of the chevron
        return (
          <div key={i}>
            <Box img={A('team-bracket.png')} x={s.bx} y={884} w={BRACKET_W} h={71} style={{ pointerEvents: 'none' }} />
            <Box x={s.nameX} y={884 + 23} w={scoreX - s.nameX - 8} h={28} size={14} color={LIGHT} valign="center"
              style={{ pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {team.name}
            </Box>
            <Box x={scoreX} y={884 + 16} w={scoreW} h={44} size={24} color={LIGHT} align="right" valign="center"
              style={{ pointerEvents: 'none' }}>
              <FitText maxWidth={scoreW} align="right" value={team.score.toLocaleString()} />
            </Box>
          </div>
        );
      })}

      {/* Compact ranking grid for 4+ runners-up (5–10 team games) */}
      {!useBrackets && (() => {
        const AREA_X = 200, AREA_W = 1136, AREA_TOP = 845, AREA_H = 162;
        const GAP = 14, ROW_GAP = 12;
        const cellW = (AREA_W - (gridCols - 1) * GAP) / gridCols;
        const cellH = Math.min(56, (AREA_H - (gridRows - 1) * ROW_GAP) / gridRows);
        return others.map((team, k) => {
          const row = Math.floor(k / gridCols);
          const col = k % gridCols;
          const countInRow = Math.min(gridCols, others.length - row * gridCols);
          const rowW = countInRow * cellW + (countInRow - 1) * GAP;
          const rowStartX = AREA_X + (AREA_W - rowW) / 2;
          const x = rowStartX + col * (cellW + GAP);
          const y = AREA_TOP + row * (cellH + ROW_GAP);
          return (
            <div key={k} style={{
              position: 'absolute', left: x, top: y, width: cellW, height: cellH,
              display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
              boxSizing: 'border-box', borderRadius: 12,
              background: 'rgba(26, 2, 48, 0.85)', border: '2px solid rgba(250,183,0,0.5)',
              fontFamily: "'Space Mono', monospace", pointerEvents: 'none',
              boxShadow: '0 0 10px rgba(250,183,0,0.18)',
            }}>
              <span style={{ color: GOLD, fontWeight: 700, fontSize: 22, minWidth: 30 }}>{k + 2}</span>
              <span style={{
                color: LIGHT, fontWeight: 700, fontSize: 18, flex: 1, minWidth: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{team.name}</span>
              <span style={{
                color: team.score < 0 ? '#ff7a7a' : LIGHT, fontWeight: 700, fontSize: 18,
                whiteSpace: 'nowrap',
              }}>{team.score.toLocaleString()}</span>
            </div>
          );
        });
      })()}
    </Stage>
  );
}
