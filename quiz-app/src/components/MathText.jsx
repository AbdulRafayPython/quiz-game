// MathText — React renderer for a string that mixes plain text and inline LaTeX.
// Plain parts render as text; $…$ / \(…\) / $$…$$ / \[…\] parts render with
// KaTeX. See src/lib/mathText.js for the shared parser.

import { parseSegments, katexHtml, unescapeText } from '../lib/mathText';

export default function MathText({ value = '', className = '', style }) {
  const segs = parseSegments(value);
  if (segs.length === 0) return <span className={className} style={style} />;
  return (
    <span className={className} style={style}>
      {segs.map((s, i) => {
        if (s.type === 'text') return <span key={i}>{unescapeText(s.value)}</span>;
        const html = katexHtml(s.value, s.display);
        if (html == null) {
          return <span key={i}>{s.display ? `$$${s.value}$$` : `$${s.value}$`}</span>;
        }
        return <span key={i} className="formula-display" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}
