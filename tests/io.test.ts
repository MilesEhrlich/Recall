import { describe, expect, it } from 'vitest';
import { exportDeck, parseDeckFile } from '../src/io';
import type { Card, Deck } from '../src/model/types';

const deck: Deck = { id: 'd', name: 'Laplace', examDate: '2026-12-10' };
const cards: Card[] = [
  { id: 'a', deckId: 'd', front: '$x$', back: '$y$', stability: 2.5, lastReview: 123, createdAt: 1 },
];

describe('deck import/export', () => {
  it('round-trips', () => {
    const parsed = parseDeckFile(JSON.stringify(exportDeck(deck, cards)));
    expect(parsed.name).toBe('Laplace');
    expect(parsed.examDate).toBe('2026-12-10');
    expect(parsed.cards).toEqual([{ front: '$x$', back: '$y$', stability: 2.5, lastReview: 123 }]);
  });

  it('accepts a minimal hand-written file', () => {
    const parsed = parseDeckFile('{"name":"Mine","cards":[{"front":"a","back":"b"}]}');
    expect(parsed.cards[0]).toEqual({ front: 'a', back: 'b', stability: 1, lastReview: null });
    expect(parsed.examDate).toBeNull();
  });

  it('rejects bad input with a readable message', () => {
    expect(() => parseDeckFile('nope')).toThrow(/valid JSON/);
    expect(() => parseDeckFile('{"cards":[]}')).toThrow(/name/);
    expect(() => parseDeckFile('{"name":"x"}')).toThrow(/cards/);
    expect(() => parseDeckFile('{"name":"x","cards":[{"front":1}]}')).toThrow(/Card 1/);
  });
});
