// GameplayOptionDisplay.jsx
// Drop-in component for rendering a quiz option in gameplay screens.
// Automatically detects LaTeX vs plain text and renders accordingly.
//
// Usage:
//   import GameplayOptionDisplay from './GameplayOptionDisplay';
//   <GameplayOptionDisplay value={option} className="my-option-class" />
//
// The `value` is whatever is stored in the DB — either a plain string ("Mars")
// or a LaTeX string ("\\frac{1}{3}"). Detection is heuristic but covers all
// realistic quiz content.

import katex from 'katex';

// Heuristic: does this string contain LaTeX?
// Catches: \command, ^{}, _{}, \frac, \sqrt, etc.
function isLatex(text) {
  if (!text) return false;
  return /\\[a-zA-Z]/.test(text) || /[\^_]\{/.test(text);
}

// Safe KaTeX render — falls back to plain text on parse error.
function renderKatex(text, displayMode = false) {
  try {
    return katex.renderToString(text, {
      throwOnError: true,
      displayMode,
      strict: false,
    });
  } catch {
    return null; // caller will fall back to plain text
  }
}

export default function GameplayOptionDisplay({ value = '', className = '', displayMode = false, style }) {
  if (!value) return <span className={className} style={style} />;

  if (isLatex(value)) {
    const html = renderKatex(value, displayMode);
    if (html) {
      return (
        <span
          className={`formula-display${className ? ' ' + className : ''}`}
          style={style}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
  }

  // Plain text (or LaTeX parse failed — show raw string rather than nothing)
  return <span className={className} style={style}>{value}</span>;
}

// ─── Pure function version (for non-React contexts, e.g. canvas rendering) ──
// Returns { isLatex: bool, html: string|null, plain: string }
export function resolveDisplayValue(text) {
  if (!text) return { isLatex: false, html: null, plain: '' };
  if (isLatex(text)) {
    const html = renderKatex(text, false);
    if (html) return { isLatex: true, html, plain: text };
  }
  return { isLatex: false, html: null, plain: text };
}