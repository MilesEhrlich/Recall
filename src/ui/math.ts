import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { h } from './dom';

/** A block of card text with $...$ / $$...$$ rendered by KaTeX. Text is inserted as text, never HTML. */
export function mathBlock(text: string, cls = 'math'): HTMLDivElement {
  const el = h('div', { class: cls }, text);
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ],
    throwOnError: false,
  });
  return el;
}
