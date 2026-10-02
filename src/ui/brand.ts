import { h } from './dom';
import { brandMark } from './icons';

export function brand(): HTMLElement {
  return h('a', { class: 'brand', href: '#/today', 'aria-label': 'Slopefield home' },
    brandMark(),
    h('div', {}, h('div', { class: 'brand-name' }, 'Slopefield'), h('div', { class: 'brand-sub' }, 'Differential Equations')),
  );
}
