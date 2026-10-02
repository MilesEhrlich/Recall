import { h } from './dom';
import { icon } from './icons';

/**
 * A modal bottom sheet (centered dialog on wide screens). Returns a close function.
 * `onClose` runs exactly once, however the sheet is dismissed (button, backdrop, Esc).
 */
export function openSheet(title: string, build: (close: () => void) => Node[], onClose?: () => void): () => void {
  const dlg = h('dialog', { class: 'sheet', 'aria-label': title });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (dlg.open) dlg.close();
    dlg.remove();
    onClose?.();
  };
  dlg.addEventListener('close', close); // Esc
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); }); // backdrop
  dlg.append(
    h('div', { class: 'sheet-inner' },
      h('div', { class: 'sheet-head' },
        h('h2', {}, title),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('x')),
      ),
      ...build(close),
    ),
  );
  document.body.append(dlg);
  dlg.showModal();
  return close;
}

export function confirmDialog(opts: { title: string; message: string; confirm: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let ok = false;
    openSheet(opts.title, (close) => [
      h('p', { class: 'text-2' }, opts.message),
      h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', {
          class: `btn ${opts.danger ? 'danger-solid' : 'primary'}`, type: 'button',
          onclick: () => { ok = true; close(); },
        }, opts.confirm),
      ),
    ], () => resolve(ok));
  });
}

export function promptDialog(opts: { title: string; label: string; placeholder?: string; confirm: string; initial?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    let value: string | null = null;
    const input = h('input', { value: opts.initial ?? '', placeholder: opts.placeholder ?? '', required: true, autocomplete: 'off' });
    openSheet(opts.title, (close) => [
      h('form', {
        class: 'stack',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const v = input.value.trim();
          if (!v) return;
          value = v;
          close();
        },
      },
        h('label', { class: 'field' }, h('span', {}, opts.label), input),
        h('div', { class: 'sheet-actions' },
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', { class: 'btn primary', type: 'submit' }, opts.confirm),
        ),
      ),
    ], () => resolve(value));
    setTimeout(() => input.focus(), 50);
  });
}
