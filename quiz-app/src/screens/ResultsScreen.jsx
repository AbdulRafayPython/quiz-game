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
  const others = ranked.slice(1, 4); // up to 3 in the bottom brackets

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
      {others.map((team, i) => {
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
    </Stage>
  );
}
