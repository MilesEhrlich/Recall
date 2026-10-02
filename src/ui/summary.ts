import { CONFIG } from '../config';
import { isDue, todayQueue } from '../model/scheduler';
import { state } from '../store';
import { startOfDay } from './format';
import type { Deck } from '../model/types';
import { cardsInDeck } from '../store';
import { h } from './dom';
import { pct } from './format';

/**
 * Card counts for a deck. "due" is what today's session would show for this deck
 * (due reviews plus new cards within the daily limit). "Mastered" = S ≥ CONFIG.masteredStability.
 */
export function deckSummary(deck: Deck, now: number) {
  const cards = cardsInDeck(deck.id);
  let mastered = 0, fresh = 0, reviewsDue = 0;
  for (const c of cards) {
    if (c.lastReview === null) fresh++;
    else if (isDue(c, deck, now)) reviewsDue++;
    if (c.lastReview !== null && c.stability >= CONFIG.masteredStability) mastered++;
  }
  const due = todayQueue(state.cards, state.decks, state.reviews, now, startOfDay(now)).filter((c) => c.deckId === deck.id).length;
  return { total: cards.length, due, reviewsDue, mastered, fresh };
}

/** A small horizontal recall meter with its percentage. */
export function recallMeter(r: number): HTMLElement {
  return h('div', { class: 'meter-wrap', title: `Predicted recall ${pct(r)}` },
    h('div', { class: 'meter' }, h('i', { style: `width:${Math.max(2, r * 100)}%` })),
    h('span', { class: 'meter-val' }, pct(r)),
  );
}

export function tile(label: string, value: string | number, sub?: string): HTMLElement {
  return h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, label),
    h('div', { class: 'tile-value' }, String(value)),
    sub && h('div', { class: 'tile-sub' }, sub),
  );
}
