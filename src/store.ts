import { CONFIG } from './config';
import { COURSE } from './data/course';
import { syncCourse } from './data/sync';
import type { Card, Deck, Review } from './model/types';

const KEY = 'recall/v1';
/** Storage keys used under earlier names; read once so earlier progress carries over. */
const LEGACY_KEYS = ['recall-rate/v1', 'slopefield/v1'];

export interface PracticeAttempt {
  id: string;
  questionId: string;
  /** Course chapter id ('ch1'…) the question belongs to. */
  topic: string;
  correct: boolean;
  timestamp: number;
}

export interface AppState {
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
  practice: PracticeAttempt[];
  /** Built-in decks ("deck:<id>") and cards the user deleted. */
  removedSeeds: string[];
}

export function uid(): string {
  return crypto.randomUUID();
}

export function newCard(deckId: string, front: string, back: string, now = Date.now()): Card {
  return { id: uid(), deckId, front, back, stability: CONFIG.initialStability, lastReview: null, createdAt: now };
}

function load(): AppState {
  let s: AppState = { decks: [], cards: [], reviews: [], practice: [], removedSeeds: [] };
  try {
    const raw = [KEY, ...LEGACY_KEYS].map((k) => localStorage.getItem(k)).find((v) => v !== null);
    if (raw) s = { ...s, ...(JSON.parse(raw) as Partial<AppState>) };
  } catch (e) {
    console.error('Could not load saved data', e);
  }
  syncCourse(s, COURSE, Date.now(), uid);
  persist(s);
  return s;
}

function persist(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.error('Could not save', e);
  }
}

/** The single in-memory app state. Mutate it, then call save(). */
export const state: AppState = load();

export function save(): void {
  persist(state);
}

export function deckById(id: string): Deck | undefined {
  return state.decks.find((d) => d.id === id);
}

export function cardsInDeck(deckId: string): Card[] {
  return state.cards.filter((c) => c.deckId === deckId);
}

/** Remove a card (and its reviews); built-in cards are remembered so they aren't re-added. */
export function removeCard(card: Card): void {
  state.cards = state.cards.filter((c) => c.id !== card.id);
  state.reviews = state.reviews.filter((r) => r.cardId !== card.id);
  if (card.seedId && !state.removedSeeds.includes(card.seedId)) state.removedSeeds.push(card.seedId);
}

export function restoreCard(card: Card, reviews: Review[], index: number): void {
  state.cards.splice(Math.min(index, state.cards.length), 0, card);
  state.reviews.push(...reviews);
  if (card.seedId) state.removedSeeds = state.removedSeeds.filter((s) => s !== card.seedId);
}

export function removeDeck(deck: Deck): void {
  state.decks = state.decks.filter((d) => d.id !== deck.id);
  state.cards = state.cards.filter((c) => c.deckId !== deck.id);
  state.reviews = state.reviews.filter((r) => r.deckId !== deck.id);
  if (deck.seedId) state.removedSeeds.push(`deck:${deck.seedId}`);
}

/** Bring back any built-in decks/cards that were deleted. */
export function restoreCourse(): void {
  state.removedSeeds = [];
  syncCourse(state, COURSE, Date.now(), uid);
}
