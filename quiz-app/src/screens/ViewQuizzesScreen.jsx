import { useEffect, useMemo, useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { QUIZZES } from '../data/quizzes';
import { isSupabaseConfigured } from '../lib/supabase';
import { listQuizzes, deleteQuiz } from '../lib/api';
import './screens.css';

const fmtDate = (s) => {
  try { return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
};

// Frame "View Quizzes" (60:26) — admin quiz list.
// The panel art supplies the outer frame + title + the two top buttons; the
// table card (header, rows, footer) is rendered live over the baked mockup so
// pagination, entries-per-page, edit and delete are fully functional.
// All geometry is in design px, measured from view-quizzes-panel.png.
//
// Bump SCALE to enlarge the whole panel; it stays centred on the 1536×1024 stage
// (which also reduces the empty margin above/below). The card and hotspots are
// derived from the panel so they move/scale with it.
const SCALE = 1.1;
const BASE = { w: 1294, h: 851 }; // panel art design size (S=1)
const PANEL = {
  w: Math.round(BASE.w * SCALE),
  h: Math.round(BASE.h * SCALE),
};
PANEL.x = Math.round((1536 - PANEL.w) / 2);
PANEL.y = Math.round((1024 - PANEL.h) / 2);
const R = (n) => Math.round(n * SCALE);

// Card base geometry (S=1), relative offset from the panel is (28, 121).
const CARD = { x: 149, y: 208, w: 1235, h: 706 };

// Column layout, x measured relative to the card's left edge.
const COLS = [
  { key: 'idx', left: 0, w: 90, align: 'center' },
  { key: 'name', left: 111, w: 300, align: 'left' },
  { key: 'q', left: 416, w: 100, align: 'center' },
  { key: 'rounds', left: 618, w: 100, align: 'center' },
  { key: 'created', left: 769, w: 260, align: 'center' },
  { key: 'actions', left: 1013, w: 180, align: 'center' },
];

const HEADERS = {
  idx: '#',
  name: 'QUIZ NAME',
  q: 'TOTAL QUESTIONS',
  rounds: 'ROUNDS',
  created: 'CREATED ON',
  actions: 'ACTIONS',
};

const PAGE_SIZES = [10, 25, 50, 100];

const cellStyle = (c) => ({
  position: 'absolute',
  left: c.left,
  width: c.w,
  top: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent:
    c.align === 'center' ? 'center' : c.align === 'right' ? 'flex-end' : 'flex-start',
  paddingLeft: c.align === 'left' ? 4 : 0,
});

// Compact pagination model: [1, '…', 4, 5, 6, '…', 20] style.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push('…');
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < total - 1) out.push('…');
  out.push(total);
  return out;
}

export default function ViewQuizzesScreen({ onBack, onAddNew, onEditQuiz }) {
  const [quizzes, setQuizzes] = useState(isSupabaseConfigured ? [] : QUIZZES);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Load live quizzes from Supabase when configured.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    listQuizzes()
      .then((rows) => {
        if (!active) return;
        setQuizzes(rows.map((r) => ({
          id: r.id, name: r.name, questions: r.question_count, rounds: r.rounds, created: fmtDate(r.created_at),
        })));
      })
      .catch((e) => console.error('Failed to load quizzes:', e.message));
    return () => { active = false; };
  }, []);

  const total = quizzes.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const rows = useMemo(
    () => quizzes.slice(start, start + pageSize),
    [quizzes, start, pageSize]
  );

  const goto = (p) => setPage(Math.min(Math.max(1, p), pageCount));
  const changeSize = (n) => {
    setPageSize(n);
    setPage(1);
  };
  const remove = (id) => {
    setQuizzes((qs) => qs.filter((q) => q.id !== id));
    if (isSupabaseConfigured) deleteQuiz(id).catch((e) => console.error('Delete failed:', e.message));
  };

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + pageSize, total);

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Panel art: outer frame + title + the two top buttons (baked) */}
      <Box img={A('view-quizzes-panel.png')} x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h} />

      {/* Hotspots over the baked top buttons (positions/sizes scale with panel) */}
      <Box as="button" className="hot hotspot" x={PANEL.x + R(35)} y={PANEL.y + R(26)} w={R(246)} h={R(52)}
        onClick={onBack} aria-label="Back to Dashboard" style={{ borderRadius: 10 }} />
      <Box as="button" className="hot hotspot" x={PANEL.x + R(1042)} y={PANEL.y + R(28)} w={R(197)} h={R(51)}
        onClick={onAddNew} aria-label="Add New Quiz" style={{ borderRadius: 10 }} />

      {/* Live, functional table card (covers the baked mockup table). Kept at base
          size and scaled via transform so its fixed column layout stays aligned. */}
      <div className="vq-card"
        style={{
          position: 'absolute',
          left: PANEL.x + R(28),
          top: PANEL.y + R(113),
          width: CARD.w,
          height: CARD.h,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
        }}>
        {/* Header */}
        <div className="vq-head">
          {COLS.map((c) => (
            <div key={c.key} className="vq-headcell" style={cellStyle(c)}>
              {HEADERS[c.key]}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="vq-rows">
          {rows.map((quiz, i) => (
            <div key={quiz.id} className="vq-row">
              <div className="vq-cell vq-idx" style={cellStyle(COLS[0])}>{start + i + 1}</div>
              <div className="vq-cell vq-name" style={cellStyle(COLS[1])}>{quiz.name}</div>
              <div className="vq-cell" style={cellStyle(COLS[2])}>{quiz.questions}</div>
              <div className="vq-cell" style={cellStyle(COLS[3])}>{quiz.rounds}</div>
              <div className="vq-cell vq-created" style={cellStyle(COLS[4])}>{quiz.created}</div>
              <div className="vq-cell" style={cellStyle(COLS[5])}>
                <div className="vq-actions">
                  <button className="vq-iconbtn edit" aria-label={`Edit ${quiz.name}`}
                    onClick={() => onEditQuiz?.(quiz)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button className="vq-iconbtn del" aria-label={`Delete ${quiz.name}`}
                    onClick={() => remove(quiz.id)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="vq-empty">No quizzes found.</div>}
        </div>

        {/* Footer */}
        <div className="vq-foot">
          <div className="vq-foot-left">
            <div className="vq-select-wrap">
              <select className="vq-select" value={pageSize}
                onChange={(e) => changeSize(Number(e.target.value))} aria-label="Entries per page">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="vq-caret">▾</span>
            </div>
            <span className="vq-foot-label">Entries per page</span>
          </div>

          <div className="vq-pages">
            <button className="vq-pagebtn nav" disabled={safePage <= 1}
              onClick={() => goto(safePage - 1)} aria-label="Previous page">‹</button>
            {pageList(safePage, pageCount).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="vq-ellipsis">…</span>
              ) : (
                <button key={p} className={`vq-pagebtn${p === safePage ? ' active' : ''}`}
                  onClick={() => goto(p)} aria-current={p === safePage ? 'page' : undefined}>{p}</button>
              )
            )}
            <button className="vq-pagebtn nav" disabled={safePage >= pageCount}
              onClick={() => goto(safePage + 1)} aria-label="Next page">›</button>
          </div>

          <div className="vq-showing">
            Showing {showingFrom} to {showingTo} of {total} entries
          </div>
        </div>
      </div>
    </Stage>
  );
}
