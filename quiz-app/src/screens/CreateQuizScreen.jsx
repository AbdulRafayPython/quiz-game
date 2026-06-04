import { useRef, useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import './screens.css';

// Frame "Create Quiz" (51:77) — admin add-question screen.
// The panel art supplies the outer frame + "ADD NEW QUESTION" title; the whole
// interior form (question, options, settings, uploads, added-questions table and
// the action buttons) is rendered live so the screen is fully functional.
//
// The whole container = baked panel art + live form overlay. Both are derived
// from one SCALE knob so they grow together and stay centred on the 1536×1024
// stage. Bump SCALE to enlarge the entire "ADD NEW QUESTION" container
// (1.0 = original size; keep ≲1.2 so it stays inside the stage).
const SCALE = 1.1;
const BASE = { w: 1294, h: 842 }; // panel art native size (= original design size)
const PANEL = {
  w: Math.round(BASE.w * SCALE),
  h: Math.round(BASE.h * SCALE),
};
PANEL.x = Math.round((1536 - PANEL.w) / 2);
PANEL.y = Math.round((1024 - PANEL.h) / 2);
// Form interior offsets/size, measured from the art then scaled with the panel.
// Interior spans the full inside of the frame (design x127..1405, ~6px border),
// so the form fills the panel edge-to-edge.
const CONTENT = {
  x: PANEL.x + Math.round(8 * SCALE),
  y: PANEL.y + Math.round(71 * SCALE),
  w: Math.round(1278 * SCALE),
  h: Math.round(760 * SCALE),
};

const OPT_LETTERS = ['A', 'B', 'C', 'D'];
const ROUNDS = [1, 2, 3, 4, 5];
const PAGE_SIZE = 4;

const SEED_QUESTIONS = [
  { id: 1, question: 'Solve the mathematical equation? 2+2+2+2x2 = ?', options: ['10', '8', '12', '14'], correct: 0 },
  { id: 2, question: 'What is the value of 3 + 7 ?', options: ['10', '11', '12', '9'], correct: 0 },
  { id: 3, question: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correct: 0 },
];

const Check = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);

const emptyForm = () => ({ question: '', options: ['', '', '', ''], correct: 0 });

export default function CreateQuizScreen({ onBack }) {
  const [form, setForm] = useState(emptyForm());
  const [quizName, setQuizName] = useState('');
  const [rounds, setRounds] = useState(1);
  const [timer, setTimer] = useState(15);
  const [imageName, setImageName] = useState('');
  const [videoName, setVideoName] = useState('');
  const [questions, setQuestions] = useState(SEED_QUESTIONS);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);

  const imageRef = useRef(null);
  const videoRef = useRef(null);

  const setOption = (i, v) => setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }));

  const clearForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const saveQuestion = () => {
    if (!form.question.trim() || form.options.some((o) => !o.trim())) return;
    if (editingId != null) {
      setQuestions((qs) => qs.map((q) => (q.id === editingId ? { ...q, ...form } : q)));
    } else {
      const id = questions.length ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
      setQuestions((qs) => [...qs, { id, ...form }]);
    }
    clearForm();
  };

  const editQuestion = (q) => {
    setForm({ question: q.question, options: [...q.options], correct: q.correct });
    setEditingId(q.id);
  };
  const deleteQuestion = (id) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    if (editingId === id) clearForm();
  };

  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = questions.slice(start, start + PAGE_SIZE);
  const goto = (p) => setPage(Math.min(Math.max(1, p), pageCount));

  return (
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />

      {/* Panel art: outer frame + title (baked) */}
      <Box img={A('create-quiz-panel.png')} x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h} />

      {/* Live form interior */}
      <div className="cq-form"
        style={{ position: 'absolute', left: CONTENT.x, top: CONTENT.y, width: CONTENT.w, height: CONTENT.h }}>

        <div className="cq-top">
          {/* LEFT: question & answers */}
          <div className="cq-col-left">
            <div className="cq-section">Question &amp; Answers</div>
            <div className="cq-field">
              <label className="cq-label">Question</label>
              <textarea className="cq-textarea" placeholder="Enter the question..."
                value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
            </div>
            {OPT_LETTERS.map((letter, i) => (
              <div className="cq-opt-row" key={letter}>
                <span className="cq-opt-label">Option {letter}</span>
                <input className="cq-input" placeholder={`Option ${letter}`}
                  value={form.options[i]} onChange={(e) => setOption(i, e.target.value)} />
                <label className={`cq-correct${form.correct === i ? ' on' : ''}`}>
                  <input type="radio" name="correct" checked={form.correct === i}
                    onChange={() => setForm((f) => ({ ...f, correct: i }))} style={{ display: 'none' }} />
                  <span className="cq-check"><Check /></span>
                  Correct
                </label>
              </div>
            ))}
          </div>

          {/* RIGHT: settings */}
          <div className="cq-col-right">
            <div className="cq-field">
              <label className="cq-label">Quiz Name</label>
              <input className="cq-input" placeholder="Enter quiz name"
                value={quizName} onChange={(e) => setQuizName(e.target.value)} />
            </div>
            <div className="cq-field">
              <label className="cq-label">Rounds</label>
              <div className="cq-select-wrap">
                <select className="cq-select" value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                  {ROUNDS.map((r) => <option key={r} value={r}>Round {r}</option>)}
                </select>
                <span className="cq-caret">▾</span>
              </div>
            </div>
            <div className="cq-field">
              <label className="cq-label">Timer (Seconds)</label>
              <input className="cq-input" type="number" min={5} max={300}
                value={timer} onChange={(e) => setTimer(e.target.value)} />
            </div>
            <div className="cq-field">
              <label className="cq-label">Image Upload (Optional)</label>
              <div className="cq-upload" onClick={() => imageRef.current?.click()}>
                <svg className="cq-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" /></svg>
                <div>
                  <div className="cq-upload-main">{imageName || 'Upload Image'}</div>
                  <div className="cq-upload-hint">JPG, PNG (Max 2 MB)</div>
                </div>
                <input ref={imageRef} type="file" accept="image/*" hidden
                  onChange={(e) => setImageName(e.target.files?.[0]?.name || '')} />
              </div>
            </div>
            <div className="cq-field">
              <label className="cq-label">Video Upload (Optional)</label>
              <div className="cq-upload" onClick={() => videoRef.current?.click()}>
                <svg className="cq-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="14" height="14" rx="2" /><path d="m22 8-6 4 6 4V8Z" /></svg>
                <div>
                  <div className="cq-upload-main">{videoName || 'Upload Video'}</div>
                  <div className="cq-upload-hint">MP4 (Max 20 MB)</div>
                </div>
                <input ref={videoRef} type="file" accept="video/*" hidden
                  onChange={(e) => setVideoName(e.target.files?.[0]?.name || '')} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: added questions table */}
        <div className="cq-bottom">
          <div className="cq-section">All Added Questions</div>
          <div className="cq-table">
            <div className="cq-thead">
              <div className="cq-th cq-c-center">#</div>
              <div className="cq-th">QUESTION</div>
              <div className="cq-th cq-c-center">OPTIONS</div>
              <div className="cq-th cq-c-center">CORRECT OPTION</div>
              <div className="cq-th cq-c-center">ACTIONS</div>
            </div>
            <div className="cq-trows">
              {rows.map((q, i) => (
                <div className="cq-trow" key={q.id}>
                  <div className="cq-td cq-c-center">{start + i + 1}</div>
                  <div className="cq-td" title={q.question}>{q.question}</div>
                  <div className="cq-td cq-c-center">{OPT_LETTERS.join(', ')}</div>
                  <div className="cq-td cq-c-center">{OPT_LETTERS[q.correct]}</div>
                  <div className="cq-c-actions">
                    <button className="vq-iconbtn edit" aria-label="Edit question" onClick={() => editQuestion(q)}>
                      <EditIcon /></button>
                    <button className="vq-iconbtn del" aria-label="Delete question" onClick={() => deleteQuestion(q.id)}>
                      <TrashIcon /></button>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <div className="cq-empty">No questions added yet.</div>}
            </div>
            {pageCount > 1 && (
              <div className="cq-foot">
                <button className="vq-pagebtn nav" disabled={safePage <= 1} onClick={() => goto(safePage - 1)}>‹</button>
                {Array.from({ length: pageCount }, (_, k) => k + 1).map((p) => (
                  <button key={p} className={`vq-pagebtn${p === safePage ? ' active' : ''}`} onClick={() => goto(p)}>{p}</button>
                ))}
                <button className="vq-pagebtn nav" disabled={safePage >= pageCount} onClick={() => goto(safePage + 1)}>›</button>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="cq-actions-bar">
          <button className="cq-btn back" onClick={onBack}>‹ Back to Dashboard</button>
          <button className="cq-btn save" onClick={saveQuestion}>
            {editingId != null ? 'Update Question' : 'Save Question'}
          </button>
          <button className="cq-btn clear" onClick={clearForm}>Clear</button>
        </div>
      </div>
    </Stage>
  );
}
