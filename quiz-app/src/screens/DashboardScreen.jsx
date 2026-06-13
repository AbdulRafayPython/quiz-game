import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { playSound } from '../lib/sound';
import './screens.css';

// Frame "Dashboard" (47:65) — admin home
export default function DashboardScreen({ onExit, onCreateQuiz, onViewQuizzes }) {
  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Exit (95×88 @ 70,68) → home */}
      <Box as="button" className="hot" img={A('exit-btn-634404.png')} x={70} y={68} w={95} h={88}
        onClick={() => { playSound('click'); onExit?.(); }} aria-label="Exit" />

      {/* Logo (443×443 @ 547,184) */}
      <Box img={A('logo.png')} x={547} y={184} w={443} h={443} fit="contain" />

      {/* View Quizzes (438×223 @ 321,697) */}
      <Box as="button" className="hot" img={A('view-quizzes-btn.png')} x={321} y={697} w={438} h={223}
        onClick={() => { playSound('click'); onViewQuizzes?.(); }} aria-label="View Quizzes" />

      {/* Create Quiz (439×224 @ 774,696) */}
      <Box as="button" className="hot" img={A('create-quiz-btn.png')} x={774} y={696} w={439} h={224}
        onClick={() => { playSound('click'); onCreateQuiz?.(); }} aria-label="Create Quiz" />
    </Stage>
  );
}
