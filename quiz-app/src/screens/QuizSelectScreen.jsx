import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

const LIGHT = '#F3E1F5';

// Frame 4 (37:7) — Select Quiz
const CATEGORIES = [
  { id: 'science', name: 'Science Quiz', y: 245 },
  { id: 'math', name: 'Mathematics Quiz', y: 352 },
  { id: 'english', name: 'English Quiz', y: 459 },
  { id: 'chemistry', name: 'Chemistry Quiz', y: 566 },
];

export default function QuizSelectScreen({ onBack, onSelectQuiz }) {
  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Back button (308×205 @ 0,-30) */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={onBack} aria-label="Back" />

      {/* Select-quiz panel (587×880 @ 474,65) */}
      <Box img={A('quiz-panel.png')} x={474} y={65} w={587} h={880} />

      {CATEGORIES.map((c) => (
        <div key={c.id}>
          {/* Quiz bar (497×107) */}
          <Box as="button" className="hot" img={A('quiz-bar-21ddd1.png')} x={519} y={c.y} w={497} h={107}
            onClick={() => onSelectQuiz(c)} aria-label={c.name} />
          {/* Label (24px @ 589, +29) */}
          <Box x={589} y={c.y + 29} w={360} h={48} size={24} color={LIGHT} valign="center"
            style={{ pointerEvents: 'none' }}>
            {c.name}
          </Box>
        </div>
      ))}
    </Stage>
  );
}
