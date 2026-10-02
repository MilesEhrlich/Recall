import { DAY_MS, updateStability } from './forgetting';
import type { Card, Rating, Review } from './types';
import { CONFIG, type Config } from '../config';

/** Apply a rating to a card. Returns the updated card and the review record to store. */
export function applyReview(
  card: Card,
  rating: Rating,
  now: number,
  id: string,
  cfg: Config = CONFIG,
): { card: Card; review: Review } {
  const elapsedDays = card.lastReview === null ? null : (now - card.lastReview) / DAY_MS;
  return {
    card: { ...card, stability: updateStability(card.stability, rating, cfg), lastReview: now },
    review: { id, cardId: card.id, deckId: card.deckId, timestamp: now, rating, elapsedDays },
  };
}
