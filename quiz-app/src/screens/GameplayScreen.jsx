import { useState, useEffect, useRef, useMemo } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { roundById, DEFAULT_SCORING } from '../data/rounds';
import { playSound, stopSound, stopGameSounds, setSuspense } from '../lib/sound';
import GameplayOptionDisplay from '../components/GameplayOptionDisplay';
import FitText from '../components/FitText';
import TeamScoreboard from '../components/TeamScoreboard';
import PrizeLadder from '../components/PrizeLadder';
import './screens.css';

const GOLD = '#FAB700';
const WHITE = '#FFFFFF';

const SUSPENSE_SECONDS = 4;

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

const OPTION_SLOTS = [
  { x: 348, y: 689, w: 413, h: 73 },
  { x: 778, y: 689, w: 412, h: 73 },
  { x: 348, y: 767, w: 411, h: 74 },
  { x: 778, y: 767, w: 411, h: 75 },
];

const LIFELINES = [
  { id: 'fifty',    img: 'lifeline-5050.png',     y: 467 },
  { id: 'phone',    img: 'lifeline-phone.png',    y: 585 },
  { id: 'audience', img: 'lifeline-audience.png', y: 703 },
];

const EMPTY_QUESTION = { q: '', options: ['', '', '', ''], answer: 0, round: 5 };

// Game-style "round starting" intro: GET READY → 3 → 2 → 1 → GO! Each step's
// `ms` matches its CSS animation duration so the overlay feels in sync.
const INTRO_STEPS = [
  { key: 'ready', text: 'GET READY', ms: 850, kind: 'ready' },
  { key: '3',     text: '3',         ms: 600, kind: 'count' },
  { key: '2',     text: '2',         ms: 600, kind: 'count' },
  { key: '1',     text: '1',         ms: 600, kind: 'count' },
  { key: 'go',    text: 'GO!',       ms: 700, kind: 'go'    },
];

// ─── FormulaText ─────────────────────────────────────────────────────────────
// Thin wrapper used for the question text inside <Box>.
// Box renders children normally, so we just pass this as the child.
// Keeps font/color inheritance from Box's textStyle by using a plain <span>
// when it's not LaTeX — KaTeX injects its own font stack for rendered math,
// which is fine since it's scoped to the formula characters.
function FormulaText({ value, audiencePollSuffix }) {
  const suffix = audiencePollSuffix ?? '';
  // Inline component from GameplayOptionDisplay — re-use its detection logic.
  // We import the named export `resolveDisplayValue` to keep this self-contained.
  return (
    <GameplayOptionDisplay
      value={value + suffix}
      style={{ color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}
    />
  );
}

export default function GameplayScreen({
  initialTeams = [],
  questions: providedQuestions = null,
  scoring: scoringProp = null,
  onFinish,
  initialLifelineBg = null,
}) {
  const scoring = { ...DEFAULT_SCORING, ...(scoringProp || {}) };

  // Sequence the questions round-by-round: every question of one round is played
  // before the next round starts, preserving the order each round first appears
  // (and the original order within a round). `seats[i]` is a question's 0-based
  // position within its round group — for turn-based rounds that decides which
  // team answers (seat % teamCount), so every team gets an equal turn per round.
  const { orderedQuestions, seats } = useMemo(() => {
    const src = providedQuestions?.length ? providedQuestions : [];
    const groups = new Map(); // round id -> questions in that round (in order)
    for (const q of src) {
      const r = q?.round ?? 5;
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(q);
    }
    const ordered = [];
    const seatArr = [];
    for (const arr of groups.values()) {
      arr.forEach((q, i) => { ordered.push(q); seatArr.push(i); });
    }
    return { orderedQuestions: ordered, seats: seatArr };
  }, [providedQuestions]);
  const noQuestions = orderedQuestions.length === 0;

  const roundSecondsFor = (q) =>
    roundById(q?.round).key === 'timer' ? scoring.timerRoundTimer : scoring.timer;

  const [teams, setTeams] = useState(
    initialTeams.length > 0
      ? initialTeams.map((t) => ({ ...t, score: 0 }))
      : [{ name: 'Solo Player', score: 0 }]
  );
  const [questionIndex, setQuestionIndex]         = useState(0);
  const [selectedOption, setSelectedOption]       = useState(null);
  const [revealed, setRevealed]                   = useState(false);
  const [secondsLeft, setSecondsLeft]             = useState(() => roundSecondsFor(orderedQuestions[0]));
  const [running, setRunning]                     = useState(true);
  const [lockedTeamIndex, setLockedTeamIndex]     = useState(null);
  const [usedLifelines, setUsedLifelines]         = useState([]);
  const [audiencePoll, setAudiencePoll]           = useState(null);
  const [hiddenOptions, setHiddenOptions]         = useState([]);
  const [lifelineBg, setLifelineBg]               = useState(initialLifelineBg);
  const [introStep, setIntroStep]                 = useState(0);
  const inIntro = introStep < INTRO_STEPS.length;

  const intervalRef    = useRef(null);
  const audienceTimerRef = useRef(null);
  const currentQuestion = orderedQuestions[questionIndex] || orderedQuestions[0] || EMPTY_QUESTION;
  const isLast          = questionIndex >= orderedQuestions.length - 1;

  // Each question carries its own admin-set points (falling back to the quiz
  // defaults). The on-screen ladder shows every question's CORRECT points, and
  // scoring uses the current question's correct/penalty points — so the board
  // and the score always match what the admin configured.
  const ladder         = useMemo(
    () => orderedQuestions.map((q) => q.correctPoints ?? scoring.correctPoints),
    [orderedQuestions, scoring.correctPoints],
  );
  const correctPts     = currentQuestion.correctPoints ?? scoring.correctPoints;
  const penaltyPts     = currentQuestion.penaltyPoints ?? scoring.penaltyPoints;
  const activeLevel    = Math.min(questionIndex + 1, ladder.length || 1);
  const round          = roundById(currentQuestion.round);
  const isBuzzer       = round.key === 'buzzer';
  // Whose turn it is on a turn-based round: rotate through the teams by the
  // question's seat within its round, so each team answers one question per round.
  const turnTeamIndex  = teams.length > 0 ? (seats[questionIndex] ?? 0) % teams.length : 0;
  const answeringTeam  = isBuzzer ? lockedTeamIndex : turnTeamIndex;
  const awaitingBuzz   = isBuzzer && lockedTeamIndex === null && !revealed;
  const hasPick        = selectedOption != null;

  // Rounds in play order with their question counts (orderedQuestions is already
  // grouped by round) — drives the ladder's per-round level blocks.
  const roundSequence = useMemo(() => {
    const seq = [];
    const seen = new Map(); // round id -> index in seq
    for (const q of orderedQuestions) {
      const id = roundById(q?.round).id;
      if (!seen.has(id)) { seen.set(id, seq.length); seq.push({ id, count: 0 }); }
      seq[seen.get(id)].count++;
    }
    return seq;
  }, [orderedQuestions]);

  const scoreTeam = (teamIdx, correct) => {
    const delta = correct ? correctPts : -penaltyPts;
    setTeams((prev) => prev.map((t, i) => (i === teamIdx ? { ...t, score: t.score + delta } : t)));
  };

  const onTimeoutRef = useRef(() => {});
  useEffect(() => {
    onTimeoutRef.current = () => {
      if (revealed) return;
      setSuspense(false);
      setRevealed(true);
      setRunning(false);
      if (selectedOption != null && selectedOption >= 0) {
        const correct = selectedOption === currentQuestion.answer;
        if (answeringTeam != null) scoreTeam(answeringTeam, correct);
        playSound(correct ? 'correct' : 'wrong');
      } else {
        setSelectedOption(-1);
        if (isBuzzer && lockedTeamIndex === null) {
          setTeams((prev) => prev.map((t) => ({ ...t, score: t.score - penaltyPts })));
        } else if (answeringTeam != null) {
          scoreTeam(answeringTeam, false);
        }
        playSound('wrong');
      }
    };
  });

  // Drive the round-starting intro countdown, then release it. The timer below
  // is held until the intro finishes so the question doesn't start mid-"GO!".
  useEffect(() => {
    if (introStep >= INTRO_STEPS.length) { stopSound('start'); return; }
    if (introStep === 0) playSound('start');
    const id = setTimeout(() => setIntroStep((s) => s + 1), INTRO_STEPS[introStep].ms);
    return () => clearTimeout(id);
  }, [introStep]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!running || revealed || noQuestions || inIntro) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, revealed, noQuestions, inIntro]);

  useEffect(() => {
    if (secondsLeft === 0 && running && !revealed && !noQuestions) {
      clearInterval(intervalRef.current);
      onTimeoutRef.current();
    }
  }, [secondsLeft, running, revealed, noQuestions]);

  useEffect(() => () => { clearTimeout(audienceTimerRef.current); stopGameSounds(); }, []);

  const handleSelectOption = (idx) => {
    if (noQuestions || revealed || hasPick || awaitingBuzz || hiddenOptions.includes(idx)) return;
    // Stop any running lifeline cue (Ask Audience / Phone a Friend) — the team
    // has committed to an answer, so the suspense/reveal sounds take over.
    clearTimeout(audienceTimerRef.current);
    stopSound('audience');
    stopSound('friend');
    setSelectedOption(idx);
    setSecondsLeft(SUSPENSE_SECONDS);
    setRunning(true);
    setSuspense(true);
  };

  const lockTeam = (i) => {
    if (!awaitingBuzz) return;
    setLockedTeamIndex(i);
    setSecondsLeft(roundSecondsFor(currentQuestion));
    setRunning(true);
  };

  const handleNext = () => {
    setSuspense(false);
    // Make sure no lifeline cue carries over into the next question.
    clearTimeout(audienceTimerRef.current);
    stopSound('audience');
    stopSound('friend');
    if (isLast) { onFinish(teams); return; }
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setSelectedOption(null);
    setRevealed(false);
    setLockedTeamIndex(null);
    setAudiencePoll(null);
    setHiddenOptions([]);
    setUsedLifelines([]);        // lifelines refresh — usable again every question
    setSecondsLeft(roundSecondsFor(orderedQuestions[nextIndex]));
    setRunning(true);
    setLifelineBg(null);
  };

  const handleUseLifeline = (id) => {
    // Re-usable: a lifeline fires every time it's clicked (it isn't consumed),
    // as long as the answer hasn't been locked/revealed yet.
    if (noQuestions || revealed || hasPick) return;
    setUsedLifelines((u) => (u.includes(id) ? u : [...u, id]));
    if (id === 'fifty') {
      setHiddenOptions(pickTwoWrong(currentQuestion.answer));
    } else if (id === 'audience') {
      setAudiencePoll(makeAudiencePoll(currentQuestion.answer));
      setLifelineBg('audience');
      playSound('audience');
      // Let the audience jingle play briefly, then hand the floor back to the
      // game music (same feel as Phone a Friend) while the team decides.
      clearTimeout(audienceTimerRef.current);
      audienceTimerRef.current = setTimeout(() => stopSound('audience'), 3000);
    } else if (id === 'phone') {
      setSecondsLeft((s) => s + 10);
      setLifelineBg('phone');
      playSound('friend');
    }
  };

  // ─── option label ──────────────────────────────────────────────────────────
  // Returns the raw text content for hidden / audience-poll cases.
  // For rendered options we pass the base value through GameplayOptionDisplay,
  // and append the audience poll percentage as a plain suffix.
  const optionBase  = (idx) => (hiddenOptions.includes(idx) ? '' : currentQuestion.options[idx]);
  const pollSuffix  = (idx) => (audiencePoll && !hiddenOptions.includes(idx) ? `  ${audiencePoll[idx]}%` : '');

  const optionClass = (idx) => {
    if (hiddenOptions.includes(idx)) return 'opt is-hidden';
    if (!revealed) return selectedOption === idx ? 'opt is-suspense' : 'opt';
    if (idx === currentQuestion.answer) return 'opt is-correct';
    if (idx === selectedOption) return 'opt is-wrong';
    return 'opt';
  };

  const optionImg = (idx) => {
    if (!revealed) return selectedOption === idx ? 'opt-yellow.png' : 'opt-purple.png';
    if (idx === currentQuestion.answer) return 'opt-green.png';
    if (idx === selectedOption) return 'opt-red.png';
    return 'opt-purple.png';
  };

  const suggestedLifeline =
    round.key === 'fifty' ? 'fifty' : round.key === 'audience' ? 'audience' : null;

  const banner = isBuzzer
    ? lockedTeamIndex == null
      ? '🔔 Buzzer Round — click the team that buzzed first'
      : `🔒 ${teams[lockedTeamIndex]?.name || 'Team'} locked in — answer now!`
    : `${round.label} — ${teams[turnTeamIndex]?.name || 'Team'}'s turn`;

  const headerScore = teams[answeringTeam ?? turnTeamIndex]?.score || 0;
  const media = currentQuestion.image_url || currentQuestion.video_url;

  return (
    <Stage className="screen-fade">
      {/* Background */}
      {lifelineBg === 'phone' ? (
        <Box img={A('phone-bg.png')} x={0} y={0} w={1536} h={1024} fit="cover" />
      ) : lifelineBg === 'audience' ? (
        <Box img={A('audience-bg.png')} x={0} y={0} w={1536} h={1024} fit="cover" />
      ) : (
        <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} />
      )}

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

      {/* Pause / Resume */}
      <Box img={A('resume-orange.png')} x={51} y={113} w={205} h={62} style={{ pointerEvents: 'none' }} />
      <Box as="button" className="hot hotspot" x={51} y={113} w={205} h={62}
        onClick={() => !revealed && setRunning((r) => !r)} aria-label="Pause"
        style={{ borderRadius: 8 }} />
      <Box x={105} y={118} w={98} h={47} size={32} color={WHITE} align="center" valign="center"
        style={{ pointerEvents: 'none' }}>{running ? 'PAUSE' : 'PLAY'}</Box>

      {/* Timer */}
      <Box img={A('timer-ring.png')} x={68} y={217} w={185} h={185} style={{ pointerEvents: 'none' }} />
      <Box x={116} y={251} w={89} h={107} size={72} color={secondsLeft <= 5 ? '#ff5a5a' : WHITE}
        align="center" valign="center" style={{ pointerEvents: 'none' }}>
        {secondsLeft}
      </Box>

      {/* Lifelines */}
      {LIFELINES.map((l) => (
        <Box key={l.id} as="button" className="hot" img={A(l.img)} x={57} y={l.y} w={207} h={138}
          disabled={hasPick || revealed || noQuestions}
          onClick={() => handleUseLifeline(l.id)} aria-label={l.id}
          style={l.id === suggestedLifeline && !usedLifelines.includes(l.id)
            ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.9))' } : undefined} />
      ))}

      {/* Round banner */}
      <div
        className={`gp-banner${awaitingBuzz ? ' is-awaiting' : ''}${isBuzzer && lockedTeamIndex != null ? ' is-locked' : ''}`}
        style={{ position: 'absolute', left: 330, top: 22, width: 876, minHeight: 76 }}
      >
        {banner}
      </div>

      {/* Media attachment */}
      {media && (
        <div style={{
          position: 'absolute', left: 468, top: 150, width: 600, height: 320,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,2,40,0.55)', border: '2px solid rgba(250,183,0,0.6)',
          borderRadius: 14, overflow: 'hidden', pointerEvents: 'none',
        }}>
          {currentQuestion.video_url ? (
            <video src={currentQuestion.video_url} poster={currentQuestion.poster_url || undefined}
              controls preload="metadata"
              style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'auto' }} />
          ) : (
            <img src={currentQuestion.image_url} alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      )}

      {/* ── Question text ──────────────────────────────────────────────────────
          GameplayOptionDisplay detects LaTeX vs plain string automatically.
          Box still controls layout/positioning; the component is just the child. */}
      <Box img={A('question-bracket.png')} x={331} y={532} w={875} h={133} style={{ pointerEvents: 'none' }} />
      <Box x={443} y={557} w={483} h={84} size={24} color={WHITE} lh={32} valign="center"
        style={{ pointerEvents: 'none' }}>
        <GameplayOptionDisplay value={currentQuestion.q} />
      </Box>

      {/* ── Options ────────────────────────────────────────────────────────────
          Diamond image (Box with img) + text overlay (Box with children).
          The text Box child is GameplayOptionDisplay so LaTeX renders correctly.
          Audience poll percentage is a plain string appended after the formula. */}
      {OPTION_SLOTS.map((s, i) => (
        <div key={i}>
          <Box as="button" className={`hot ${optionClass(i)}`} img={A(optionImg(i))}
            x={s.x} y={s.y} w={s.w} h={s.h}
            disabled={hasPick || revealed || awaitingBuzz || noQuestions}
            onClick={() => handleSelectOption(i)} aria-label={`Option ${i + 1}`} />

          {/* Text overlay — only render when this option isn't hidden by 50:50 */}
          {!hiddenOptions.includes(i) && (
            <Box x={s.x} y={s.y} w={s.w} h={s.h} size={24} color={WHITE}
              align="center" valign="center"
              style={{ pointerEvents: 'none', padding: '0 20px' }}>
              <GameplayOptionDisplay value={optionBase(i)} />
              {/* Audience poll suffix — always plain text, always same size */}
              {audiencePoll && (
                <span style={{ fontSize: 24, color: WHITE, marginLeft: 6 }}>
                  {audiencePoll[i]}%
                </span>
              )}
            </Box>
          )}
        </div>
      ))}

      {/* Scoreboard header */}
      <Box img={A('scoreboard-header.png')} x={1237} y={144} w={260} h={99} style={{ pointerEvents: 'none' }} />
      <Box x={1294} y={197} w={166} h={33} size={24} color={WHITE} valign="center"
        style={{ pointerEvents: 'none' }}>
        <FitText maxWidth={166} align="left" value={headerScore.toLocaleString()} />
      </Box>

      {/* Prize ladder — same styling, but each round block holds one level per
          question (= team count), so a 4-team game shows 4 levels per round. */}
      <PrizeLadder
        roundSequence={roundSequence}
        ladder={ladder}
        activeLevel={activeLevel}
        currentRoundId={round.id}
      />

      {/* Bottom team scoreboard — 1–10 teams, one row (≤5) or two centred rows */}
      <TeamScoreboard
        teams={teams}
        isBuzzer={isBuzzer}
        turnTeamIndex={turnTeamIndex}
        lockedTeamIndex={lockedTeamIndex}
        awaitingBuzz={awaitingBuzz}
        onBuzz={lockTeam}
      />

      {/* Round-starting intro — covers the stage with a game-style countdown */}
      {inIntro && (
        <div
          className="gp-intro"
          style={{ position: 'absolute', left: 0, top: 0, width: 1536, height: 1024, zIndex: 60 }}
        >
          <div className="gp-intro-glow" />
          <div key={INTRO_STEPS[introStep].key}
            className={`gp-intro-text gp-intro-${INTRO_STEPS[introStep].kind}`}>
            {INTRO_STEPS[introStep].text}
          </div>
        </div>
      )}
    </Stage>
  );
}