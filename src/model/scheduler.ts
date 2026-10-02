import { CONFIG, type Config } from '../config';
import { DAY_MS, dueInterval, recall } from './forgetting';
import type { Card, Deck, Review } from './types';

// ---------- Study days ----------

/** Start (ms) of the study day containing `now`. Days roll over at cfg.studyDayStartHour local time. */
export function studyDayStart(now: number, cfg: Config = CONFIG): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), cfg.studyDayStartHour);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}

/** End (ms, exclusive) of the study day containing `now`. */
export function studyDayEnd(now: number, cfg: Config = CONFIG): number {
  const start = new Date(studyDayStart(now, cfg));
  start.setDate(start.getDate() + 1);
  return start.getTime();
}

/** Whole study days from the day containing `from` to the day containing `to` (0 = same day). */
export function studyDaysBetween(from: number, to: number, cfg: Config = CONFIG): number {
  return Math.round((studyDayStart(to, cfg) - studyDayStart(from, cfg)) / DAY_MS);
}

// ---------- Exams ----------

/** Exam time in ms: local midnight at the start of the exam day. */
export function examTime(deck: Deck): number | null {
  if (!deck.examDate) return null;
  const [y, m, d] = deck.examDate.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Days until the exam (fractional), or null if no exam is set. */
export function daysUntilExam(deck: Deck, now: number): number | null {
  const exam = examTime(deck);
  return exam === null ? null : (exam - now) / DAY_MS;
}

/** Start of the final review window (ms), or null if no exam is set. */
export function finalWindowStart(deck: Deck, cfg: Config = CONFIG): number | null {
  const exam = examTime(deck);
  return exam === null ? null : exam - cfg.exam.finalWindowDays * DAY_MS;
}

/** True if `now` is inside the final review window before the deck's exam. */
export function inFinalWindow(deck: Deck, now: number, cfg: Config = CONFIG): boolean {
  const exam = examTime(deck);
  const start = finalWindowStart(deck, cfg);
  return exam !== null && start !== null && now >= start && now < exam;
}

// ---------- Scheduling ----------

/**
 * Gap in days between the last review and the next one:
 *   S·ln(1/target), capped at capFraction of the days left before an upcoming exam,
 *   and never less than minIntervalDays (one session per day).
 */
export function reviewGapDays(card: Card, deck: Deck, cfg: Config = CONFIG): number {
  let gap = dueInterval(card.stability, cfg.targetRetention);
  const exam = examTime(deck);
  if (exam !== null && card.lastReview !== null && exam > card.lastReview) {
    gap = Math.min(gap, cfg.exam.capFraction * ((exam - card.lastReview) / DAY_MS));
  }
  return Math.max(cfg.minIntervalDays, gap);
}

/**
 * When the card is next due (ms). New cards are due immediately.
 * While an exam is upcoming, the gap is capped (see reviewGapDays) and any card not
 * reviewed since the final window opened is due by the start of that window.
 * Once the exam has passed, the exam cap no longer applies.
 */
export function nextDue(card: Card, deck: Deck, now: number, cfg: Config = CONFIG): number {
  if (card.lastReview === null) return card.createdAt;
  const exam = examTime(deck);
  const examUpcoming = exam !== null && now < exam;
  const gap = examUpcoming
    ? reviewGapDays(card, deck, cfg)
    : Math.max(cfg.minIntervalDays, dueInterval(card.stability, cfg.targetRetention));
  let due = card.lastReview + gap * DAY_MS;
  const windowStart = finalWindowStart(deck, cfg);
  if (examUpcoming && windowStart !== null && card.lastReview < windowStart) {
    due = Math.min(due, windowStart);
  }
  return due;
}

/** Predicted recall right now. New cards have never been learned, so R = 0. */
export function predictedRecall(card: Card, now: number): number {
  if (card.lastReview === null) return 0;
  return recall(Math.max(0, now - card.lastReview) / DAY_MS, card.stability);
}

/** A card is due if it comes due at any point in the current study day. */
export function isDue(card: Card, deck: Deck, now: number, cfg: Config = CONFIG): boolean {
  return nextDue(card, deck, now, cfg) < studyDayEnd(now, cfg);
}

/** All due cards, lowest predicted recall first. */
export function dueCards(cards: Card[], decks: Deck[], now: number, cfg: Config = CONFIG): Card[] {
  const byId = new Map(decks.map((d) => [d.id, d]));
  return cards
    .filter((c) => {
      const deck = byId.get(c.deckId);
      return deck !== undefined && isDue(c, deck, now, cfg);
    })
    .map((c) => ({ c, r: predictedRecall(c, now) }))
    .sort((a, b) => a.r - b.r)
    .map(({ c }) => c);
}

/**
 * New cards a deck must introduce today so every card is seen before the exam's
 * final window: ceil(remaining / study days left), minus those already started today.
 * 0 when there's no upcoming exam (the normal daily limit applies).
 */
export function pacedNewCards(deck: Deck, cards: Card[], startedToday: number, now: number, cfg: Config = CONFIG): number {
  const windowStart = finalWindowStart(deck, cfg);
  if (windowStart === null || now >= windowStart) return 0;
  const unseen = cards.filter((c) => c.deckId === deck.id && c.lastReview === null).length;
  const daysLeft = Math.max(1, studyDaysBetween(now, windowStart, cfg));
  return Math.max(0, Math.ceil((unseen + startedToday) / daysLeft) - startedToday);
}

/**
 * Today's study queue: every due card that has been seen before, plus new cards
 * up to the daily limit (counting new cards already started today). Decks with an
 * upcoming exam get a higher allowance if needed to introduce every card in time,
 * and new cards in an exam's final window are never held back. Sorted like dueCards.
 */
export function todayQueue(
  cards: Card[], decks: Deck[], reviews: Review[], now: number, dayStart: number, cfg: Config = CONFIG,
): Card[] {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const due = dueCards(cards, decks, now, cfg);
  const deckOf = new Map(cards.map((c) => [c.id, c.deckId]));
  const startedIds = new Set(reviews.filter((r) => r.elapsedDays === null && r.timestamp >= dayStart).map((r) => r.cardId));
  const startedByDeck = new Map<string, number>();
  for (const id of startedIds) {
    const d = deckOf.get(id);
    if (d) startedByDeck.set(d, (startedByDeck.get(d) ?? 0) + 1);
  }
  let budget = Math.max(0, cfg.newCardsPerDay - startedIds.size);
  const paced = new Map(decks.map((d) => [d.id, pacedNewCards(d, cards, startedByDeck.get(d.id) ?? 0, now, cfg)]));

  const fresh = due.filter((c) => c.lastReview === null).sort((a, b) => a.createdAt - b.createdAt);
  const allowed = new Set<string>();
  for (const c of fresh) {
    const deck = byId.get(c.deckId);
    if (!deck) continue;
    const p = paced.get(deck.id) ?? 0;
    if (inFinalWindow(deck, now, cfg)) allowed.add(c.id);
    else if (p > 0) { allowed.add(c.id); paced.set(deck.id, p - 1); budget = Math.max(0, budget - 1); }
    else if (budget > 0) { allowed.add(c.id); budget--; }
  }
  return due.filter((c) => c.lastReview !== null || allowed.has(c.id));
}

/**
 * Exam readiness for a deck: average predicted recall on exam day if you stopped
 * reviewing now (new cards count as 0), and how many cards are still new.
 */
export function examReadiness(deck: Deck, cards: Card[], now: number): { recall: number; fresh: number; total: number } | null {
  const exam = examTime(deck);
  if (exam === null || exam <= now) return null;
  const mine = cards.filter((c) => c.deckId === deck.id);
  if (!mine.length) return null;
  let sum = 0, fresh = 0;
  for (const c of mine) {
    if (c.lastReview === null) fresh++;
    else sum += recall(Math.max(0, exam - c.lastReview) / DAY_MS, c.stability);
  }
  return { recall: sum / mine.length, fresh, total: mine.length };
}
