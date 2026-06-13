import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { playSound } from '../lib/sound';
import './screens.css';

const LIGHT = '#F3E1F5';

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
      {/* Clickable hotspot over the start button graphic (492×134 @ 522,766) */}
      <Box as="button" className="hot hotspot" x={522} y={766} w={492} h={134}
        onClick={() => { playSound('click'); onStart?.(); }} aria-label="Start" />

      {/* Admin entry — styled pill button (matches the LOGIN screen's ADMIN PANEL tag) */}
      <Box img={A('panels-buttons.png')} x={1202} y={34} w={301} h={77} style={{ pointerEvents: 'none' }} />
      <Box x={1244} y={48} w={216} h={47} size={32} color={LIGHT} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>ADMIN PANEL</Box>
      <Box as="button" className="hot hotspot" x={1202} y={34} w={301} h={77}
        onClick={() => { playSound('click'); onAdmin?.(); }} aria-label="Admin Panel" style={{ borderRadius: 12 }} />
    </Stage>
  );
}
