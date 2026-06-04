import { useState, useEffect, useRef } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

const GOLD = '#FAB700';
const WHITE = '#FFFFFF';

// Sample questions database by category
const QUESTIONS = {
  science: [
    { q: 'What is the chemical formula\nof water?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
    { q: 'Which planet is known as\nthe Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
    { q: 'What is the hardest natural\nsubstance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
    { q: 'What gas do plants absorb\nduring photosynthesis?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], answer: 1 },
    { q: 'How many bones are in an\nadult human body?', options: ['186', '206', '216', '226'], answer: 1 },
    { q: 'What is the center of an\natom called?', options: ['Proton', 'Electron', 'Nucleus', 'Neutron'], answer: 2 },
    { q: "Most abundant gas in\nEarth's atmosphere?", options: ['Oxygen', 'Nitrogen', 'CO2', 'Argon'], answer: 1 },
    { q: 'Boiling point of water\nin Celsius?', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1 },
    { q: 'What is the power house\nof the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Lysosome'], answer: 2 },
    { q: 'Who proposed the theory\nof relativity?', options: ['Newton', 'Einstein', 'Tesla', 'Curie'], answer: 1 },
  ],
  math: [
    { q: 'What is the square root\nof 144?', options: ['10', '11', '12', '13'], answer: 2 },
    { q: 'Value of Pi to 2\ndecimal places?', options: ['3.12', '3.14', '3.16', '3.18'], answer: 1 },
    { q: 'What is 7 multiplied\nby 8?', options: ['54', '56', '58', '62'], answer: 1 },
    { q: 'How many degrees in\na right angle?', options: ['45°', '90°', '180°', '360°'], answer: 1 },
    { q: 'Next prime number\nafter 7?', options: ['9', '11', '13', '15'], answer: 1 },
    { q: 'Solve: 2 + 2 * 2', options: ['4', '6', '8', '10'], answer: 1 },
    { q: 'Roman numeral for 50?', options: ['V', 'X', 'L', 'C'], answer: 2 },
    { q: 'How many sides does a\nheptagon have?', options: ['6', '7', '8', '9'], answer: 1 },
    { q: 'What is 15% of 200?', options: ['15', '20', '30', '40'], answer: 2 },
    { q: 'If x + 5 = 12,\nwhat is x?', options: ['5', '7', '8', '9'], answer: 1 },
  ],
  english: [
    { q: 'Which of these is\na noun?', options: ['Run', 'Beautiful', 'Happiness', 'Quickly'], answer: 2 },
    { q: "Antonym of 'Generous'?", options: ['Kind', 'Selfish', 'Happy', 'Polite'], answer: 1 },
    { q: 'What is a group of\nlions called?', options: ['Pack', 'Herd', 'Pride', 'Flock'], answer: 2 },
    { q: 'Choose the correct\nspelling:', options: ['Recieve', 'Receive', 'Receve', 'Recive'], answer: 1 },
    { q: "Who wrote 'Romeo\nand Juliet'?", options: ['Dickens', 'Shakespeare', 'Twain', 'Austen'], answer: 1 },
    { q: 'Which is in the\npast tense?', options: ['I run', 'I will run', 'I ran', 'I am running'], answer: 2 },
    { q: 'A person who writes\nbooks is a(n)...', options: ['Actor', 'Author', 'Artist', 'Architect'], answer: 1 },
    { q: "Synonym for 'Huge'?", options: ['Tiny', 'Gigantic', 'Weak', 'Fast'], answer: 1 },
    { q: "Plural of 'child'?", options: ['Childs', 'Children', 'Childrens', 'Childes'], answer: 1 },
    { q: "Comparison using 'like'\nor 'as' is a...", options: ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], answer: 1 },
  ],
  chemistry: [
    { q: 'Atomic symbol for Gold?', options: ['Ag', 'Au', 'Fe', 'Cu'], answer: 1 },
    { q: 'pH level of pure water?', options: ['5', '7', '9', '11'], answer: 1 },
    { q: 'Which element is a\nnoble gas?', options: ['Oxygen', 'Hydrogen', 'Helium', 'Chlorine'], answer: 2 },
    { q: 'Chemical formula for\ntable salt?', options: ['H2O', 'CO2', 'NaCl', 'HCl'], answer: 2 },
    { q: 'Gas produced when acid\nreacts with metal?', options: ['Oxygen', 'Hydrogen', 'CO2', 'Nitrogen'], answer: 1 },
    { q: 'Atomic number of\nCarbon?', options: ['4', '6', '8', '12'], answer: 1 },
    { q: 'Liquid turning into gas\nis called?', options: ['Freezing', 'Melting', 'Evaporation', 'Condensation'], answer: 2 },
    { q: 'Father of modern\nchemistry?', options: ['Lavoisier', 'Mendeleev', 'Dalton', 'Curie'], answer: 0 },
    { q: 'Chemical formula\nof Methane?', options: ['CO2', 'CH4', 'C2H6', 'H2O'], answer: 1 },
    { q: 'Particle with a\nnegative charge?', options: ['Proton', 'Neutron', 'Electron', 'Nucleus'], answer: 2 },
  ],
};

const LADDER_SCORES = [10, 30, 50, 100, 500, 1000, 10000, 100000, 1000000, 10000000];

// Pure helpers (module scope so render purity rules aren't tripped by Math.random)
function pickTwoWrong(correct) {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct);
  return wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
}
function makeAudiencePoll(correct) {
  const poll = [10, 10, 10, 10];
  poll[correct] = 55;
  let left = 100 - poll.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4 && left > 0; i++) {
    if (i !== correct) {
      const v = Math.floor(Math.random() * left);
      poll[i] += v;
      left -= v;
    }
  }
  poll[correct] += left;
  return poll;
}

// Prize ladder rows, top (level 10) → bottom (level 1). Amount strings match the Figma exactly.
const LADDER = [
  { lvl: 10, amount: '10,000,000', y: 283 },
  { lvl: 9, amount: '10,000,00', y: 328 },
  { lvl: 8, amount: '10,000,0', y: 403 },
  { lvl: 7, amount: '10,000', y: 448 },
  { lvl: 6, amount: '1000', y: 523 },
  { lvl: 5, amount: '500', y: 568 },
  { lvl: 4, amount: '100', y: 643 },
  { lvl: 3, amount: '50', y: 688 },
  { lvl: 2, amount: '30', y: 763 },
  { lvl: 1, amount: '10', y: 808 },
];

const ROUNDS = [
  { label: 'General Round', y: 248 },
  { label: 'ASK Audience', y: 368 },
  { label: '50:50', y: 488 },
  { label: 'Timer Round', y: 607 },
  { label: 'Buzzer Round', y: 728 },
];

// Option slots — index → screen position + colour image (TL, TR, BL, BR)
const OPTION_SLOTS = [
  { x: 348, y: 689, w: 413, h: 73, img: 'opt-purple.png' },
  { x: 778, y: 689, w: 412, h: 73, img: 'opt-red.png' },
  { x: 348, y: 767, w: 411, h: 74, img: 'opt-green.png' },
  { x: 778, y: 767, w: 411, h: 75, img: 'opt-yellow.png' },
];

const LIFELINES = [
  { id: 'fifty', img: 'lifeline-5050.png', y: 467 },
  { id: 'phone', img: 'lifeline-phone.png', y: 585 },
  { id: 'audience', img: 'lifeline-audience.png', y: 703 },
];

// Bottom team bars — two 497×94 slots
const TEAM_SLOTS = [
  { bx: 261, nameX: 380, scoreX: 607 },
  { bx: 773, nameX: 892, scoreX: 1072 },
];

export default function GameplayScreen({ quizCategory, initialTeams = [], onFinish }) {
  const categoryId = quizCategory?.id || 'science';
  const questionsList = QUESTIONS[categoryId] || QUESTIONS.science;

  const [teams, setTeams] = useState(
    initialTeams.length > 0
      ? initialTeams.map((t) => ({ ...t, score: 0 }))
      : [{ name: 'Solo Player', score: 0 }]
  );
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [running, setRunning] = useState(true);

  const [usedLifelines, setUsedLifelines] = useState([]);
  const [audiencePoll, setAudiencePoll] = useState(null);
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const intervalRef = useRef(null);
  const currentQuestion = questionsList[questionIndex] || questionsList[0];
  const isLast = questionIndex >= questionsList.length - 1;

  // Countdown
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!running || isAnswered) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsAnswered(true);
          setSelectedOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, isAnswered]);

  const handleSelectOption = (idx) => {
    if (isAnswered || hiddenOptions.includes(idx)) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    setRunning(false);
    if (idx === currentQuestion.answer) {
      const points = LADDER_SCORES[currentLevel - 1];
      setTeams((prev) => {
        const next = [...prev];
        next[currentTeamIndex] = { ...next[currentTeamIndex], score: next[currentTeamIndex].score + points };
        return next;
      });
    }
  };

  const handleNext = () => {
    if (isLast || currentLevel >= 10) {
      onFinish(teams);
      return;
    }
    const correct = selectedOption === currentQuestion.answer;
    setCurrentLevel((lvl) => (correct ? Math.min(lvl + 1, 10) : Math.max(lvl - 1, 1)));
    if (teams.length > 1) setCurrentTeamIndex((i) => (i + 1) % teams.length);
    setQuestionIndex((i) => i + 1);
    // Reset per-question state for the next question
    setSelectedOption(null);
    setIsAnswered(false);
    setAudiencePoll(null);
    setHiddenOptions([]);
    setSecondsLeft(15);
    setRunning(true);
  };

  const handleUseLifeline = (id) => {
    if (isAnswered || usedLifelines.includes(id)) return;
    setUsedLifelines((u) => [...u, id]);

    if (id === 'fifty') {
      setHiddenOptions(pickTwoWrong(currentQuestion.answer));
    } else if (id === 'audience') {
      setAudiencePoll(makeAudiencePoll(currentQuestion.answer));
    } else if (id === 'phone') {
      setSecondsLeft((s) => s + 10); // extra time
    }
  };

  const optionLabel = (idx) => {
    if (hiddenOptions.includes(idx)) return '';
    const base = currentQuestion.options[idx];
    return audiencePoll ? `${base}  ${audiencePoll[idx]}%` : base;
  };

  const optionClass = (idx) => {
    if (hiddenOptions.includes(idx)) return 'opt is-hidden';
    if (!isAnswered) return selectedOption === idx ? 'opt is-selected' : 'opt';
    if (idx === currentQuestion.answer) return 'opt is-correct';
    if (idx === selectedOption) return 'opt is-wrong';
    return 'opt';
  };

  const teamScore = teams[currentTeamIndex]?.score || 0;

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />

      {/* Back / Next */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={() => onFinish(teams)} aria-label="Back" />
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={handleNext} aria-label={isLast ? 'Results' : 'Next'} />

      {/* Resume (resumes the countdown) */}
      <Box img={A('resume-orange.png')} x={51} y={113} w={205} h={62} style={{ pointerEvents: 'none' }} />
      <Box as="button" className="hot hotspot" x={51} y={113} w={205} h={62}
        onClick={() => !isAnswered && setRunning(true)} aria-label="Resume"
        style={{ borderRadius: 8 }} />
      <Box x={95} y={118} w={118} h={47} size={32} color={WHITE} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>RESUME</Box>

      {/* Timer ring + count */}
      <Box img={A('timer-ring.png')} x={68} y={217} w={185} h={185} style={{ pointerEvents: 'none' }} />
      <Box x={116} y={251} w={89} h={107} size={72} color={secondsLeft <= 5 ? '#ff5a5a' : WHITE}
        align="center" valign="center" style={{ pointerEvents: 'none' }}>
        {secondsLeft}
      </Box>

      {/* Lifelines */}
      {LIFELINES.map((l) => (
        <Box key={l.id} as="button" className="hot" img={A(l.img)} x={57} y={l.y} w={207} h={138}
          disabled={usedLifelines.includes(l.id) || isAnswered}
          onClick={() => handleUseLifeline(l.id)} aria-label={l.id} />
      ))}

      {/* Question bracket + text */}
      <Box img={A('question-bracket.png')} x={331} y={532} w={875} h={133} style={{ pointerEvents: 'none' }} />
      <Box x={443} y={557} w={483} h={84} size={24} color={WHITE} lh={32} valign="center"
        style={{ pointerEvents: 'none' }}>
        {currentQuestion.q}
      </Box>

      {/* Options */}
      {OPTION_SLOTS.map((s, i) => (
        <div key={i}>
          <Box as="button" className={`hot ${optionClass(i)}`} img={A(s.img)}
            x={s.x} y={s.y} w={s.w} h={s.h} disabled={isAnswered}
            onClick={() => handleSelectOption(i)} aria-label={`Option ${i + 1}`} />
          <Box x={s.x} y={s.y} w={s.w} h={s.h} size={24} color={WHITE} align="center" valign="center"
            style={{ pointerEvents: 'none', padding: '0 20px' }}>
            {optionLabel(i)}
          </Box>
        </div>
      ))}

      {/* Scoreboard header + total */}
      <Box img={A('scoreboard-header.png')} x={1237} y={144} w={260} h={99} style={{ pointerEvents: 'none' }} />
      <Box x={1294} y={197} w={166} h={33} size={24} color={WHITE} valign="center"
        style={{ pointerEvents: 'none' }}>
        {teamScore.toLocaleString()}
      </Box>

      {/* Round labels */}
      {ROUNDS.map((r) => (
        <div key={r.label}>
          <Box img={A('round-bracket.png')} x={1297} y={r.y} w={140} h={31} style={{ pointerEvents: 'none' }} />
          <Box x={1297} y={r.y} w={140} h={31} size={11} color={WHITE} align="center" valign="center"
            style={{ pointerEvents: 'none' }}>
            {r.label}
          </Box>
        </div>
      ))}

      {/* Prize ladder */}
      {LADDER.map((row) => {
        const active = row.lvl === currentLevel;
        return (
          <div key={row.lvl} className={active ? 'ladder-row-active' : undefined}>
            <Box img={A('score-number.png')} x={1240} y={row.y} w={74} h={33} style={{ pointerEvents: 'none' }} />
            <Box img={A('score-bracket.png')} x={1322} y={row.y} w={175} h={36} style={{ pointerEvents: 'none' }} />
            <Box x={1240} y={row.y} w={74} h={33} size={16} color={GOLD} align="center" valign="center"
              style={{ pointerEvents: 'none' }}>{row.lvl}</Box>
            <Box x={1340} y={row.y} w={118} h={36} size={16} color={active ? GOLD : WHITE} valign="center"
              style={{ pointerEvents: 'none' }}>{row.amount}</Box>
            <Box x={1464} y={row.y} w={30} h={36} size={12} color={GOLD} valign="center"
              style={{ pointerEvents: 'none' }}>PTS</Box>
          </div>
        );
      })}

      {/* Bottom team bars */}
      {teams.slice(0, 2).map((team, i) => {
        const s = TEAM_SLOTS[i];
        const active = i === currentTeamIndex;
        return (
          <div key={i} style={active ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.7))' } : undefined}>
            <Box img={A('team-bracket.png')} x={s.bx} y={884} w={497} h={94} style={{ pointerEvents: 'none' }} />
            <Box x={s.nameX} y={911} w={210} h={36} size={24} color="#F3E1F5" valign="center"
              style={{ pointerEvents: 'none' }}>{team.name}</Box>
            <Box x={s.scoreX} y={897} w={180} h={59} size={40} color="#F3E1F5" valign="center"
              style={{ pointerEvents: 'none' }}>{team.score.toLocaleString()}</Box>
          </div>
        );
      })}
    </Stage>
  );
}
