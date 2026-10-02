export type Rating = 'got' | 'shaky' | 'missed';

export type CardKind = 'definition' | 'theorem' | 'remark' | 'method' | 'example';

export interface Deck {
  id: string;
  name: string;
  /** Exam date as a local calendar date, 'YYYY-MM-DD', or null. */
  examDate: string | null;
  description?: string;
  /** Set for decks that come from the built-in course content. */
  seedId?: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** Stability S in days. */
  stability: number;
  /** Timestamp (ms) of the last review, or null for a new card. */
  lastReview: number | null;
  createdAt: number;
  kind?: CardKind;
  /** Where the card comes from, e.g. "Lecture 3 · §1.4". */
  source?: string;
  /** Set for cards from the built-in course content. */
  seedId?: string;
  /** True once the user edits a built-in card, so content updates leave it alone. */
  userEdited?: boolean;
}

export interface Review {
  id: string;
  cardId: string;
  deckId: string;
  timestamp: number;
  rating: Rating;
  /** Days since the previous review of this card; null on a card's first review. */
  elapsedDays: number | null;
}
