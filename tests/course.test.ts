import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { COURSE, DEFINITIONS } from '../src/data/course';
import { syncCourse, type SeedState } from '../src/data/sync';

const allCards = COURSE.flatMap((d) => d.cards);

function mathSegments(text: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  for (const m of text.matchAll(re)) out.push(m[1] !== undefined ? { tex: m[1], display: true } : { tex: m[2], display: false });
  return out;
}

describe('course content', () => {
  it('has unique card ids', () => {
    const ids = allCards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every LaTeX snippet renders with KaTeX', () => {
    for (const c of allCards) {
      for (const text of [c.front, c.back]) {
        // Balanced dollar signs (an odd count would leave stray math).
        expect(text.split('$').length % 2, `${c.id}: unbalanced $`).toBe(1);
        for (const { tex, display } of mathSegments(text)) {
          expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: display }), `${c.id}: ${tex}`).not.toThrow();
        }
      }
    }
  });

  it('definitions carry the verbatim definition on the back', () => {
    expect(DEFINITIONS.length).toBeGreaterThanOrEqual(35);
    for (const d of DEFINITIONS) {
      expect(d.term, d.id).toBeTruthy();
      expect(d.back.startsWith(d.definition!), d.id).toBe(true);
    }
  });

  it('includes the key definitions from the notes, word for word', () => {
    const byId = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.definition]));
    expect(byId['l1-ode']).toBe('An ordinary differential equation (ODE) is an equation relating unknown function and its derivatives.');
    expect(byId['l3-half-life']).toBe('half-life = time required for the half of the quantity decay.');
    expect(byId['l4-cooling']).toBe("Newton's law of cooling: The rate of the heat loss is proportional to the difference in temperatures between the body and the environment.");
    expect(byId['l7-equilibrium']).toBe('An equilibrium solution is a constant solution $y(t) = c$.');
  });
});

describe('syncCourse', () => {
  let n = 0;
  const id = () => `id${n++}`;
  const fresh = (): SeedState => ({ decks: [], cards: [], removedSeeds: [] });

  it('seeds every deck and card in lecture order', () => {
    const s = fresh();
    syncCourse(s, COURSE, 1000, id);
    expect(s.decks.map((d) => d.seedId)).toEqual(['ch1', 'ch2', 'ch3']);
    expect(s.cards.length).toBe(allCards.length);
    const created = s.cards.map((c) => c.createdAt);
    expect([...created].sort((a, b) => a - b)).toEqual(created);
  });

  it('is idempotent and keeps progress', () => {
    const s = fresh();
    syncCourse(s, COURSE, 1000, id);
    s.cards[0].stability = 9;
    s.cards[0].lastReview = 5000;
    syncCourse(s, COURSE, 2000, id);
    expect(s.cards.length).toBe(allCards.length);
    expect(s.cards[0].stability).toBe(9);
    expect(s.cards[0].lastReview).toBe(5000);
  });

  it('refreshes unedited text, but not edited cards, and respects deletions', () => {
    const s = fresh();
    syncCourse(s, COURSE, 1000, id);
    s.cards[0].front = 'stale';
    s.cards[1].front = 'mine';
    s.cards[1].userEdited = true;
    const removedSeed = s.cards[2].seedId!;
    s.cards.splice(2, 1);
    s.removedSeeds.push(removedSeed);
    syncCourse(s, COURSE, 2000, id);
    expect(s.cards[0].front).toBe(allCards[0].front);
    expect(s.cards[1].front).toBe('mine');
    expect(s.cards.some((c) => c.seedId === removedSeed)).toBe(false);
  });
});

describe('syncCourse timing', () => {
  it('seeded cards are due immediately', async () => {
    const { isDue } = await import('../src/model/scheduler');
    const s: SeedState = { decks: [], cards: [], removedSeeds: [] };
    let i = 0;
    syncCourse(s, COURSE, 5_000_000, () => `x${i++}`);
    expect(s.cards.every((c) => isDue(c, s.decks.find((d) => d.id === c.deckId)!, 5_000_000))).toBe(true);
  });
});
