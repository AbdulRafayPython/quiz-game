import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

const GOLD = '#FAB700';
const LIGHT = '#F3E1F5';

// Frame 8 (52:7) — Results / Win
// Bottom ranking brackets (1152×71 group @192,884), three 372×71 slots.
const SLOTS = [
  { bx: 192, nameX: 282, scoreX: 477 },
  { bx: 582, nameX: 669, scoreX: 805 },
  { bx: 972, nameX: 1059, scoreX: 1195 },
];

export default function ResultsScreen({ teamResults = [], onRestart }) {
  const ranked = [...teamResults].sort((a, b) => b.score - a.score);
  const winner = ranked[0] || { name: 'No Team', score: 0 };
  const others = ranked.slice(1, 4); // up to 3 in the bottom brackets

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />
      <Box img={A('confetti-bg.png')} x={-1} y={-16} w={1537} h={1537} fit="cover"
        style={{ pointerEvents: 'none' }} />

      {/* Next (restart) */}
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={onRestart} aria-label="Continue" />

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
      {/* Final score (48px gold @ 445,743) */}
      <Box x={445} y={743} w={647} h={71} size={48} color={GOLD} upper align="center" valign="center"
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {`Final Score: ${winner.score} PTS`}
      </Box>

      {/* Bottom ranking brackets */}
      {others.map((team, i) => {
        const s = SLOTS[i];
        return (
          <div key={i}>
            <Box img={A('team-bracket.png')} x={s.bx} y={884} w={372} h={71} style={{ pointerEvents: 'none' }} />
            <Box x={s.nameX} y={884 + 23} w={s.scoreX - s.nameX - 8} h={28} size={14} color={LIGHT} valign="center"
              style={{ pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {team.name}
            </Box>
            <Box x={s.scoreX} y={884 + 16} w={150} h={44} size={24} color={LIGHT} valign="center"
              style={{ pointerEvents: 'none' }}>
              {team.score.toLocaleString()}
            </Box>
          </div>
        );
      })}
    </Stage>
  );
}
