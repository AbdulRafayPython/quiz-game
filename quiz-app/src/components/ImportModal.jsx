// ImportModal — paste-JSON dialog used to bulk-import quizzes. Shows a copyable
// sample format (hand it to ChatGPT), validates strictly, and lists any errors
// before handing the parsed quizzes to the parent. Rendered OUTSIDE <Stage> so
// its position:fixed overlay is relative to the viewport, not the scaled canvas.

import { useState } from 'react';
import { validateImport, SAMPLE_IMPORT_JSON, ROUND_NAME_LIST } from '../lib/quizImport';

export default function ImportModal({ title = 'Import quizzes (JSON)', bulk = false, busy = false, onClose, onImport }) {
  const [text, setText] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [errors, setErrors] = useState([]);
  const [copied, setCopied] = useState(false);

  const handleImport = () => {
    const res = validateImport(text);
    if (!res.ok) { setErrors(res.errors); return; }
    if (!bulk && res.quizzes.length > 1) {
      setErrors(['This imports one quiz. To create several at once, use “Import Quizzes” on the Dashboard.']);
      return;
    }
    setErrors([]);
    onImport(res.quizzes);
  };

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_IMPORT_JSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — the sample is still visible to copy by hand */ }
  };

  return (
    <div className="imp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <div className="imp-modal" role="dialog" aria-label={title}>
        <div className="imp-head">
          <span className="imp-title">{title}</span>
          <button className="imp-x" onClick={onClose} aria-label="Close" disabled={busy}>×</button>
        </div>

        <div className="imp-body">
          <div className="imp-row">
            <button type="button" className="imp-link" onClick={() => setShowSample((s) => !s)}>
              {showSample ? '▾ Hide sample format' : '▸ Show sample format'}
            </button>
            <span className="imp-hint">rounds: {ROUND_NAME_LIST} · formulas in $…$</span>
          </div>

          {showSample && (
            <div className="imp-sample">
              <div className="imp-sample-bar">
                <span className="imp-sample-cap">sample.json</span>
                <button type="button" className="imp-copy" onClick={copySample}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
              <pre>{SAMPLE_IMPORT_JSON}</pre>
            </div>
          )}

          <textarea
            className="imp-textarea"
            placeholder="Paste your quiz JSON here…"
            value={text}
            onChange={(e) => { setText(e.target.value); if (errors.length) setErrors([]); }}
            spellCheck={false}
            autoFocus
          />

          {errors.length > 0 && (
            <ul className="imp-errors">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>

        <div className="imp-foot">
          <button className="cq-btn back" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="cq-btn save" onClick={handleImport} disabled={busy || !text.trim()}>
            {busy ? 'Importing…' : bulk ? 'Import all' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
