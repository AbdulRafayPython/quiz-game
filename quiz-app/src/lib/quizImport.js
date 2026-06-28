// quizImport — parse + STRICTLY validate a JSON bundle of quizzes for import.
//
// A teacher can ask ChatGPT to produce this exact shape, then paste it in to
// create one quiz (in the editor) or many at once (from the dashboard). Every
// field is required — nothing is guessed — so the teacher gets clear errors
// instead of silently-wrong quizzes.
//
// Round may be given by name (buzzer | timer | fifty | audience | general) or by
// its number 1–5. Formulas in question/option text use $…$ (see lib/mathText).

import { ROUND_TYPES } from '../data/rounds';

// name/alias -> round id
const ROUND_NAMES = {};
for (const r of ROUND_TYPES) ROUND_NAMES[r.key] = r.id;
Object.assign(ROUND_NAMES, {
  '50:50': 3, 'fiftyfifty': 3, '5050': 3,
  'ask audience': 4, 'askaudience': 4, 'audience': 4,
  'general round': 5, 'buzzer round': 1, 'timer round': 2,
});

export const ROUND_NAME_LIST = ROUND_TYPES.map((r) => r.key).join(' | ');

function roundToId(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  if (typeof v === 'string') {
    const id = ROUND_NAMES[v.trim().toLowerCase()];
    return id ?? null;
  }
  return null;
}

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

// The canonical sample shown by the "Sample format" button (and a good prompt to
// hand to ChatGPT). Two quizzes, one with a $…$ formula, all fields present.
export const SAMPLE_IMPORT = {
  quizzes: [
    {
      name: 'Algebra Basics',
      teamCount: 4,
      timer: 25,
      timerRoundTimer: 10,
      correctPoints: 1000,
      penaltyPoints: 500,
      questions: [
        {
          question: 'What is the name of the expression $a^2 + b^2$?',
          options: ['Sum of squares', 'Difference of squares', 'Binomial', 'Quadratic'],
          correct: 0,
          round: 'buzzer',
        },
        {
          question: 'Solve: $\\frac{1}{2} + \\frac{1}{4}$',
          options: ['1/2', '3/4', '2/3', '1'],
          correct: 1,
          round: 'timer',
          correctPoints: 1500,
          penaltyPoints: 750,
        },
      ],
    },
  ],
};

export const SAMPLE_IMPORT_JSON = JSON.stringify(SAMPLE_IMPORT, null, 2);

// Validate a quiz object, pushing readable errors (prefixed with `where`).
function validateQuiz(q, where, errors) {
  if (typeof q !== 'object' || q === null) { errors.push(`${where}: must be an object`); return null; }
  if (!isStr(q.name)) errors.push(`${where}: "name" is required (non-empty text)`);
  if (!(isInt(q.teamCount) && q.teamCount >= 2 && q.teamCount <= 10)) errors.push(`${where}: "teamCount" must be a whole number 2–10`);
  if (!(isInt(q.timer) && q.timer > 0)) errors.push(`${where}: "timer" must be a positive whole number (seconds)`);
  if (!(isInt(q.timerRoundTimer) && q.timerRoundTimer > 0)) errors.push(`${where}: "timerRoundTimer" must be a positive whole number (seconds)`);
  if (!(isInt(q.correctPoints) && q.correctPoints >= 0)) errors.push(`${where}: "correctPoints" must be a whole number ≥ 0`);
  if (!(isInt(q.penaltyPoints) && q.penaltyPoints >= 0)) errors.push(`${where}: "penaltyPoints" must be a whole number ≥ 0`);
  if (!Array.isArray(q.questions) || q.questions.length === 0) {
    errors.push(`${where}: "questions" must be a non-empty list`);
    return null;
  }

  const questions = q.questions.map((qq, i) => {
    const w = `${where} → question ${i + 1}`;
    if (typeof qq !== 'object' || qq === null) { errors.push(`${w}: must be an object`); return null; }
    if (!isStr(qq.question)) errors.push(`${w}: "question" is required (non-empty text)`);
    if (!Array.isArray(qq.options) || qq.options.length !== 4 || !qq.options.every(isStr)) {
      errors.push(`${w}: "options" must be exactly 4 non-empty texts`);
    }
    if (!(isInt(qq.correct) && qq.correct >= 0 && qq.correct <= 3)) {
      errors.push(`${w}: "correct" must be a whole number 0–3 (index of the right option)`);
    }
    const roundId = roundToId(qq.round);
    if (roundId === null) errors.push(`${w}: "round" must be one of ${ROUND_NAME_LIST} (or 1–5)`);
    // Per-question points are optional — they default to the quiz's values — but
    // if given they must be valid whole numbers.
    if (qq.correctPoints != null && !(isInt(qq.correctPoints) && qq.correctPoints >= 0)) {
      errors.push(`${w}: "correctPoints" must be a whole number ≥ 0`);
    }
    if (qq.penaltyPoints != null && !(isInt(qq.penaltyPoints) && qq.penaltyPoints >= 0)) {
      errors.push(`${w}: "penaltyPoints" must be a whole number ≥ 0`);
    }
    return {
      question: qq.question, options: qq.options, correct: qq.correct, round: roundId ?? 5,
      correctPoints: qq.correctPoints ?? q.correctPoints,
      penaltyPoints: qq.penaltyPoints ?? q.penaltyPoints,
    };
  });

  return {
    name: q.name, teamCount: q.teamCount, timer: q.timer, timerRoundTimer: q.timerRoundTimer,
    correctPoints: q.correctPoints, penaltyPoints: q.penaltyPoints, questions,
  };
}

/**
 * Parse + strictly validate import text. Accepts `{ quizzes: [...] }`, a bare
 * array of quizzes, or a single quiz object.
 * Returns { ok, errors: string[], quizzes: normalized[] }.
 */
export function validateImport(text) {
  if (!text || !text.trim()) return { ok: false, errors: ['Paste some JSON first.'], quizzes: [] };
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${e.message}`], quizzes: [] };
  }

  let list;
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.quizzes)) list = data.quizzes;
  else if (data && Array.isArray(data.questions)) list = [data]; // a single quiz object
  else return { ok: false, errors: ['Expected a "quizzes" array (or a single quiz object).'], quizzes: [] };

  if (list.length === 0) return { ok: false, errors: ['No quizzes found in the JSON.'], quizzes: [] };

  const errors = [];
  const quizzes = list.map((q, i) => validateQuiz(q, `Quiz ${i + 1}`, errors)).filter(Boolean);
  return { ok: errors.length === 0, errors, quizzes: errors.length === 0 ? quizzes : [] };
}
