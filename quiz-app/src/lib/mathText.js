// mathText — parse/render a string that mixes plain text and LaTeX formulas.
//
// A teacher can write things like:
//   "What is the name of the formula  $a^2 + b^2$  ?"
// and the part inside the math delimiters renders with KaTeX while the rest
// stays plain text. Supported delimiters (also what ChatGPT emits when you ask
// for LaTeX, so a pasted answer just works):
//   $ ... $      inline math
//   \( ... \)    inline math
//   $$ ... $$    display math
//   \[ ... \]    display math
// For backward-compatibility, a delimiter-free string that still looks like raw
// LaTeX (e.g. an older question stored as "\frac{1}{2}") is rendered whole.
//
// Pure helpers only (no JSX) — the React renderer lives in components/MathText.jsx.

import katex from 'katex';

// $$...$$ and \[...\] are display; $...$ and \(...\) are inline. Inline $...$ is
// kept to a single line so a stray "$" in prose is less likely to swallow text.
const DELIM_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

// Heuristic: a delimiter-free string that is itself raw LaTeX.
function bareLatex(text) {
  return /\\[a-zA-Z]/.test(text) || /[\^_]\{/.test(text);
}

// Break a string into { type:'text', value } and { type:'latex', value, display }
// segments, in order.
export function parseSegments(text) {
  if (!text) return [];
  const segs = [];
  let last = 0;
  for (const m of text.matchAll(DELIM_RE)) {
    if (m.index > last) segs.push({ type: 'text', value: text.slice(last, m.index) });
    const display = m[1] !== undefined || m[4] !== undefined;
    segs.push({ type: 'latex', value: m[1] ?? m[2] ?? m[3] ?? m[4], display });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', value: text.slice(last) });
  // No delimiters but the whole thing is raw LaTeX → treat as one formula.
  if (!segs.some((s) => s.type === 'latex') && bareLatex(text)) {
    return [{ type: 'latex', value: text, display: false }];
  }
  return segs;
}

/** True if the string contains any renderable LaTeX (delimited or whole-raw). */
export function hasMath(text) {
  return parseSegments(text).some((s) => s.type === 'latex');
}

/** Render a single LaTeX fragment to an HTML string (null on parse error). */
export function katexHtml(latex, display = false) {
  try {
    return katex.renderToString(latex, { throwOnError: true, displayMode: display, strict: false });
  } catch {
    return null;
  }
}

// Un-escape a literal "\$" the teacher typed so it shows as "$" (not a delimiter).
export const unescapeText = (t) => t.replace(/\\\$/g, '$');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * HTML-string renderer for dangerouslySetInnerHTML contexts (table cells, etc.).
 * Returns { isLatex, html, plain }. `isLatex` is true when any segment rendered
 * as math; `html` is the full mixed markup.
 */
export function renderMixedHtml(text) {
  if (!text) return { isLatex: false, html: '', plain: '' };
  const segs = parseSegments(text);
  if (!segs.some((s) => s.type === 'latex')) return { isLatex: false, html: '', plain: text };
  let html = '';
  for (const s of segs) {
    if (s.type === 'text') { html += esc(unescapeText(s.value)); continue; }
    const k = katexHtml(s.value, s.display);
    html += k != null ? k : esc(s.display ? `$$${s.value}$$` : `$${s.value}$`);
  }
  return { isLatex: true, html, plain: text };
}
