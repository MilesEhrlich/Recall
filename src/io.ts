import { CONFIG } from './config';
import type { Card, CardKind, Deck } from './model/types';

export const EXPORT_FORMAT = 'study-helper-deck';
const KINDS: CardKind[] = ['definition', 'theorem', 'remark', 'method', 'example'];

export interface DeckFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  name: string;
  examDate: string | null;
  cards: { front: string; back: string; stability?: number; lastReview?: number | null; kind?: CardKind; source?: string }[];
}

export function exportDeck(deck: Deck, cards: Card[]): DeckFile {
  return {
    format: EXPORT_FORMAT,
    version: 1,
    name: deck.name,
    examDate: deck.examDate,
    cards: cards.map((c) => ({ front: c.front, back: c.back, stability: c.stability, lastReview: c.lastReview, kind: c.kind, source: c.source })),
  };
}

/** Parse and validate an imported deck file. Throws an Error with a readable message on bad input. */
export function parseDeckFile(text: string): DeckFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null) throw new Error('Expected a JSON object.');
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string' || !d.name.trim()) throw new Error('Deck is missing a "name".');
  if (!Array.isArray(d.cards)) throw new Error('Deck is missing a "cards" array.');
  const examDate =
    typeof d.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.examDate) ? d.examDate : null;

  const cards = d.cards.map((raw, i) => {
    const c = raw as Record<string, unknown>;
    if (typeof c?.front !== 'string' || typeof c?.back !== 'string') {
      throw new Error(`Card ${i + 1} needs string "front" and "back".`);
    }
    const stability =
      typeof c.stability === 'number' && c.stability > 0 ? c.stability : CONFIG.initialStability;
    const lastReview = typeof c.lastReview === 'number' ? c.lastReview : null;
    const kind = KINDS.includes(c.kind as CardKind) ? (c.kind as CardKind) : undefined;
    const source = typeof c.source === 'string' ? c.source : undefined;
    return { front: c.front, back: c.back, stability, lastReview, ...(kind && { kind }), ...(source && { source }) };
  });

  return { format: EXPORT_FORMAT, version: 1, name: d.name.trim(), examDate, cards };
}
