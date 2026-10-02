import { describe, expect, it } from 'vitest';
import { DAY_MS, dueInterval } from '../src/model/forgetting';
import { dueCards, inFinalWindow, isDue, nextDue, predictedRecall, reviewGapDays } from '../src/model/scheduler';
import { CONFIG } from '../src/config';
import { applyReview } from '../src/model/review';
import type { Card, Deck } from '../src/model/types';

const T0 = new Date(2026, 9, 2).getTime(); // local midnight, Oct 2 2026

function card(over: Partial<Card> = {}): Card {
  return { id: 'c', deckId: 'd', front: '', back: '', stability: 1, lastReview: T0, createdAt: T0, ...over };
}
const deck: Deck = { id: 'd', name: 'D', examDate: null };
const examDeck = (date: string): Deck => ({ ...deck, examDate: date });

describe('nextDue without exam', () => {
  it('new cards are due immediately', () => {
    const c = card({ lastReview: null });
    expect(nextDue(c, deck, T0)).toBe(T0);
    expect(isDue(c, deck, T0)).toBe(true);
  });

  it('is lastReview + S ln(1/0.9) days', () => {
    const c = card({ stability: 10 });
    expect(nextDue(c, deck, T0)).toBeCloseTo(T0 + dueInterval(10) * DAY_MS, 0);
  });

  it('never schedules sooner than one day', () => {
    expect(reviewGapDays(card({ stability: 1 }), deck)).toBe(1); // S ln(1/0.9) = 2.5 h → 1 day
    expect(reviewGapDays(card({ stability: 0.5 }), deck)).toBe(1);
    expect(reviewGapDays(card({ stability: 20 }), deck)).toBeCloseTo(dueInterval(20), 10);
  });

  it('counts a card as due for the whole study day its due time falls in (4 am rollover)', () => {
    const noon = new Date(2026, 9, 2, 12).getTime();
    const c = card({ stability: 20, lastReview: noon }); // due ≈ Oct 4, 14:35
    expect(isDue(c, deck, new Date(2026, 9, 4, 3, 59).getTime())).toBe(false); // still Oct 3's study day
    expect(isDue(c, deck, new Date(2026, 9, 4, 4, 0).getTime())).toBe(true);
    expect(isDue(c, deck, new Date(2026, 9, 4, 8).getTime())).toBe(true); // hours before 14:35
  });
});

describe('exam cap', () => {
  // Exam 10 days after the last review => cap = 0.2 * 10 = 2 days.
  const exam = examDeck('2026-10-12');

  it('caps a long interval at 20% of days remaining', () => {
    const c = card({ stability: 50 }); // normal gap ~5.27 days
    expect(reviewGapDays(c, exam)).toBeCloseTo(2, 10);
  });

  it('leaves a shorter interval alone', () => {
    const c = card({ stability: 10 }); // normal gap ~1.05 days
    expect(reviewGapDays(c, exam)).toBeCloseTo(dueInterval(10), 10);
  });

  it('floors the capped gap at one day near the exam (no Zeno pile-up)', () => {
    const c = card({ stability: 50, lastReview: new Date(2026, 9, 11).getTime() }); // 1 day out => cap 0.2
    expect(reviewGapDays(c, exam)).toBe(1);
  });

  it('is ignored once the exam has passed', () => {
    const c = card({ stability: 50 });
    expect(reviewGapDays(c, examDeck('2026-09-01'))).toBeCloseTo(dueInterval(50), 10);
  });

  it('a well-known card gets several reviews before the exam', () => {
    const examMs = new Date(2026, 9, 12).getTime();
    let c = card({ stability: 100 });
    let reviews = 0;
    while (true) {
      const due = nextDue(c, exam, c.lastReview!);
      if (due >= examMs) break;
      c = applyReview(c, 'got', due, 'r').card;
      reviews++;
    }
    expect(reviews).toBeGreaterThanOrEqual(3);
  });
});

describe('dueCards ordering', () => {
  it('sorts by lowest predicted recall, new cards first', () => {
    const now = T0 + 5 * DAY_MS;
    const a = card({ id: 'a', stability: 1 }); // R = e^-5
    const b = card({ id: 'b', stability: 2 }); // R = e^-2.5
    const n = card({ id: 'n', lastReview: null }); // R = 0
    const notDue = card({ id: 'x', stability: 1000 });
    const ids = dueCards([b, notDue, a, n], [deck], now).map((c) => c.id);
    expect(ids).toEqual(['n', 'a', 'b']);
    expect(predictedRecall(a, now)).toBeCloseTo(Math.exp(-5));
  });
});

describe('applyReview', () => {
  it('records elapsed days and updates the card', () => {
    const c = card({ stability: 4 });
    const { card: next, review } = applyReview(c, 'got', T0 + 3 * DAY_MS, 'r1');
    expect(review.elapsedDays).toBeCloseTo(3);
    expect(review.rating).toBe('got');
    expect(next.stability).toBeCloseTo(10);
    expect(next.lastReview).toBe(T0 + 3 * DAY_MS);
  });

  it('first review has null elapsedDays', () => {
    const { review } = applyReview(card({ lastReview: null }), 'shaky', T0, 'r');
    expect(review.elapsedDays).toBeNull();
  });
});

describe('final review window', () => {
  const exam = examDeck('2026-10-12');
  const examMs = new Date(2026, 9, 12).getTime();
  const windowStart = examMs - 2 * DAY_MS;
  // Disable the 20% cap so the window rule is tested on its own.
  const noCap = { ...CONFIG, exam: { ...CONFIG.exam, capFraction: 1 } };

  it('pulls an unseen card forward to the start of the window', () => {
    const c = card({ stability: 1000, lastReview: new Date(2026, 9, 5).getTime() });
    // With a 100% cap the gap is 7 days -> exam day; the window rule makes it due 2 days earlier.
    expect(nextDue(c, exam, T0, noCap)).toBe(windowStart);
    expect(isDue(c, exam, windowStart - DAY_MS, noCap)).toBe(false);
    expect(isDue(c, exam, windowStart - 4 * 3600_000, noCap)).toBe(true); // the evening before counts
    expect(isDue(c, exam, windowStart + 1, noCap)).toBe(true);
  });

  it('every card not seen since the window opened is due inside the window (default config)', () => {
    const insideWindow = [windowStart, windowStart + 0.5 * DAY_MS, examMs - 1];
    for (const S of [0.5, 3, 40, 5000]) {
      for (const daysBefore of [2.01, 2.5, 4, 30]) {
        const c = card({ stability: S, lastReview: examMs - daysBefore * DAY_MS });
        for (const now of insideWindow) expect(isDue(c, exam, now)).toBe(true);
      }
    }
  });

  it('a card reviewed inside the window is not immediately due again', () => {
    const c = card({ stability: 40, lastReview: windowStart + DAY_MS / 2 });
    expect(isDue(c, exam, windowStart + DAY_MS / 2 + 60_000)).toBe(false);
  });

  it('turns off once the exam has passed', () => {
    const c = card({ stability: 1000, lastReview: new Date(2026, 9, 5).getTime() });
    const after = examMs + DAY_MS;
    expect(nextDue(c, exam, after)).toBeCloseTo(c.lastReview! + dueInterval(1000) * DAY_MS, 0);
    expect(isDue(c, exam, after)).toBe(false);
  });

  it('inFinalWindow', () => {
    expect(inFinalWindow(exam, windowStart - 1)).toBe(false);
    expect(inFinalWindow(exam, windowStart)).toBe(true);
    expect(inFinalWindow(exam, examMs)).toBe(false);
    expect(inFinalWindow(deck, windowStart)).toBe(false);
  });
});

describe('todayQueue (daily new-card limit)', () => {
  const now = T0 + 10 * DAY_MS;
  const dayStart = now - 3600_000;
  const cfg = { ...CONFIG, newCardsPerDay: 3 };
  const fresh = Array.from({ length: 6 }, (_, i) => card({ id: `n${i}`, lastReview: null, createdAt: T0 + i }));
  const old = card({ id: 'old', stability: 1 }); // reviewed at T0, long overdue

  it('includes all due reviews plus new cards up to the limit, in creation order', async () => {
    const { todayQueue } = await import('../src/model/scheduler');
    const ids = todayQueue([...fresh, old], [deck], [], now, dayStart, cfg).map((c) => c.id);
    expect(ids).toContain('old');
    expect(ids.filter((x) => x.startsWith('n'))).toEqual(['n0', 'n1', 'n2']);
  });

  it('counts new cards already started today', async () => {
    const { todayQueue } = await import('../src/model/scheduler');
    const started = [{ id: 'r', cardId: 'x', deckId: 'd', timestamp: now - 60_000, rating: 'got' as const, elapsedDays: null }];
    const ids = todayQueue(fresh, [deck], started, now, dayStart, cfg).map((c) => c.id);
    expect(ids).toEqual(['n0', 'n1']);
  });

  it('never holds back new cards in an exam final window', async () => {
    const { todayQueue } = await import('../src/model/scheduler');
    const examSoon = examDeck('2026-10-13'); // now = Oct 12 local midnight + … → inside the window
    const ids = todayQueue(fresh, [examSoon], [], new Date(2026, 9, 12).getTime(), dayStart, cfg).map((c) => c.id);
    expect(ids.length).toBe(6);
  });
});

describe('study days', () => {
  it('roll over at 4 am local time', async () => {
    const { studyDayStart, studyDayEnd, studyDaysBetween } = await import('../src/model/scheduler');
    const late = new Date(2026, 9, 2, 1, 30).getTime(); // 1:30 am belongs to Oct 1's study day
    expect(studyDayStart(late)).toBe(new Date(2026, 9, 1, 4).getTime());
    expect(studyDayEnd(late)).toBe(new Date(2026, 9, 2, 4).getTime());
    expect(studyDaysBetween(late, new Date(2026, 9, 2, 9).getTime())).toBe(1);
    expect(studyDaysBetween(new Date(2026, 9, 2, 9).getTime(), new Date(2026, 9, 2, 23).getTime())).toBe(0);
  });
});

describe('exam pacing', () => {
  it('raises the new-card allowance so every card is introduced before the final window', async () => {
    const { todayQueue, pacedNewCards } = await import('../src/model/scheduler');
    const now = new Date(2026, 9, 2, 10).getTime();
    // Window opens Oct 7 00:00, inside Oct 6's study day → full study days left: Oct 2–5 = 4.
    const ex = examDeck('2026-10-09');
    const many = Array.from({ length: 30 }, (_, i) => card({ id: `m${i}`, lastReview: null, createdAt: T0 + i }));
    expect(pacedNewCards(ex, many, 0, now)).toBe(8); // ceil(30 / 4)
    expect(pacedNewCards(ex, many.slice(2), 2, now)).toBe(6); // 2 already started today
    const cfg = { ...CONFIG, newCardsPerDay: 3 };
    expect(todayQueue(many, [ex], [], now, now - 3600_000, cfg).length).toBe(8);
    expect(todayQueue(many, [deck], [], now, now - 3600_000, cfg).length).toBe(3); // no exam: normal limit
  });

  it('reports readiness on exam day', async () => {
    const { examReadiness } = await import('../src/model/scheduler');
    const ex = examDeck('2026-10-12');
    const seen = card({ id: 's', stability: 10, lastReview: T0 });
    const unseen = card({ id: 'u', lastReview: null });
    const r = examReadiness(ex, [seen, unseen], T0 + 1)!;
    expect(r.fresh).toBe(1);
    expect(r.total).toBe(2);
    expect(r.recall).toBeCloseTo(Math.exp(-1) / 2, 6); // 10 days at S = 10, averaged with a new card
    expect(examReadiness(deck, [seen], T0)).toBeNull();
  });
});
