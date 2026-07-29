// quizImport — parse + LENIENTLY sanitize a JSON bundle of quizzes for import.
//
// A teacher asks ChatGPT for this shape and pastes it in. ChatGPT output is
// often slightly off (missing/renamed fields, out-of-range values), so instead
// of rejecting the whole thing we REPAIR it: any missing or invalid field is
// replaced with the sample's default value, and a question/quiz that can't be
// salvaged is skipped. The import then succeeds and the teacher fixes the
// details manually — every fix we made is reported as a warning.
//
// The only hard failures are: unparseable JSON, wrong top-level shape, or a
// bundle with no usable questions at all.
//
// Round may be given by name (buzzer | timer | fifty | audience | general) or by
// its number 1–5. Formulas in question/option text use $…$ (see lib/mathText).

import { ROUND_TYPES, DEFAULT_SCORING } from '../data/rounds';

// name/alias -> round id
const ROUND_NAMES = {};
for (const r of ROUND_TYPES) ROUND_NAMES[r.key] = r.id;
Object.assign(ROUND_NAMES, {
  '50:50': 3, 'fiftyfifty': 3, '5050': 3,
  'ask audience': 4, 'askaudience': 4, 'audience': 4,
  'general round': 5, 'buzzer round': 1, 'timer round': 2,
});

export const ROUND_NAME_LIST = ROUND_TYPES.map((r) => r.key).join(' | ');

// Defaults used to repair missing/invalid fields (matches the sample below).
const DEF = {
  name: 'Imported Quiz',
  teamCount: 2,
  timer: DEFAULT_SCORING.timer,
  timerRoundTimer: DEFAULT_SCORING.timerRoundTimer,
  correctPoints: DEFAULT_SCORING.correctPoints,
  penaltyPoints: DEFAULT_SCORING.penaltyPoints,
  round: 5, // General
};

function roundToId(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  if (typeof v === 'string') return ROUND_NAMES[v.trim().toLowerCase()] ?? null;
  return null;
}

const toInt = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : null; };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Coerce a value to a whole number in [lo,hi], falling back to `def` and logging
// a warning describing the fix.
function fixInt(v, lo, hi, def, label, warns) {
  if (v == null || v === '') { warns.push(`${label} missing → set to ${def}`); return def; }
  const n = toInt(v);
  if (n === null) { warns.push(`${label} isn't a number → set to ${def}`); return def; }
  const c = clamp(n, lo, hi);
  if (c !== n) warns.push(`${label} out of range → set to ${c}`);
  return c;
}

// The canonical sample shown by the "Sample format" button (and a good prompt to
// hand to ChatGPT). One quiz, a $…$ formula, and an optional per-question points
// override.
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

// Repair one question. Returns a valid question, or null if it can't be salvaged.
function sanitizeQuestion(qq, quiz, where, warns) {
  if (typeof qq !== 'object' || qq === null) { warns.push(`${where}: not a question → removed`); return null; }

  const question = typeof qq.question === 'string' ? qq.question
    : typeof qq.text === 'string' ? qq.text : '';
  if (!question.trim()) warns.push(`${where}: no question text → left blank to fill in`);

  // Exactly 4 option strings — pad short lists, trim long ones.
  const src = Array.isArray(qq.options) ? qq.options : [];
  const options = src.slice(0, 4).map((o) => (o == null ? '' : String(o)));
  while (options.length < 4) options.push('');
  if (!Array.isArray(qq.options) || qq.options.length !== 4) warns.push(`${where}: needs 4 options → padded/trimmed to 4`);

  let correct = toInt(qq.correct);
  if (correct === null || correct < 0 || correct > 3) { warns.push(`${where}: "correct" invalid → set to option A`); correct = 0; }

  let round = roundToId(qq.round);
  if (round === null) { warns.push(`${where}: "round" invalid → set to General`); round = DEF.round; }

  // Per-question points are optional; fall back to the (sanitized) quiz values.
  let cp = qq.correctPoints == null ? quiz.correctPoints : toInt(qq.correctPoints);
  if (cp === null || cp < 0) { warns.push(`${where}: "correctPoints" invalid → using quiz default`); cp = quiz.correctPoints; }
  let pp = qq.penaltyPoints == null ? quiz.penaltyPoints : toInt(qq.penaltyPoints);
  if (pp === null || pp < 0) { warns.push(`${where}: "penaltyPoints" invalid → using quiz default`); pp = quiz.penaltyPoints; }

  return { question, options, correct, round, correctPoints: cp, penaltyPoints: pp };
}

// Repair one quiz. Returns a normalized quiz, or null if it isn't an object.
function sanitizeQuiz(q, where, warns) {
  if (typeof q !== 'object' || q === null) { warns.push(`${where}: not a quiz → removed`); return null; }

  const name = (typeof q.name === 'string' && q.name.trim()) ? q.name : DEF.name;
  if (name === DEF.name && !(typeof q.name === 'string' && q.name.trim())) warns.push(`${where}: no name → "${DEF.name}"`);

  const quiz = {
    name,
    teamCount: fixInt(q.teamCount, 2, 10, DEF.teamCount, `${where}: teamCount`, warns),
    timer: fixInt(q.timer, 3, 600, DEF.timer, `${where}: timer`, warns),
    timerRoundTimer: fixInt(q.timerRoundTimer, 3, 600, DEF.timerRoundTimer, `${where}: timerRoundTimer`, warns),
    correctPoints: fixInt(q.correctPoints, 0, 1e9, DEF.correctPoints, `${where}: correctPoints`, warns),
    penaltyPoints: fixInt(q.penaltyPoints, 0, 1e9, DEF.penaltyPoints, `${where}: penaltyPoints`, warns),
  };

  const raw = Array.isArray(q.questions) ? q.questions : [];
  if (!Array.isArray(q.questions)) warns.push(`${where}: no "questions" list`);
  quiz.questions = raw
    .map((qq, i) => sanitizeQuestion(qq, quiz, `${where} → Q${i + 1}`, warns))
    .filter(Boolean);

  return quiz;
}

/**
 * Parse + leniently sanitize import text. Accepts `{ quizzes: [...] }`, a bare
 * array of quizzes, or a single quiz object. Repairs everything it can and
 * reports what it changed.
 * Returns { ok, errors: string[], warnings: string[], quizzes: normalized[] }.
 */
export function validateImport(text) {
  if (!text || !text.trim()) return { ok: false, errors: ['Paste some JSON first.'], warnings: [], quizzes: [] };
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${e.message}`], warnings: [], quizzes: [] };
  }

  let list;
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.quizzes)) list = data.quizzes;
  else if (data && Array.isArray(data.questions)) list = [data]; // a single quiz object
  else return { ok: false, errors: ['Expected a "quizzes" array (or a single quiz object).'], warnings: [], quizzes: [] };

  if (list.length === 0) return { ok: false, errors: ['No quizzes found in the JSON.'], warnings: [], quizzes: [] };

  const warnings = [];
  const quizzes = list
    .map((q, i) => sanitizeQuiz(q, `Quiz ${i + 1}`, warnings))
    .filter((q) => q && q.questions.length > 0);

  if (quizzes.length === 0) {
    return { ok: false, errors: ['No usable questions found — every quiz was empty.'], warnings, quizzes: [] };
  }
  return { ok: true, errors: [], warnings, quizzes };
}

/**
 * Build a Toast payload for an import result: a plain green success, or an amber
 * "warn" toast that lists what was auto-fixed (capped so it stays readable).
 */
export function importToast(baseTitle, warnings = []) {
  if (!warnings.length) return { type: 'success', title: `${baseTitle} 🎉` };
  const lines = warnings.slice(0, 8);
  if (warnings.length > 8) lines.push(`…and ${warnings.length - 8} more`);
  const n = warnings.length;
  return { type: 'warn', title: `${baseTitle} — ${n} thing${n === 1 ? '' : 's'} auto-fixed, please review`, lines };
}
