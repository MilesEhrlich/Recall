import { CONFIG } from '../config';
import type { Card, Deck } from '../model/types';
import type { CourseDeck } from './course';

export interface SeedState {
  decks: Deck[];
  cards: Card[];
  /** Built-in decks/cards the user deleted; never re-added. */
  removedSeeds: string[];
}

/**
 * Merge the built-in course into saved state without touching progress:
 * adds missing decks/cards, and refreshes the text of built-in cards the user hasn't edited.
 * New cards get increasing createdAt values (slightly in the past, so they're due now) to keep lecture order.
 */
export function syncCourse(s: SeedState, course: CourseDeck[], now: number, newId: () => string): void {
  const removed = new Set(s.removedSeeds);
  let order = 0;
  for (const cd of course) {
    if (removed.has(`deck:${cd.id}`)) continue;
    let deck = s.decks.find((d) => d.seedId === cd.id);
    if (!deck) {
      deck = { id: newId(), name: cd.name, examDate: null, description: cd.description, seedId: cd.id };
      s.decks.push(deck);
    } else {
      deck.description = cd.description;
    }
    for (const cc of cd.cards) {
      order++;
      if (removed.has(cc.id)) continue;
      const existing = s.cards.find((c) => c.seedId === cc.id);
      if (existing) {
        existing.kind = cc.kind;
        existing.source = cc.source;
        if (!existing.userEdited) {
          existing.front = cc.front;
          existing.back = cc.back;
        }
        continue;
      }
      s.cards.push({
        id: newId(), deckId: deck.id, front: cc.front, back: cc.back,
        stability: CONFIG.initialStability, lastReview: null, createdAt: now - 100_000 + order,
        kind: cc.kind, source: cc.source, seedId: cc.id,
      });
    }
  }
}
