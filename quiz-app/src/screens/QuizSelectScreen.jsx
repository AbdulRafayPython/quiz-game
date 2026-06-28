import { useEffect, useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import FitText from '../components/FitText';
import { isSupabaseConfigured } from '../lib/supabase';
import { listQuizzes } from '../lib/api';
import { playSound } from '../lib/sound';
import './screens.css';

const LIGHT = '#F3E1F5';
const GOLD = '#FAB700';

// Frame 4 (37:7) — Select Quiz.
// Lists the admin-created quizzes from the database (4 per page, newest first),
// with pagination so any number of quizzes is reachable. Offline (no backend)
// a tiny demo list is shown so the screen still renders.
const DEMO_CATEGORIES = [
  { id: 'science', name: 'Science Quiz' },
  { id: 'math', name: 'Mathematics Quiz' },
  { id: 'english', name: 'English Quiz' },
  { id: 'chemistry', name: 'Chemistry Quiz' },
];

const SLOT_Y = [245, 352, 459, 566];
const PER_PAGE = 4;

// Pure-SVG "N teams" badge — a neon pill with a people glyph + the team count.
// Sits in the quiz bar's flat area, clear of the right-hand chevron.
function TeamBadge({ count }) {
  const w = 66, h = 30;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }} aria-hidden="true">
      <rect x="1" y="1" width={w - 2} height={h - 2} rx={(h - 2) / 2}
        fill="#22103f" stroke="#FAB700" strokeWidth="1.5" />
      <g transform="translate(9.5,6.4) scale(0.74)" fill="none" stroke="#FAB700"
        strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </g>
      <text x="47" y="20.5" textAnchor="middle" fill="#FFE08A"
        fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700">{count}</text>
    </svg>
  );
}

export default function QuizSelectScreen({ onBack, onSelectQuiz, teamCount = 1 }) {
  const [items, setItems] = useState(isSupabaseConfigured ? [] : DEMO_CATEGORIES);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    listQuizzes()
      .then((rows) => {
        if (!active) return;
        // Real quizzes carry __real so gameplay loads their questions from the DB.
        setItems((rows || []).map((r) => ({ ...r, __real: true })));
      })
      .catch((e) => console.error('List quizzes failed:', e.message))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // A multi-team match (2+) only offers quizzes built for exactly that many
  // teams, so every round can give each team an equal turn. Quick-play (1 team)
  // and the offline demo list (no team_count) are never filtered.
  const filtered =
    teamCount >= 2 && isSupabaseConfigured
      ? items.filter((q) => q.team_count === teamCount)
      : items;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);
  const goto = (p) => { playSound('click'); setPage(Math.min(Math.max(1, p), pageCount)); };

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Back button (308×205 @ 0,-30) */}
      <Box as="button" className="hot" img={A('back-btn.png')} x={0} y={-30} w={308} h={205}
        onClick={() => { playSound('click'); onBack?.(); }} aria-label="Back" />

      {/* Select-quiz panel (587×880 @ 474,65) */}
      <Box img={A('quiz-panel.png')} x={474} y={65} w={587} h={880} />

      {pageItems.map((c, i) => {
        const y = SLOT_Y[i];
        return (
          <div key={c.id}>
            {/* Quiz bar (497×107) */}
            <Box as="button" className="hot" img={A('quiz-bar-21ddd1.png')} x={519} y={y} w={497} h={107}
              onClick={() => { playSound('click'); onSelectQuiz(c); }} aria-label={c.name} />
            {/* Label — capped so it never runs into the team badge (name left,
                badge right), both kept inside the bar's flat area before the
                right-hand chevron (~x949). */}
            <Box x={589} y={y + 21} w={258} h={48} size={22} color={LIGHT} valign="center"
              style={{ pointerEvents: 'none' }}>
              <FitText maxWidth={258} align="left" value={c.name} />
            </Box>
            {/* Team-count badge (pure SVG) so the teacher sees what each quiz is for */}
            {c.team_count != null && (
              <div aria-label={`${c.team_count} teams`} style={{
                position: 'absolute', left: 861, top: y + 29, width: 66, height: 30,
                pointerEvents: 'none', filter: 'drop-shadow(0 0 5px rgba(250,183,0,0.3))',
              }}>
                <TeamBadge count={c.team_count} />
              </div>
            )}
          </div>
        );
      })}

      {/* Empty / loading state */}
      {pageItems.length === 0 && (
        <Box x={519} y={360} w={497} h={120} size={22} color={LIGHT} align="center" valign="center"
          style={{ pointerEvents: 'none' }}>
          {loading
            ? 'Loading quizzes…'
            : teamCount >= 2
              ? `No quizzes built for ${teamCount} teams yet.\nCreate one in the admin panel.`
              : 'No quizzes yet.\nCreate one in the admin panel.'}
        </Box>
      )}

      {/* Pagination (only when there is more than one page) */}
      {pageCount > 1 && (
        <div style={{
          position: 'absolute', left: 519, top: 700, width: 497, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          pointerEvents: 'auto',
        }}>
          <button className="qs-pagebtn" disabled={safePage <= 1} onClick={() => goto(safePage - 1)}
            aria-label="Previous page">‹</button>
          <span style={{ color: GOLD, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18 }}>
            {safePage} / {pageCount}
          </span>
          <button className="qs-pagebtn" disabled={safePage >= pageCount} onClick={() => goto(safePage + 1)}
            aria-label="Next page">›</button>
        </div>
      )}
    </Stage>
  );
}
