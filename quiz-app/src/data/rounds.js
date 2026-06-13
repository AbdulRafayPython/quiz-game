// Shared round-type + scoring model, used by both the admin (Create Quiz) and
// the gameplay screen so they stay in sync.
//
// The client's spec defines 5 round types, each driving a different mechanic:
//   1. Buzzer      — teacher clicks the team that buzzed first; that team locks
//                    in and must answer within the timer. Wrong/no answer =>
//                    negative marking for that team. If NOBODY buzzes => negative
//                    marking for every team.
//   2. Timer       — turn-based, but with a shorter timer the teacher sets when
//                    creating the quiz (e.g. normal 25s, timer round 10s).
//   3. 50:50       — turn-based; teacher manually triggers the 50:50 lifeline.
//   4. Ask Audience— turn-based; teacher manually triggers the ask-audience lifeline.
//   5. General     — turn-based; question may carry a photo and/or video.
//
// `id` is the integer stored in questions.round so the model survives a DB round-trip.

export const ROUND_TYPES = [
  { id: 1, key: 'buzzer',   label: 'Buzzer Round',  short: 'Buzzer' },
  { id: 2, key: 'timer',    label: 'Timer Round',   short: 'Timer' },
  { id: 3, key: 'fifty',    label: '50:50',         short: '50:50' },
  { id: 4, key: 'audience', label: 'Ask Audience',  short: 'ASK Audience' },
  { id: 5, key: 'general',  label: 'General Round', short: 'General' },
];

export const roundById = (id) => ROUND_TYPES.find((r) => r.id === id) || ROUND_TYPES[4];
export const roundKey = (id) => roundById(id).key;

// Quiz-level scoring/timer defaults. The admin can override these per quiz.
export const DEFAULT_SCORING = {
  correctPoints: 1000, // awarded on a correct answer
  penaltyPoints: 500,  // subtracted on a wrong answer / timeout
  timer: 25,           // normal round countdown (seconds)
  timerRoundTimer: 10, // shorter countdown used only in the Timer round (seconds)
};
