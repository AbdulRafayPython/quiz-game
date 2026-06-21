// FormulaInput.jsx
// Drop-in enriched input that supports plain text OR LaTeX formula mode.
// In formula mode: the raw LaTeX string is stored/passed through value/onChange,
// and a live rendered preview appears below the field.
//
// IMPORTANT: requires KaTeX CSS to be imported once in your app root:
//   import 'katex/dist/katex.min.css';
// or load via CDN in index.html:
//   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
//
// Props:
//   value        string   controlled value (raw text or LaTeX)
//   onChange     fn(val)  called with new string
//   onFocus      fn(e)    forwarded to the inner <input> — used by parent for
//                         sub/superscript toolbar tracking (activeFieldRef / activeSetRef)
//   placeholder  string
//   className    string   extra classes applied to inner <input>/<textarea>
//   multiline    bool     render a <textarea> instead of <input> (for question field)
//   latexMode    bool     controlled from outside (parent manages per-field state)
//   onLatexToggle fn(bool) called when the user toggles formula mode

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

// Quick-insert palette: label → LaTeX snippet
const SNIPPETS = [
  { label: '\\frac', latex: '\\frac{a}{b}', hint: 'Fraction' },
  { label: '\\sqrt', latex: '\\sqrt{x}', hint: 'Square root' },
  { label: 'xⁿ', latex: 'x^{n}', hint: 'Power' },
  { label: 'log', latex: '\\log_{2} n', hint: 'Logarithm' },
  { label: '\\pi', latex: '\\pi', hint: 'Pi' },
  { label: '\\infty', latex: '\\infty', hint: 'Infinity' },
  { label: '\\sum', latex: '\\sum_{i=0}^{n}', hint: 'Summation' },
  { label: '\\int', latex: '\\int_{a}^{b}', hint: 'Integral' },
  { label: '\\leq', latex: '\\leq', hint: 'Less than or equal' },
  { label: '\\geq', latex: '\\geq', hint: 'Greater than or equal' },
  { label: '\\neq', latex: '\\neq', hint: 'Not equal' },
  { label: 'α β γ', latex: '\\alpha \\beta \\gamma', hint: 'Greek letters' },
];

// Renders a LaTeX string using KaTeX, returns { html, error }.
function renderLatex(raw) {
  if (!raw || !raw.trim()) return { html: '', error: null };
  try {
    const html = katex.renderToString(raw, {
      throwOnError: true,
      displayMode: false,
      strict: false,
    });
    return { html, error: null };
  } catch (e) {
    return { html: '', error: e.message.replace(/KaTeX.*?:/, '').trim() };
  }
}

export default function FormulaInput({
  value = '',
  onChange,
  onFocus,
  placeholder = '',
  className = '',
  multiline = false,
  latexMode = false,
  onLatexToggle,
}) {
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const inputRef = useRef(null);
  const cheatRef = useRef(null);

  // Close cheat sheet on outside click or Escape
  useEffect(() => {
    if (!showCheatSheet) return;
    const onDown = (e) => {
      if (cheatRef.current && !cheatRef.current.contains(e.target)) setShowCheatSheet(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowCheatSheet(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showCheatSheet]);

  const { html: previewHtml, error: previewError } = latexMode ? renderLatex(value) : { html: '', error: null };

  // Insert a snippet at caret position
  const insertSnippet = (latex) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + latex + value.slice(end);
    onChange(next);
    const cursor = start + latex.length;
    requestAnimationFrame(() => {
      try { el.focus(); el.setSelectionRange(cursor, cursor); } catch { /* ignore */ }
    });
    setShowCheatSheet(false);
  };

  const toggleLatex = () => {
    onLatexToggle?.(!latexMode);
    setShowCheatSheet(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const sharedProps = {
    ref: inputRef,
    className: `cq-input${className ? ' ' + className : ''}${latexMode ? ' cq-input--latex' : ''}`,
    value,
    placeholder: latexMode ? 'Enter LaTeX — e.g. \\frac{1}{3} or \\sqrt{x+1}' : placeholder,
    onFocus,
    onChange: (e) => onChange(e.target.value),
    spellCheck: !latexMode,
    autoComplete: 'off',
  };

  return (
    <div className="fi-wrap">
      {/* Toolbar row */}
      <div className="fi-toolbar">
        <button
          type="button"
          className={`fi-toggle${latexMode ? ' fi-toggle--active' : ''}`}
          aria-pressed={latexMode}
          title={latexMode ? 'Switch back to plain text' : 'Switch to formula (LaTeX) mode'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleLatex}
        >
          <span className="fi-toggle-icon">∑</span>
          {latexMode ? 'Plain text' : 'Formula'}
        </button>

        {latexMode && (
          <div className="fi-snip-row" ref={cheatRef}>
            <button
              type="button"
              className="fi-snip-open"
              aria-expanded={showCheatSheet}
              title="Insert a formula snippet"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowCheatSheet((v) => !v)}
            >
              Insert ▾
            </button>
            {showCheatSheet && (
              <div className="fi-snip-panel" role="listbox" aria-label="Formula snippets">
                {SNIPPETS.map((s) => (
                  <button
                    key={s.latex}
                    type="button"
                    className="fi-snip-item"
                    title={s.hint}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSnippet(s.latex)}
                  >
                    <span className="fi-snip-label">{s.label}</span>
                    <span className="fi-snip-hint">{s.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {latexMode && (
          <a
            className="fi-ref-link"
            href="https://katex.org/docs/support_table"
            target="_blank"
            rel="noopener noreferrer"
            title="Full KaTeX symbol reference"
          >
            KaTeX ref ↗
          </a>
        )}
      </div>

      {/* The actual input */}
      {multiline
        ? <textarea {...sharedProps} style={{ resize: 'vertical', minHeight: 72 }} />
        : <input {...sharedProps} />
      }

      {/* Live preview */}
      {latexMode && value.trim() && (
        <div className={`fi-preview${previewError ? ' fi-preview--error' : ''}`}>
          {previewError
            ? <span className="fi-preview-err">⚠ {previewError}</span>
            : <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
          }
        </div>
      )}
    </div>
  );
}

// Utility: does a stored value look like LaTeX?
// Call this in the gameplay renderer to decide whether to use KaTeX.
export function looksLikeLatex(text) {
  if (!text) return false;
  return /[\\^_{}]/.test(text) || /\\[a-zA-Z]/.test(text);
}

// Utility: render a value for display (gameplay, table preview, etc.)
// Returns { isLatex, html, plain }
export function renderForDisplay(text) {
  if (!looksLikeLatex(text)) return { isLatex: false, html: '', plain: text };
  const { html, error } = renderLatex(text);
  if (error) return { isLatex: false, html: '', plain: text }; // fallback to plain
  return { isLatex: true, html, plain: text };
}