// CreateQuizScreen.jsx  — with full formula / LaTeX support
//
// Changes vs original:
//  1. FormulaInput replaces bare <input>/<textarea> for question + all 4 options.
//     Each field has its own latexMode boolean (tracked in latexModes state).
//  2. The sub/superscript toolbar is hidden when a field is in LaTeX mode
//     (LaTeX handles ^{} natively; Unicode glyphs would fight the renderer).
//  3. The questions table renders stored values through renderForDisplay() so
//     LaTeX options appear as rendered math, not raw backslash strings.
//  4. KaTeX CSS must be imported once in your app root or index.html CDN link:
//        import 'katex/dist/katex.min.css';
//     or <link href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
//  5. formula-input.css must be imported alongside screens.css.

import { useEffect, useRef, useState } from 'react';
import Stage from '../components/Stage';
import Box, { A } from '../components/Box';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  createQuiz, updateQuiz, getQuiz, listQuestions,
  saveQuestion as apiSaveQuestion, deleteQuestion as apiDeleteQuestion, uploadMedia, importQuiz,
} from '../lib/api';
import ImportModal from '../components/ImportModal';
import Toast from '../components/Toast';
import { imageToWebp, videoPoster } from '../lib/media';
import { ROUND_TYPES, roundById, DEFAULT_SCORING } from '../data/rounds';
import { playSound } from '../lib/sound';
import { toScript } from '../lib/textscript';
import FormulaInput from '../components/FormulaInput';
import { renderMixedHtml as renderForDisplay } from '../lib/mathText';
import './screens.css';


// ─── helpers ────────────────────────────────────────────────────────────────

const mapRow = (r) => ({
  id: r.id, question: r.text, options: r.options, correct: r.correct,
  round: r.round ?? 5,
  correctPoints: r.correct_points ?? DEFAULT_SCORING.correctPoints,
  penaltyPoints: r.penalty_points ?? DEFAULT_SCORING.penaltyPoints,
  image_url: r.image_url ?? null,
  video_url: r.video_url ?? null, poster_url: r.poster_url ?? null,
});

// Renders a value for the questions table: plain text or KaTeX HTML.
function TableCell({ value }) {
  const { isLatex, html, plain } = renderForDisplay(value);
  if (!isLatex) return <span>{plain}</span>;
  return (
    <span
      className="formula-display"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ verticalAlign: 'middle' }}
    />
  );
}

// ─── layout constants (unchanged from original) ──────────────────────────────

const SCALE = 1.1;
const BASE = { w: 1294, h: 842 };
const PANEL = { w: Math.round(BASE.w * SCALE), h: Math.round(BASE.h * SCALE) };
PANEL.x = Math.round((1536 - PANEL.w) / 2);
PANEL.y = Math.round((1024 - PANEL.h) / 2);
const CONTENT = {
  x: PANEL.x + Math.round(8 * SCALE),
  y: PANEL.y + Math.round(71 * SCALE),
  w: Math.round(1278 * SCALE),
  h: Math.round(760 * SCALE),
};

const OPT_LETTERS = ['A', 'B', 'C', 'D'];
const PAGE_SIZE = 4;

const SEED_QUESTIONS = [
  { id: 1, question: 'Solve the mathematical equation? 2+2+2+2x2 = ?', options: ['10', '8', '12', '14'], correct: 0, round: 1 },
  { id: 2, question: 'What is the value of 3 + 7 ?', options: ['10', '11', '12', '9'], correct: 0, round: 2 },
  { id: 3, question: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correct: 0, round: 5 },
];

// ─── icon sub-components (unchanged) ─────────────────────────────────────────

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

// ─── form helpers ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  question: '', options: ['', '', '', ''], correct: 0, round: 5,
  correctPoints: DEFAULT_SCORING.correctPoints, penaltyPoints: DEFAULT_SCORING.penaltyPoints,
});

// latexModes: { question: bool, opt0: bool, opt1: bool, opt2: bool, opt3: bool }
const emptyLatexModes = () => ({ question: false, opt0: false, opt1: false, opt2: false, opt3: false });

// ─── main component ───────────────────────────────────────────────────────────

export default function CreateQuizScreen({ onBack, editQuiz = null }) {
  const [form, setForm] = useState(emptyForm());
  const [latexModes, setLatexModes] = useState(emptyLatexModes());
  const [quizName, setQuizName] = useState('');
  const [timer, setTimer] = useState(DEFAULT_SCORING.timer);
  const [timerRoundTimer, setTimerRoundTimer] = useState(DEFAULT_SCORING.timerRoundTimer);
  const [correctPoints, setCorrectPoints] = useState(DEFAULT_SCORING.correctPoints);
  const [penaltyPoints, setPenaltyPoints] = useState(DEFAULT_SCORING.penaltyPoints);
  const [teamCount, setTeamCount] = useState(2);   // how many teams this quiz is built for (2–10)
  const [imageName, setImageName] = useState('');
  const [videoName, setVideoName] = useState('');
  const [questions, setQuestions] = useState(
    isSupabaseConfigured ? [] : (editQuiz ? [] : SEED_QUESTIONS)
  );
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [quizId, setQuizId] = useState(editQuiz?.id ?? null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(editQuiz && isSupabaseConfigured));
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);

  const imageRef = useRef(null);
  const videoRef = useRef(null);

  // Sub/superscript toolbar: tracks whichever plain-text field is focused.
  // When a field is in LaTeX mode we skip this entirely (LaTeX uses ^{} and _{}).
  const activeFieldRef = useRef(null);
  const activeSetRef = useRef(null);
  const applyScript = (kind) => {
    const el = activeFieldRef.current;
    const set = activeSetRef.current;
    if (!el || !set) return;
    const start = el.selectionStart, end = el.selectionEnd;
    if (start == null || start === end) return;
    const v = el.value;
    const converted = toScript(v.slice(start, end), kind);
    set(v.slice(0, start) + converted + v.slice(end));
    requestAnimationFrame(() => {
      try { el.focus(); el.setSelectionRange(start, start + converted.length); } catch { /* ignore */ }
    });
  };

  const [helpOpen, setHelpOpen] = useState(false);
  const fmtRef = useRef(null);
  useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e) => { if (fmtRef.current && !fmtRef.current.contains(e.target)) setHelpOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setHelpOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [helpOpen]);

  // Any field in latex mode? → hide the Unicode sub/superscript toolbar entirely
  // (it would produce garbled output when KaTeX is rendering)
  const anyLatexActive = Object.values(latexModes).some(Boolean);

  // ─── edit mode: load quiz + questions ──────────────────────────────────────

  useEffect(() => {
    if (!editQuiz) return;
    setQuizName(editQuiz.name ?? '');
    if (!isSupabaseConfigured) return;
    let active = true;
    (async () => {
      try {
        const [quiz, qs] = await Promise.all([getQuiz(editQuiz.id), listQuestions(editQuiz.id)]);
        if (!active) return;
        if (quiz) {
          setQuizName(quiz.name ?? '');
          if (quiz.team_count != null) setTeamCount(quiz.team_count);
          if (quiz.timer != null) setTimer(quiz.timer);
          if (quiz.timer_round_timer != null) setTimerRoundTimer(quiz.timer_round_timer);
          if (quiz.correct_points != null) setCorrectPoints(quiz.correct_points);
          if (quiz.penalty_points != null) setPenaltyPoints(quiz.penalty_points);
        }
        setQuestions((qs ?? []).map(mapRow));
      } catch (e) {
        console.error('Load quiz for edit failed:', e.message);
        alert('Could not load this quiz: ' + e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editQuiz]);

  // ─── form helpers ──────────────────────────────────────────────────────────

  const setOption = (i, v) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }));

  const clearForm = () => {
    // New questions start from the quiz-level default points (editable per question).
    setForm({ ...emptyForm(), correctPoints, penaltyPoints });
    setLatexModes(emptyLatexModes());
    setEditingId(null);
  };

  const setLatexMode = (field, val) =>
    setLatexModes((m) => ({ ...m, [field]: val }));

  // ─── save / edit / delete ─────────────────────────────────────────────────

  const saveQuestion = async () => {
    playSound('click');
    if (!form.question.trim() || form.options.some((o) => !o.trim())) return;

    if (!isSupabaseConfigured) {
      if (editingId != null) {
        setQuestions((qs) => qs.map((q) => (q.id === editingId ? { ...q, ...form } : q)));
      } else {
        const id = questions.length ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
        setQuestions((qs) => [...qs, { id, ...form }]);
      }
      clearForm();
      return;
    }

    setSaving(true);
    try {
      const quizSettings = {
        name: quizName.trim() || 'Untitled Quiz',
        rounds: ROUND_TYPES.length,
        teamCount: Number(teamCount),
        timer: Number(timer),
        timerRoundTimer: Number(timerRoundTimer),
        correctPoints: Number(correctPoints),
        penaltyPoints: Number(penaltyPoints),
      };
      let qid = quizId;
      if (!qid) {
        const quiz = await createQuiz(quizSettings);
        qid = quiz.id;
        setQuizId(qid);
      } else {
        await updateQuiz(qid, quizSettings);
      }
      const image_url = imageFile ? await uploadMedia(await imageToWebp(imageFile)) : null;
      let video_url = null, poster_url = null;
      if (videoFile) {
        const poster = await videoPoster(videoFile);
        [video_url, poster_url] = await Promise.all([
          uploadMedia(videoFile),
          poster ? uploadMedia(poster) : Promise.resolve(null),
        ]);
      }
      const saved = await apiSaveQuestion(qid, {
        id: typeof editingId === 'string' ? editingId : undefined,
        question: form.question, options: form.options, correct: form.correct,
        round: form.round, correctPoints: Number(form.correctPoints), penaltyPoints: Number(form.penaltyPoints),
        image_url, video_url, poster_url, position: questions.length,
      });
      setQuestions((qs) =>
        qs.some((q) => q.id === saved.id)
          ? qs.map((q) => (q.id === saved.id ? mapRow(saved) : q))
          : [...qs, mapRow(saved)]
      );
      setImageFile(null); setVideoFile(null); setImageName(''); setVideoName('');
      clearForm();
    } catch (e) {
      console.error('Save question failed:', e.message);
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const editQuestion = (q) => {
    playSound('click');
    setForm({
      question: q.question, options: [...q.options], correct: q.correct, round: q.round ?? 5,
      correctPoints: q.correctPoints ?? correctPoints, penaltyPoints: q.penaltyPoints ?? penaltyPoints,
    });
    setLatexModes(emptyLatexModes()); // reset — teacher decides per field
    setEditingId(q.id);
  };

  const deleteQuestion = (id) => {
    playSound('click');
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    if (editingId === id) clearForm();
    if (isSupabaseConfigured && typeof id === 'string') {
      apiDeleteQuestion(id).catch((e) => console.error('Delete failed:', e.message));
    }
  };

  // JSON import (single quiz) → load it into the editor. Online: persist the
  // quiz + questions immediately so they appear saved (and reviewable) in the
  // table; offline just populates local state.
  const handleImport = async (quizzes) => {
    const quiz = quizzes[0];
    setQuizName(quiz.name);
    setTeamCount(quiz.teamCount);
    setTimer(quiz.timer);
    setTimerRoundTimer(quiz.timerRoundTimer);
    setCorrectPoints(quiz.correctPoints);
    setPenaltyPoints(quiz.penaltyPoints);
    setEditingId(null);
    setForm(emptyForm());
    setPage(1);
    const n = quiz.questions.length;
    if (!isSupabaseConfigured) {
      setQuestions(quiz.questions.map((q, i) => ({
        id: i + 1, question: q.question, options: q.options, correct: q.correct, round: q.round,
      })));
      setShowImport(false);
      setToast({ type: 'success', title: `Imported “${quiz.name}” — ${n} question${n === 1 ? '' : 's'} loaded` });
      return;
    }
    setImporting(true);
    try {
      const res = await importQuiz(quiz);
      setQuizId(res.id);
      setQuestions(res.questions.map(mapRow));
      setShowImport(false);
      setToast({ type: 'success', title: `Imported “${quiz.name}” — ${n} question${n === 1 ? '' : 's'} added 🎉` });
    } catch (e) {
      console.error('Import failed:', e.message);
      setToast({ type: 'error', title: 'Import failed', lines: [e.message] });
    } finally {
      setImporting(false);
    }
  };

  // ─── pagination ───────────────────────────────────────────────────────────

  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = questions.slice(start, start + PAGE_SIZE);
  const goto = (p) => { playSound('click'); setPage(Math.min(Math.max(1, p), pageCount)); };

  // Soft guidance: per-round question counts vs the per-team target. For equal
  // participation each round should hold a multiple of teamCount questions
  // (one per team). This never blocks saving — it's just a hint for the teacher.
  const roundCounts = questions.reduce((acc, q) => {
    const id = q.round ?? 5;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const roundSummary = ROUND_TYPES
    .filter((r) => roundCounts[r.id])
    .map((r) => ({ short: r.short, count: roundCounts[r.id], ok: roundCounts[r.id] % teamCount === 0 }));

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <>
    <Stage className="screen-fade">
      <Box img={A('stage-bg.png')} x={0} y={0} w={1536} h={1024} style={{ filter: 'blur(20px)' }} />
      <Box img={A('create-quiz-panel.png')} x={PANEL.x} y={PANEL.y} w={PANEL.w} h={PANEL.h} />

      <div
        className="cq-form"
        style={{ position: 'absolute', left: CONTENT.x, top: CONTENT.y, width: CONTENT.w, height: CONTENT.h }}
      >
        {loading && (
          <div className="cq-loading" style={{
            position: 'absolute', inset: 0, zIndex: 5, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10, 12, 30, 0.55)', backdropFilter: 'blur(2px)',
            borderRadius: 18, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
          }}>
            Loading quiz…
          </div>
        )}

        <div className="cq-top">
          {/* LEFT: question & answers */}
          <div className="cq-col-left">
            <div className="cq-section">Question &amp; Answers</div>

            {/* Sub/superscript toolbar — hidden when any field is in LaTeX mode */}
            {!anyLatexActive && (
              <div className="cq-fmtbar" ref={fmtRef}>
                <span className="cq-fmt-label">Subscript / Superscript</span>
                <button type="button" className="cq-fmt-btn" aria-label="Superscript"
                  title="Superscript — e.g. x²" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyScript('super')}>x²</button>
                <button type="button" className="cq-fmt-btn" aria-label="Subscript"
                  title="Subscript — e.g. H₂O" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyScript('sub')}>x₂</button>
                <button type="button" className="cq-fmt-help" aria-label="How to use formatting"
                  aria-expanded={helpOpen} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setHelpOpen((o) => !o)}>?</button>
                {helpOpen && (
                  <div className="cq-fmt-pop" role="dialog" aria-label="How to add subscript or superscript">
                    <div className="cq-fmt-pop-title">Add a formula like H₂O or x²</div>
                    <ol className="cq-fmt-steps">
                      <li>Type the text normally — e.g. <b>H2O</b></li>
                      <li>Select the part to format — e.g. the <b>2</b></li>
                      <li>Click <b>x₂</b> for subscript (or <b>x²</b> for superscript)</li>
                    </ol>
                    <div className="cq-fmt-pop-tip">
                      Works in the question and all four option boxes. Select again and
                      click the same button to undo.
                      <br /><br />
                      <b>Math formulas:</b> wrap any LaTeX in <b>$…$</b> to mix it into
                      normal text — e.g. <b>What is $a^2 + b^2$ called?</b>. You can paste
                      LaTeX straight from ChatGPT (it already uses <b>$…$</b>). The live
                      preview under each box shows exactly how it will look.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Question field */}
            <div className="cq-field">
              <label className="cq-label">Question</label>
              <FormulaInput
                multiline
                placeholder="Enter the question…"
                value={form.question}
                onChange={(val) => setForm((f) => ({ ...f, question: val }))}
                onFocus={(e) => {
                  // Only register for Unicode toolbar when NOT in latex mode
                  if (!latexModes.question) {
                    activeFieldRef.current = e.target;
                    activeSetRef.current = (val) => setForm((f) => ({ ...f, question: val }));
                  }
                }}
                latexMode={latexModes.question}
                onLatexToggle={(val) => setLatexMode('question', val)}
              />
            </div>

            {/* Round type */}
            <div className="cq-field">
              <label className="cq-label">Round Type</label>
              <div className="cq-select-wrap">
                <select className="cq-select" value={form.round}
                  onChange={(e) => setForm((f) => ({ ...f, round: Number(e.target.value) }))}>
                  {ROUND_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <span className="cq-caret">▾</span>
              </div>
            </div>

            {/* Per-question points — pre-filled from the quiz defaults, editable
                per question. These are what gameplay actually awards / deducts. */}
            <div className="cq-field cq-field-row">
              <div className="cq-subfield">
                <label className="cq-label">Correct Points (this question)</label>
                <input className="cq-input" type="number" min={0} step={10}
                  value={form.correctPoints}
                  onChange={(e) => setForm((f) => ({ ...f, correctPoints: e.target.value }))} />
              </div>
              <div className="cq-subfield">
                <label className="cq-label">Penalty Points (this question)</label>
                <input className="cq-input" type="number" min={0} step={10}
                  value={form.penaltyPoints}
                  onChange={(e) => setForm((f) => ({ ...f, penaltyPoints: e.target.value }))} />
              </div>
            </div>

            {/* Option fields */}
            {OPT_LETTERS.map((letter, i) => {
              const modeKey = `opt${i}`;
              return (
                <div className="cq-opt-row" key={letter}>
                  <span className="cq-opt-label">Option {letter}</span>
                  <FormulaInput
                    placeholder={`Option ${letter}`}
                    value={form.options[i]}
                    onChange={(val) => setOption(i, val)}
                    onFocus={(e) => {
                      if (!latexModes[modeKey]) {
                        activeFieldRef.current = e.target;
                        activeSetRef.current = (val) => setOption(i, val);
                      }
                    }}
                    latexMode={latexModes[modeKey]}
                    onLatexToggle={(val) => setLatexMode(modeKey, val)}
                  />
                  <label className={`cq-correct${form.correct === i ? ' on' : ''}`}>
                    <input type="radio" name="correct" checked={form.correct === i}
                      onChange={() => setForm((f) => ({ ...f, correct: i }))} style={{ display: 'none' }} />
                    <span className="cq-check"><Check /></span>
                    Correct
                  </label>
                </div>
              );
            })}
          </div>

          {/* RIGHT: settings (unchanged) */}
          <div className="cq-col-right">
            <div className="cq-field">
              <label className="cq-label">Quiz Name</label>
              <input className="cq-input" placeholder="Enter quiz name"
                value={quizName} onChange={(e) => setQuizName(e.target.value)} />
            </div>
            <div className="cq-field">
              <label className="cq-label">Designed for (Teams)</label>
              <div className="cq-select-wrap">
                <select className="cq-select" value={teamCount}
                  onChange={(e) => setTeamCount(Number(e.target.value))}>
                  {Array.from({ length: 9 }, (_, k) => k + 2).map((n) => (
                    <option key={n} value={n}>{n} Teams</option>
                  ))}
                </select>
                <span className="cq-caret">▾</span>
              </div>
            </div>
            <div className="cq-field cq-field-row">
              <div className="cq-subfield">
                <label className="cq-label">Timer (Seconds)</label>
                <input className="cq-input" type="number" min={5} max={300}
                  value={timer} onChange={(e) => setTimer(e.target.value)} />
              </div>
              <div className="cq-subfield">
                <label className="cq-label">Timer Round (Seconds)</label>
                <input className="cq-input" type="number" min={3} max={300}
                  value={timerRoundTimer} onChange={(e) => setTimerRoundTimer(e.target.value)} />
              </div>
            </div>
            <div className="cq-help-line">“Timer” is the countdown for normal rounds; “Timer Round” is the shorter countdown used only in the Timer round.</div>
            <div className="cq-field cq-field-row">
              <div className="cq-subfield">
                <label className="cq-label">Default Correct Points</label>
                <input className="cq-input" type="number" min={0} step={10}
                  value={correctPoints} onChange={(e) => setCorrectPoints(e.target.value)} />
              </div>
              <div className="cq-subfield">
                <label className="cq-label">Default Penalty Points</label>
                <input className="cq-input" type="number" min={0} step={10}
                  value={penaltyPoints} onChange={(e) => setPenaltyPoints(e.target.value)} />
              </div>
            </div>
            <div className="cq-help-line">Defaults for new questions — each question can override them on the left.</div>
            <div className="cq-field">
              <label className="cq-label">Image Upload (Optional)</label>
              <div className="cq-upload" onClick={() => imageRef.current?.click()}>
                <svg className="cq-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" /></svg>
                <div>
                  <div className="cq-upload-main">{imageName || 'Upload Image'}</div>
                  <div className="cq-upload-hint">JPG, PNG → auto-optimized to WebP</div>
                </div>
                <input ref={imageRef} type="file" accept="image/*" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; setImageFile(f || null); setImageName(f?.name || ''); }} />
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
                  onChange={(e) => { const f = e.target.files?.[0]; setVideoFile(f || null); setVideoName(f?.name || ''); }} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: questions table */}
        <div className="cq-bottom">
          <div className="cq-section cq-section-row">
            <span>All Added Questions</span>
            {/* Per-round guidance: each round should hold a multiple of teamCount
                questions so every team gets an equal turn. Amber = off-target. */}
            {roundSummary.length > 0 && (
              <span className="cq-round-guide">
                {roundSummary.map((r) => (
                  <span key={r.short} className="cq-round-chip" style={{
                    color: r.ok ? '#9be39b' : '#FAB700',
                    borderColor: r.ok ? 'rgba(155,227,155,0.5)' : 'rgba(250,183,0,0.6)',
                  }}>
                    {r.short} {r.count}/{teamCount}
                  </span>
                ))}
              </span>
            )}
          </div>
          <div className="cq-table">
            <div className="cq-thead">
              <div className="cq-th cq-c-center">#</div>
              <div className="cq-th">QUESTION</div>
              <div className="cq-th cq-c-center">ROUND</div>
              <div className="cq-th cq-c-center">CORRECT OPTION</div>
              <div className="cq-th cq-c-center">POINTS</div>
              <div className="cq-th cq-c-center">ACTIONS</div>
            </div>
            <div className="cq-trows">
              {rows.map((q, i) => (
                <div className="cq-trow" key={q.id}>
                  <div className="cq-td cq-c-center">{start + i + 1}</div>
                  {/* Question cell — renders LaTeX if stored value looks like LaTeX */}
                  <div className="cq-td" title={q.question}>
                    <TableCell value={q.question} />
                  </div>
                  <div className="cq-td cq-c-center">{roundById(q.round ?? 5).short}</div>
                  {/* Correct option cell — also renders LaTeX */}
                  <div className="cq-td cq-c-center">
                    <TableCell value={q.options[q.correct]} />
                  </div>
                  <div className="cq-td cq-c-center cq-pts">
                    <span className="cq-pts-pos">+{q.correctPoints ?? correctPoints}</span>
                    <span className="cq-pts-neg">−{q.penaltyPoints ?? penaltyPoints}</span>
                  </div>
                  <div className="cq-c-actions">
                    <button className="vq-iconbtn edit" aria-label="Edit question" onClick={() => editQuestion(q)}>
                      <EditIcon />
                    </button>
                    <button className="vq-iconbtn del" aria-label="Delete question" onClick={() => deleteQuestion(q.id)}>
                      <TrashIcon />
                    </button>
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
          <button className="cq-btn back" onClick={() => { playSound('click'); onBack?.(); }}>‹ Back to Dashboard</button>
          <button className="cq-btn import" onClick={() => { playSound('click'); setShowImport(true); }}>⬆ Import JSON</button>
          <button className="cq-btn save" onClick={saveQuestion} disabled={saving}>
            {saving ? 'Saving…' : editingId != null ? 'Update Question' : 'Save Question'}
          </button>
          <button className="cq-btn clear" onClick={() => { playSound('click'); clearForm(); }}>Clear</button>
        </div>
      </div>
    </Stage>

    {showImport && (
      <ImportModal
        title="Import a quiz (JSON)"
        bulk={false}
        busy={importing}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    )}

    <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}