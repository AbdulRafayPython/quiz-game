import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

const LIGHT = '#F3E1F5';
const GOLD = '#FAB700';

// Frame 1 (3:12) — Home / Start
export default function HomeScreen({ onStart, onAdmin }) {
  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Logo (569×569 @ 484,179) */}
      <Box img={A('logo.png')} x={484} y={179} w={569} h={569} fit="contain" />

      {/* Start button graphic (inner 492×134 @ 522,766) */}
      <Box img={A('start-btn-5cac48.png')} x={522} y={766} w={492} h={134} />
      {/* "START" label (64px @ 667,780) */}
      <Box x={667} y={780} w={196} h={95} size={64} color={LIGHT} align="center" valign="center"
        style={{ pointerEvents: 'none', letterSpacing: 4 }}>
        START
      </Box>
      {/* Clickable hotspot over the whole start button instance (682×212 @ 427,711) */}
      <Box as="button" className="hot hotspot" x={427} y={711} w={682} h={212} onClick={onStart} aria-label="Start" />

      {/* Admin entry (not in the Figma frame — small unobtrusive link) */}
      <Box as="button" className="hot admin-link" x={28} y={978} w={220} h={28}
        size={16} color={GOLD} onClick={onAdmin}>
        ADMIN PANEL
      </Box>
    </Stage>
  );
}
