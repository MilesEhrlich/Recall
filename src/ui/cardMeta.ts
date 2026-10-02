import type { CardKind } from '../model/types';
import { h } from './dom';

export const KIND_LABEL: Record<CardKind, string> = {
  definition: 'Definition',
  theorem: 'Theorem',
  remark: 'Remark',
  method: 'Method',
  example: 'Example',
};

export function kindChip(kind?: CardKind): HTMLElement | '' {
  return kind ? h('span', { class: `chip kind ${kind}` }, KIND_LABEL[kind]) : '';
}

/** Short source label, e.g. "Lecture 3 · §1.4" → "L3 · §1.4". */
export function sourceLabel(source?: string): HTMLElement | '' {
  return source ? h('span', { class: 'source' }, source.replace(/^Lecture (\d+)/, 'L$1')) : '';
}
