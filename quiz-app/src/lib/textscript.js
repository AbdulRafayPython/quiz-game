// Sub/superscript helper for the question editor.
//
// We insert REAL Unicode sub/superscript characters into the plain text, so the
// stored question needs no special markup and renders as-is everywhere (gameplay,
// tables, etc.) — "H₂O" is just three characters. Unicode only provides these for
// digits, a few signs, and a handful of letters, which covers essentially all
// chemistry formulae (H₂O, CO₂, SO₄²⁻, Na⁺) and math exponents (x², 10⁻³). Any
// character without a mapping is left unchanged.

// normal char -> superscript
const SUPER = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ',
};
// normal char -> subscript
const SUB = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
  n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ',
};

// any scripted char -> its normal form (so we can toggle off / switch script)
const TO_NORMAL = {};
for (const [base, ch] of Object.entries(SUPER)) TO_NORMAL[ch] = base;
for (const [base, ch] of Object.entries(SUB)) TO_NORMAL[ch] = base;

/**
 * Convert `text` to super- or sub-script, per character:
 *   • a char already in the target script toggles back to normal,
 *   • a char in the other script switches across,
 *   • a normal char is mapped if possible, else left as-is.
 * @param {string} text  the selected text
 * @param {'super'|'sub'} kind
 */
export function toScript(text, kind) {
  const map = kind === 'super' ? SUPER : SUB;
  let out = '';
  for (const ch of text) {
    if (TO_NORMAL[ch] && map[TO_NORMAL[ch]] === ch) {
      out += TO_NORMAL[ch];        // already this script → toggle off
    } else {
      const base = TO_NORMAL[ch] || ch; // normalise (handles the other script)
      out += map[base] || base;    // apply target, or keep if unmappable
    }
  }
  return out;
}
