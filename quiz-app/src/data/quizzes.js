// Sample quiz catalogue for the admin "View Quizzes" screen.
// The first 10 rows match the original Figma mockup exactly; the rest are
// generated so pagination / entries-per-page behave realistically (95 total).

const SEED = [
  ['General Knowledge Quiz', 10, 1, '25 Apr 2025, 10:30 AM'],
  ['Math Mastery', 15, 2, '24 Apr 2025, 04:15 PM'],
  ['Science Explorer', 12, 1, '23 Apr 2025, 11:20 AM'],
  ['History Highlights', 20, 2, '22 Apr 2025, 09:45 AM'],
  ['Geography Genius', 10, 1, '21 Apr 2025, 02:30 PM'],
  ['Sports Trivia', 15, 2, '20 Apr 2025, 03:10 PM'],
  ['Entertainment Buzz', 10, 1, '19 Apr 2025, 01:05 PM'],
  ['Tech Titans', 12, 1, '18 Apr 2025, 10:50 AM'],
  ['Mixed Bag Quiz', 25, 3, '17 Apr 2025, 04:40 PM'],
  ['Kids Fun Quiz', 10, 1, '16 Apr 2025, 11:00 AM'],
];

const EXTRA_NAMES = [
  'Movie Marathon', 'World Capitals', 'Logic Puzzlers', 'Coding Challenge',
  'Art & Culture', 'Music Legends', 'Space Odyssey', 'Animal Kingdom',
  'Famous Inventions', 'Mythology Madness', 'Brain Teasers', 'Pop Culture',
  'Literature Lounge', 'Chemistry Lab', 'Physics Frenzy', 'Biology Basics',
  'Current Affairs', 'Riddle Rumble', 'Trivia Titans', 'Word Wizardry',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function makeDate(i) {
  // Walk backwards day-by-day from 15 Apr 2025 for the generated rows.
  const day = 15 - i;
  const month = day > 0 ? 'Apr' : MONTHS[(3 + Math.floor((day - 1) / 30)) % 4];
  const d = ((day - 1 + 90) % 30) + 1;
  const hour = ((i * 3) % 12) + 1;
  const min = (i * 7) % 60;
  const ampm = i % 2 === 0 ? 'AM' : 'PM';
  return `${pad(d)} ${month} 2025, ${pad(hour)}:${pad(min)} ${ampm}`;
}

const generated = Array.from({ length: 85 }, (_, k) => {
  const name = EXTRA_NAMES[k % EXTRA_NAMES.length];
  const questions = [10, 12, 15, 20, 25][k % 5];
  const rounds = [1, 2, 1, 2, 3][k % 5];
  return [`${name}${k >= EXTRA_NAMES.length ? ' ' + (Math.floor(k / EXTRA_NAMES.length) + 1) : ''}`, questions, rounds, makeDate(k)];
});

export const QUIZZES = [...SEED, ...generated].map(([name, questions, rounds, created], i) => ({
  id: i + 1,
  name,
  questions,
  rounds,
  created,
}));
