// GameplayOptionDisplay.jsx
// Renders a quiz question/option that may mix plain text and inline LaTeX, e.g.
//   "What is  $a^2 + b^2$ ?"
// Plain parts render as text; $…$ / \(…\) / $$…$$ / \[…\] parts render with
// KaTeX (a whole-string raw-LaTeX value from older content still renders too).
// Thin wrapper over <MathText> so existing call sites keep working unchanged.

import MathText from './MathText';

export default function GameplayOptionDisplay({ value = '', className = '', style }) {
  if (!value) return <span className={className} style={style} />;
  return <MathText value={value} className={className} style={style} />;
}
