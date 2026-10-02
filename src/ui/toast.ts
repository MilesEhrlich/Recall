import { h } from './dom';

let host: HTMLElement | null = null;
let timer: number | undefined;

/** Brief message above the tab bar, with an optional action such as Undo. */
export function toast(message: string, action?: { label: string; run: () => void }): void {
  host ??= document.body.appendChild(h('div', { class: 'toast-host', 'aria-live': 'polite' }));
  const el = h('div', { class: 'toast' },
    h('span', {}, message),
    action && h('button', { class: 'toast-action', onclick: () => { el.remove(); action.run(); } }, action.label),
  );
  host.replaceChildren(el);
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, action ? 5000 : 2500);
}
