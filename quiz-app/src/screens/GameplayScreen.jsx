import { useState, useEffect, useRef } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { roundById, DEFAULT_SCORING } from '../data/rounds';
import { playSound, stopSound, stopGameSounds, setSuspense } from '../lib/sound';
import GameplayOptionDisplay from '../components/GameplayOptionDisplay';
import FitText from '../components/FitText';
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

const LADDER_POINTS = [10, 30, 50, 100, 500, 1000, 10000, 100000, 1000000, 10000000];
const pointsForIndex = (i) => LADDER_POINTS[Math.min(i, LADDER_POINTS.length - 1)];

const LADDER = [
  { lvl: 10, y: 283 },
  { lvl: 9,  y: 328 },
  { lvl: 8,  y: 403 },
  { lvl: 7,  y: 448 },
  { lvl: 6,  y: 523 },
  { lvl: 5,  y: 568 },
  { lvl: 4,  y: 643 },
  { lvl: 3,  y: 688 },
  { lvl: 2,  y: 763 },
  { lvl: 1,  y: 808 },
];

const ROUNDS = [
  { key: 'general',  label: 'General Round', y: 248 },
  { key: 'audience', label: 'ASK Audience',  y: 368 },
  { key: 'fifty',    label: '50:50',          y: 488 },
  { key: 'timer',    label: 'Timer Round',    y: 607 },
  { key: 'buzzer',   label: 'Buzzer Round',   y: 728 },
];

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

const TEAM_SLOTS = [
  { bx: 261, nameX: 380, scoreX: 560  },
  { bx: 773, nameX: 892, scoreX: 1072 },
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
  const questionsList = providedQuestions?.length ? providedQuestions : [];
  const noQuestions = questionsList.length === 0;

  const roundSecondsFor = (q) =>
    roundById(q?.round).key === 'timer' ? scoring.timerRoundTimer : scoring.timer;

  const [teams, setTeams] = useState(
    initialTeams.length > 0
      ? initialTeams.map((t) => ({ ...t, score: 0 }))
      : [{ name: 'Solo Player', score: 0 }]
  );
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [questionIndex, setQuestionIndex]         = useState(0);
  const [selectedOption, setSelectedOption]       = useState(null);
  const [revealed, setRevealed]                   = useState(false);
  const [secondsLeft, setSecondsLeft]             = useState(() => roundSecondsFor(questionsList[0]));
  const [running, setRunning]                     = useState(true);
  const [lockedTeamIndex, setLockedTeamIndex]     = useState(null);
  const [usedLifelines, setUsedLifelines]         = useState([]);
  const [audiencePoll, setAudiencePoll]           = useState(null);
  const [hiddenOptions, setHiddenOptions]         = useState([]);
  const [lifelineBg, setLifelineBg]               = useState(initialLifelineBg);
  const [introStep, setIntroStep]                 = useState(0);
  const inIntro = introStep < INTRO_STEPS.length;

  const intervalRef    = useRef(null);
  const currentQuestion = questionsList[questionIndex] || questionsList[0] || EMPTY_QUESTION;
  const isLast          = questionIndex >= questionsList.length - 1;

  const questionPoints = pointsForIndex(questionIndex);
  const activeLevel    = Math.min(questionIndex + 1, LADDER_POINTS.length);
  const round          = roundById(currentQuestion.round);
  const isBuzzer       = round.key === 'buzzer';
  const answeringTeam  = isBuzzer ? lockedTeamIndex : currentTeamIndex;
  const awaitingBuzz   = isBuzzer && lockedTeamIndex === null && !revealed;
  const hasPick        = selectedOption != null;

  const scoreTeam = (teamIdx, correct) => {
    const delta = correct ? questionPoints : -questionPoints;
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
          setTeams((prev) => prev.map((t) => ({ ...t, score: t.score - questionPoints })));
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

  useEffect(() => () => stopGameSounds(), []);

  const handleSelectOption = (idx) => {
    if (noQuestions || revealed || hasPick || awaitingBuzz || hiddenOptions.includes(idx)) return;
    // Stop any running lifeline cue (Ask Audience / Phone a Friend) — the team
    // has committed to an answer, so the suspense/reveal sounds take over.
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
    stopSound('audience');
    stopSound('friend');
    if (isLast) { onFinish(teams); return; }
    const nextIndex = questionIndex + 1;
    if (teams.length > 1) setCurrentTeamIndex((i) => (i + 1) % teams.length);
    setQuestionIndex(nextIndex);
    setSelectedOption(null);
    setRevealed(false);
    setLockedTeamIndex(null);
    setAudiencePoll(null);
    setHiddenOptions([]);
    setSecondsLeft(roundSecondsFor(questionsList[nextIndex]));
    setRunning(true);
    setLifelineBg(null);
  };

  const handleUseLifeline = (id) => {
    if (noQuestions || revealed || hasPick || usedLifelines.includes(id)) return;
    setUsedLifelines((u) => [...u, id]);
    if (id === 'fifty') {
      setHiddenOptions(pickTwoWrong(currentQuestion.answer));
    } else if (id === 'audience') {
      setAudiencePoll(makeAudiencePoll(currentQuestion.answer));
      setLifelineBg('audience');
      playSound('audience');
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
    : `${round.label} — ${teams[currentTeamIndex]?.name || 'Team'}'s turn`;

  const headerScore = teams[answeringTeam ?? currentTeamIndex]?.score || 0;
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
          disabled={usedLifelines.includes(l.id) || hasPick || revealed || noQuestions}
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
              <GameplayOptionDisplay
                value={optionBase(i)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              />
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

      {/* Round labels — the active round (matches the current question's round
          type) is highlighted unmistakably so it can't be confused with the
          prize-ladder's own gold glow: inactive rounds are dimmed, the active
          one gets a bright gold ring + a ▶ marker. */}
      {ROUNDS.map((r) => {
        const active = r.key === round.key;
        return (
          <div
            key={r.label}
            style={{
              opacity: active ? 1 : 0.38,
              filter: active ? 'drop-shadow(0 0 16px rgba(250,183,0,1))' : undefined,
            }}
          >
            <Box img={A('round-bracket.png')} x={1297} y={r.y} w={140} h={31} style={{ pointerEvents: 'none' }} />
            {active && (
              <Box x={1294} y={r.y - 3} w={146} h={37} style={{
                pointerEvents: 'none',
                border: '2px solid #FAB700',
                borderRadius: 9,
                background: 'rgba(250,183,0,0.22)',
                boxShadow: '0 0 14px rgba(250,183,0,0.9), inset 0 0 8px rgba(250,183,0,0.45)',
              }} />
            )}
            <Box x={1297} y={r.y} w={140} h={31} size={active ? 13 : 11} color={active ? GOLD : WHITE}
              align="center" valign="center"
              style={{ pointerEvents: 'none', fontWeight: active ? 800 : 400, letterSpacing: active ? 0.4 : 0 }}>
              {r.label}
            </Box>
            {active && (
              <Box x={1271} y={r.y} w={22} h={31} size={17} color={GOLD} align="center" valign="center"
                style={{ pointerEvents: 'none', textShadow: '0 0 8px rgba(250,183,0,0.9)' }}>
                ▶
              </Box>
            )}
          </div>
        );
      })}

      {/* Prize ladder */}
      {LADDER.map((row) => {
        const active = row.lvl === activeLevel;
        return (
          <div key={row.lvl} style={active ? { filter: 'drop-shadow(0 0 10px rgba(250,183,0,0.95))' } : undefined}>
            <Box img={A('score-number.png')} x={1240} y={row.y} w={74}  h={33} style={{ pointerEvents: 'none' }} />
            <Box img={A('score-bracket.png')} x={1322} y={row.y} w={175} h={36} style={{ pointerEvents: 'none' }} />
            <Box x={1240} y={row.y} w={74}  h={33} size={16} color={GOLD}              align="center" valign="center" style={{ pointerEvents: 'none' }}>{row.lvl}</Box>
            <Box x={1340} y={row.y} w={118} h={36} size={16} color={active ? GOLD : WHITE} valign="center" style={{ pointerEvents: 'none' }}>
              <FitText maxWidth={118} align="left" value={LADDER_POINTS[row.lvl - 1].toLocaleString()} />
            </Box>
            <Box x={1464} y={row.y} w={30}  h={36} size={12} color={GOLD}              valign="center"            style={{ pointerEvents: 'none' }}>PTS</Box>
          </div>
        );
      })}

      {/* Bottom team bars */}
      {teams.slice(0, 2).map((team, i) => {
        const s      = TEAM_SLOTS[i];
        const locked = isBuzzer && lockedTeamIndex === i;
        const active = locked || (!isBuzzer && i === currentTeamIndex);
        return (
          <div key={i} style={active ? { filter: 'drop-shadow(0 0 14px rgba(250,183,0,0.7))' } : undefined}>
            <Box img={A('team-bracket.png')} x={s.bx} y={884} w={497} h={94} style={{ pointerEvents: 'none' }} />
            {/* Name is capped so a long/negative score (right-anchored) can never
                collide with it — there's always a gap between the two. */}
            <Box x={s.nameX} y={911} w={s.bx + 270 - s.nameX} h={36} size={24} color="#F3E1F5" valign="center"
              style={{ pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {team.name}
            </Box>
            <Box x={s.bx + 280} y={897} w={130} h={59} size={36}
              color={team.score < 0 ? '#ff7a7a' : '#F3E1F5'} align="right" valign="center"
              style={{ pointerEvents: 'none' }}>
              <FitText maxWidth={130} align="right" value={team.score.toLocaleString()} />
            </Box>
            {awaitingBuzz && (
              <Box as="button" className="hot hotspot" x={s.bx} y={884} w={497} h={94}
                onClick={() => lockTeam(i)} aria-label={`${team.name} buzzed`}
                style={{ borderRadius: 12 }} />
            )}
          </div>
        );
      })}

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