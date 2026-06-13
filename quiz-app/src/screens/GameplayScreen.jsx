import { useState, useEffect, useRef } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { roundById, DEFAULT_SCORING } from '../data/rounds';
import { playSound, stopSound, stopGameSounds } from '../lib/sound';
import './screens.css';

const GOLD = '#FAB700';
const WHITE = '#FFFFFF';

// After a team locks an answer the question doesn't resolve immediately — the
// timer drops to this short, dramatic window (the locked button glows yellow and
// the suspense sound loops) before the answer is finally revealed.
const SUSPENSE_SECONDS = 4;

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

// Scoreboard point ladder (level 1..10). A question's value = the level for its
// position: Q1 → 10, Q2 → 30, … Q10 → 10,000,000. Quizzes longer than 10
// questions stay at the top value. Correct earns it; wrong/timeout subtracts it.
const LADDER_POINTS = [10, 30, 50, 100, 500, 1000, 10000, 100000, 1000000, 10000000];
const pointsForIndex = (i) => LADDER_POINTS[Math.min(i, LADDER_POINTS.length - 1)];

// Prize ladder display rows (lvl 10 at top → lvl 1 at bottom); amount derives
// from LADDER_POINTS so the board and the scoring always agree.
const LADDER = [
  { lvl: 10, y: 283 },
  { lvl: 9, y: 328 },
  { lvl: 8, y: 403 },
  { lvl: 7, y: 448 },
  { lvl: 6, y: 523 },
  { lvl: 5, y: 568 },
  { lvl: 4, y: 643 },
  { lvl: 3, y: 688 },
  { lvl: 2, y: 763 },
  { lvl: 1, y: 808 },
];

// Sidebar round labels (key matches data/rounds.js so the active one highlights).
const ROUNDS = [
  { key: 'general', label: 'General Round', y: 248 },
  { key: 'audience', label: 'ASK Audience', y: 368 },
  { key: 'fifty', label: '50:50', y: 488 },
  { key: 'timer', label: 'Timer Round', y: 607 },
  { key: 'buzzer', label: 'Buzzer Round', y: 728 },
];

// Option slots — index → screen position (TL, TR, BL, BR). All four share the
// same purple diamond; the colour only changes by state (see optionImg below):
// locked → yellow, then on reveal the correct one → green and a wrong pick → red.
const OPTION_SLOTS = [
  { x: 348, y: 689, w: 413, h: 73 },
  { x: 778, y: 689, w: 412, h: 73 },
  { x: 348, y: 767, w: 411, h: 74 },
  { x: 778, y: 767, w: 411, h: 75 },
];

const LIFELINES = [
  { id: 'fifty', img: 'lifeline-5050.png', y: 467 },
  { id: 'phone', img: 'lifeline-phone.png', y: 585 },
  { id: 'audience', img: 'lifeline-audience.png', y: 703 },
];

// Bottom team bars — two 497×94 slots. scoreX/scoreW define a centred score zone
// that stays inside the bracket's slanted right edge (bracket spans bx..bx+497),
// symmetric for both teams, so long scores don't spill past the diamond point.
const TEAM_SLOTS = [
  { bx: 261, nameX: 380, scoreX: 560 },
  { bx: 773, nameX: 892, scoreX: 1072 },
];

// Shown when a quiz has no questions (so the screen never crashes on an empty set).
const EMPTY_QUESTION = { q: '', options: ['', '', '', ''], answer: 0, round: 5 };

export default function GameplayScreen({
  initialTeams = [],
  questions: providedQuestions = null,
  scoring: scoringProp = null,
  onFinish,
  initialLifelineBg = null,
}) {
  const scoring = { ...DEFAULT_SCORING, ...(scoringProp || {}) };
  // Questions come from the selected (admin-created) quiz in the database.
  const questionsList = providedQuestions?.length ? providedQuestions : [];
  const noQuestions = questionsList.length === 0;

  const roundSecondsFor = (q) => (roundById(q?.round).key === 'timer' ? scoring.timerRoundTimer : scoring.timer);

  const [teams, setTeams] = useState(
    initialTeams.length > 0
      ? initialTeams.map((t) => ({ ...t, score: 0 }))
      : [{ name: 'Solo Player', score: 0 }]
  );
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  // selectedOption: null = nothing locked yet · 0..3 = the locked answer · -1 = time ran out with no pick
  const [selectedOption, setSelectedOption] = useState(null);
  // revealed = the answer has been shown (correct→green / wrong→red); set when the timer expires.
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => roundSecondsFor(questionsList[0]));
  const [running, setRunning] = useState(true);

  // Buzzer round: which team the teacher locked in (null = nobody has buzzed yet)
  const [lockedTeamIndex, setLockedTeamIndex] = useState(null);

  const [usedLifelines, setUsedLifelines] = useState([]);
  const [audiencePoll, setAudiencePoll] = useState(null);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [lifelineBg, setLifelineBg] = useState(initialLifelineBg); // 'audience' | 'phone' | null

  const intervalRef = useRef(null);
  const currentQuestion = questionsList[questionIndex] || questionsList[0] || EMPTY_QUESTION;
  const isLast = questionIndex >= questionsList.length - 1;

  // Points this question is worth, per the scoreboard ladder (by position).
  const questionPoints = pointsForIndex(questionIndex);
  const activeLevel = Math.min(questionIndex + 1, LADDER_POINTS.length);

  const round = roundById(currentQuestion.round);
  const isBuzzer = round.key === 'buzzer';
  // The team currently entitled to answer: locked team in a buzzer round, else the team whose turn it is.
  const answeringTeam = isBuzzer ? lockedTeamIndex : currentTeamIndex;
  // In a buzzer round, options are locked until the teacher selects who buzzed first.
  const awaitingBuzz = isBuzzer && lockedTeamIndex === null && !revealed;
  // Something has been committed for this question (an answer locked, or time ran out).
  const hasPick = selectedOption != null;

  // Award/deduct this question's ladder value to one team (correct → +, wrong → −).
  const scoreTeam = (teamIdx, correct) => {
    const delta = correct ? questionPoints : -questionPoints;
    setTeams((prev) => prev.map((t, i) => (i === teamIdx ? { ...t, score: t.score + delta } : t)));
  };

  // Timeout handler kept in a ref so the interval always sees fresh state.
  // Refreshed after every render (no deps) so the closure stays current.
  const onTimeoutRef = useRef(() => {});
  useEffect(() => {
    onTimeoutRef.current = () => {
      if (revealed) return;
      stopSound('suspense');
      setRevealed(true);
      setRunning(false);
      if (selectedOption != null && selectedOption >= 0) {
        // A team locked an answer → reveal it and score on correctness.
        const correct = selectedOption === currentQuestion.answer;
        if (answeringTeam != null) scoreTeam(answeringTeam, correct);
        playSound(correct ? 'correct' : 'wrong');
      } else {
        // Time ran out with no answer locked.
        setSelectedOption(-1);
        if (isBuzzer && lockedTeamIndex === null) {
          // Nobody buzzed → every team takes the level's penalty.
          setTeams((prev) => prev.map((t) => ({ ...t, score: t.score - questionPoints })));
        } else if (answeringTeam != null) {
          scoreTeam(answeringTeam, false);
        }
        playSound('wrong');
      }
    };
  });

  // Countdown — the updater must stay pure (no side effects), because React
  // StrictMode double-invokes updaters in dev. Scoring happens in the effect
  // below when the count reaches zero, so it fires exactly once.
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!running || revealed || noQuestions) return; // no timer/scoring on an empty quiz
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, revealed, noQuestions]);

  // Fire the timeout (reveal + scoring) once the countdown hits zero. Kept out
  // of the interval's state updater so it runs a single time per question.
  useEffect(() => {
    if (secondsLeft === 0 && running && !revealed && !noQuestions) {
      clearInterval(intervalRef.current);
      onTimeoutRef.current();
    }
  }, [secondsLeft, running, revealed, noQuestions]);

  // Background music keeps playing from the game login; just clean up the
  // gameplay cues (suspense etc.) when leaving — leave the music running.
  useEffect(() => () => stopGameSounds(), []);

  // A team locks an answer. Colours stay as-is; the timer drops to a short
  // suspense window (locked button glows yellow + suspense sound) and the answer
  // is only revealed/scored when that window expires (see onTimeout).
  const handleSelectOption = (idx) => {
    if (noQuestions || revealed || hasPick || awaitingBuzz || hiddenOptions.includes(idx)) return;
    setSelectedOption(idx);
    setSecondsLeft(SUSPENSE_SECONDS);
    setRunning(true);
    playSound('lock');
    playSound('suspense');
  };

  // Buzzer round: teacher clicks the team that buzzed first → it locks in and
  // gets a fresh window to answer.
  const lockTeam = (i) => {
    if (!awaitingBuzz) return;
    setLockedTeamIndex(i);
    setSecondsLeft(roundSecondsFor(currentQuestion));
    setRunning(true);
  };

  const handleNext = () => {
    stopSound('suspense'); // stop the suspense loop but keep background music going
    if (isLast) {
      onFinish(teams);
      return;
    }
    const nextIndex = questionIndex + 1;
    if (teams.length > 1) setCurrentTeamIndex((i) => (i + 1) % teams.length);
    setQuestionIndex(nextIndex);
    // Reset per-question state for the next question
    setSelectedOption(null);
    setRevealed(false);
    setLockedTeamIndex(null);
    setAudiencePoll(null);
    setHiddenOptions([]);
    setSecondsLeft(roundSecondsFor(questionsList[nextIndex]));
    setRunning(true);
    setLifelineBg(null); // revert any lifeline background on the next question
  };

  const handleUseLifeline = (id) => {
    if (noQuestions || revealed || hasPick || usedLifelines.includes(id)) return;
    setUsedLifelines((u) => [...u, id]);

    if (id === 'fifty') {
      setHiddenOptions(pickTwoWrong(currentQuestion.answer));
    } else if (id === 'audience') {
      setAudiencePoll(makeAudiencePoll(currentQuestion.answer));
      setLifelineBg('audience'); // show the crowd background
      playSound('audience'); // crowd / KBC audience sound
    } else if (id === 'phone') {
      setSecondsLeft((s) => s + 10); // extra time
      setLifelineBg('phone'); // show the phone-a-friend background
      playSound('friend'); // phone-a-friend dial/ring sound
    }
  };

  const optionLabel = (idx) => {
    if (hiddenOptions.includes(idx)) return '';
    const base = currentQuestion.options[idx];
    return audiencePoll ? `${base}  ${audiencePoll[idx]}%` : base;
  };

  const optionClass = (idx) => {
    if (hiddenOptions.includes(idx)) return 'opt is-hidden';
    // Before reveal: all purple; the locked one pulses (yellow image + glow).
    if (!revealed) return selectedOption === idx ? 'opt is-suspense' : 'opt';
    // After reveal: correct → green, the locked wrong answer → red.
    if (idx === currentQuestion.answer) return 'opt is-correct';
    if (idx === selectedOption) return 'opt is-wrong';
    return 'opt';
  };

  // The diamond image to show for an option, by state. Same purple for all
  // until something happens: locked → yellow, reveal correct → green, reveal
  // wrong pick → red.
  const optionImg = (idx) => {
    if (!revealed) return selectedOption === idx ? 'opt-yellow.png' : 'opt-purple.png';
    if (idx === currentQuestion.answer) return 'opt-green.png';
    if (idx === selectedOption) return 'opt-red.png';
    return 'opt-purple.png';
  };

  // Lifeline the current round suggests the teacher use (highlight, still manual).
  const suggestedLifeline = round.key === 'fifty' ? 'fifty' : round.key === 'audience' ? 'audience' : null;

  // Banner text explaining the active round's mechanic.
  const banner = isBuzzer
    ? lockedTeamIndex == null
      ? '🔔 Buzzer Round — click the team that buzzed first'
      : `🔒 ${teams[lockedTeamIndex]?.name || 'Team'} locked in — answer now!`
    : `${round.label} — ${teams[currentTeamIndex]?.name || 'Team'}'s turn`;

  const headerScore = teams[answeringTeam ?? currentTeamIndex]?.score || 0;
  const media = currentQuestion.image_url || currentQuestion.video_url;

  return (
    <Stage className="screen-fade">
      {/* Background — swaps to the lifeline background while a lifeline is active */}
      {lifelineBg === 'phone' ? (
        <Box img={A('phone-bg.png')} x={0} y={0} w={1536} h={1024} fit="cover" />
      ) : lifelineBg === 'audience' ? (
        <Box img={A('audience-bg.png')} x={0} y={0} w={1536} h={1024} fit="cover" />
      ) : (
        <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />
      )}

      {/* Empty quiz guard — shown when the selected quiz has no questions yet */}
      {noQuestions && (
        <Box x={331} y={470} w={875} h={120} size={28} color={GOLD} align="center" valign="center"
          style={{ pointerEvents: 'none', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
          {'This quiz has no questions yet.\nAdd questions in the admin panel.'}
        </Box>
      )}

      {/* Back / Next */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={() => { stopGameSounds(); onFinish(teams); }} aria-label="Back" />
      <Box as="button" className="hot" img={A('next-btn.png')} x={1213} y={-30} w={308} h={205}
        onClick={handleNext} aria-label={isLast ? 'Results' : 'Next'} />

      {/* Resume (resumes the countdown) */}
      <Box img={A('resume-orange.png')} x={51} y={113} w={205} h={62} style={{ pointerEvents: 'none' }} />
      <Box as="button" className="hot hotspot" x={51} y={113} w={205} h={62}
        onClick={() => !revealed && setRunning((r) => !r)} aria-label="Pause"
        style={{ borderRadius: 8 }} />
      <Box x={105} y={118} w={98} h={47} size={32} color={WHITE} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>{running ? 'PAUSE' : 'PLAY'}</Box>

      {/* Timer ring + count */}
      <Box img={A('timer-ring.png')} x={68} y={217} w={185} h={185} style={{ pointerEvents: 'none' }} />
      <Box x={116} y={251} w={89} h={107} size={72} color={secondsLeft <= 5 ? '#ff5a5a' : WHITE}
        align="center" valign="center" style={{ pointerEvents: 'none' }}>
        {secondsLeft}
      </Box>

      {/* Lifelines (manual; the round's suggested lifeline gets a glow) */}
      {LIFELINES.map((l) => (
        <Box key={l.id} as="button" className="hot" img={A(l.img)} x={57} y={l.y} w={207} h={138}
          disabled={usedLifelines.includes(l.id) || hasPick || revealed || noQuestions}
          onClick={() => handleUseLifeline(l.id)} aria-label={l.id}
          style={l.id === suggestedLifeline && !usedLifelines.includes(l.id)
            ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.9))' } : undefined} />
      ))}

      {/* Round banner */}
      <Box x={331} y={486} w={875} h={36} size={22} color={GOLD} align="center" valign="center"
        style={{ pointerEvents: 'none', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
        {banner}
      </Box>

      {/* Per-question media (General round / any question with an attachment) */}
      {media && (
        <div style={{ position: 'absolute', left: 468, top: 150, width: 600, height: 320,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,2,40,0.55)', border: '2px solid rgba(250,183,0,0.6)',
          borderRadius: 14, overflow: 'hidden', pointerEvents: 'none' }}>
          {currentQuestion.video_url ? (
            <video src={currentQuestion.video_url} poster={currentQuestion.poster_url || undefined}
              controls preload="metadata"
              style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'auto' }} />
          ) : (
            <img src={currentQuestion.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      )}

      {/* Question bracket + text */}
      <Box img={A('question-bracket.png')} x={331} y={532} w={875} h={133} style={{ pointerEvents: 'none' }} />
      <Box x={443} y={557} w={483} h={84} size={24} color={WHITE} lh={32} valign="center"
        style={{ pointerEvents: 'none' }}>
        {currentQuestion.q}
      </Box>

      {/* Options */}
      {OPTION_SLOTS.map((s, i) => (
        <div key={i}>
          <Box as="button" className={`hot ${optionClass(i)}`} img={A(optionImg(i))}
            x={s.x} y={s.y} w={s.w} h={s.h} disabled={hasPick || revealed || awaitingBuzz || noQuestions}
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
        {headerScore.toLocaleString()}
      </Box>

      {/* Round labels (active round highlighted) */}
      {ROUNDS.map((r) => {
        const active = r.key === round.key;
        return (
          <div key={r.label} style={active ? { filter: 'drop-shadow(0 0 10px rgba(250,183,0,0.9))' } : undefined}>
            <Box img={A('round-bracket.png')} x={1297} y={r.y} w={140} h={31} style={{ pointerEvents: 'none' }} />
            <Box x={1297} y={r.y} w={140} h={31} size={11} color={active ? GOLD : WHITE} align="center" valign="center"
              style={{ pointerEvents: 'none', fontWeight: active ? 700 : 400 }}>
              {r.label}
            </Box>
          </div>
        );
      })}

      {/* Prize ladder — the current question's level is highlighted */}
      {LADDER.map((row) => {
        const active = row.lvl === activeLevel;
        return (
        <div key={row.lvl} style={active ? { filter: 'drop-shadow(0 0 10px rgba(250,183,0,0.95))' } : undefined}>
          <Box img={A('score-number.png')} x={1240} y={row.y} w={74} h={33} style={{ pointerEvents: 'none' }} />
          <Box img={A('score-bracket.png')} x={1322} y={row.y} w={175} h={36} style={{ pointerEvents: 'none' }} />
          <Box x={1240} y={row.y} w={74} h={33} size={16} color={GOLD} align="center" valign="center"
            style={{ pointerEvents: 'none' }}>{row.lvl}</Box>
          <Box x={1340} y={row.y} w={118} h={36} size={16} color={active ? GOLD : WHITE} valign="center"
            style={{ pointerEvents: 'none' }}>{LADDER_POINTS[row.lvl - 1].toLocaleString()}</Box>
          <Box x={1464} y={row.y} w={30} h={36} size={12} color={GOLD} valign="center"
            style={{ pointerEvents: 'none' }}>PTS</Box>
        </div>
        );
      })}

      {/* Bottom team bars — clickable in a buzzer round to lock the team that buzzed */}
      {teams.slice(0, 2).map((team, i) => {
        const s = TEAM_SLOTS[i];
        const locked = isBuzzer && lockedTeamIndex === i;
        const active = locked || (!isBuzzer && i === currentTeamIndex);
        return (
          <div key={i} style={active ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.7))' } : undefined}>
            <Box img={A('team-bracket.png')} x={s.bx} y={884} w={497} h={94} style={{ pointerEvents: 'none' }} />
            <Box x={s.nameX} y={911} w={210} h={36} size={24} color="#F3E1F5" valign="center"
              style={{ pointerEvents: 'none' }}>{team.name}</Box>
            <Box x={s.scoreX} y={897} w={160} h={59} size={36} color={team.score < 0 ? '#ff7a7a' : '#F3E1F5'}
              align="center" valign="center" style={{ pointerEvents: 'none' }}>{team.score.toLocaleString()}</Box>
            {awaitingBuzz && (
              <Box as="button" className="hot hotspot" x={s.bx} y={884} w={497} h={94}
                onClick={() => lockTeam(i)} aria-label={`${team.name} buzzed`}
                style={{ borderRadius: 12 }} />
            )}
          </div>
        );
      })}
    </Stage>
  );
}
