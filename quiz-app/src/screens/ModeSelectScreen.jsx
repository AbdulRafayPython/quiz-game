import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { playSound } from '../lib/sound';
import './screens.css';

// Frame 2 (6:11) — Mode Select
export default function ModeSelectScreen({ onSelectMode, onExit }) {
  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Exit button (95×88 @ 70,68) */}
      <Box as="button" className="hot" img={A('exit-btn-634404.png')} x={70} y={68} w={95} h={88}
        onClick={() => { playSound('click'); onExit?.(); }} aria-label="Exit" />

      {/* Logo (449×449 @ 544,187) */}
      <Box img={A('logo.png')} x={544} y={187} w={449} h={449} fit="contain" />

      {/* Quick Play card (353×189 @ 370,715) */}
      <Box as="button" className="hot" img={A('card-quickplay.png')} x={370} y={715} w={353} h={189}
        onClick={() => { playSound('click'); onSelectMode('quick'); }} aria-label="Quick Play" />

      {/* Team Play card (353×191 @ 806,713) */}
      <Box as="button" className="hot" img={A('card-teamplay.png')} x={806} y={713} w={353} h={191}
        onClick={() => { playSound('click'); onSelectMode('team'); }} aria-label="Team Play" />
    </Stage>
  );
}
