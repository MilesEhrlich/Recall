import { describe, expect, it } from 'vitest';
import { CONCEPTS, PROBLEMS } from '../src/practice/bank';
import { buildQuiz, definitionQuestions, grade, maskDefinition, rng } from '../src/practice/quiz';
import katex from 'katex';

const ALL = ['ch1', 'ch2', 'ch3'] as const;

describe('maskDefinition', () => {
  it('hides the term outside math only', () => {
    expect(maskDefinition('If $f(t,y)$ can be written $g(t)k(y)$, then the ODE is called separable.', ['separable']))
      .toBe('If $f(t,y)$ can be written $g(t)k(y)$, then the ODE is called _____.');
    expect(maskDefinition('$M$: carrying capacity.', ['carrying capacity'])).toBe('$M$: _____.');
    expect(maskDefinition('Stable is $stable$', ['stable'])).toBe('_____ is $stable$');
  });
});

describe('definition questions', () => {
  it('make one valid question per definition with the right answer among 4 distinct choices', () => {
    const qs = definitionQuestions([...ALL], rng(1));
    expect(qs.length).toBeGreaterThanOrEqual(35);
    for (const q of qs) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });
});

describe('question bank', () => {
  it('has valid answers and renderable LaTeX', () => {
    const texts: string[] = [];
    for (const q of CONCEPTS) {
      expect(q.answer).toBeLessThan(q.choices.length);
      texts.push(q.prompt, q.explain, ...q.choices);
    }
    for (const q of PROBLEMS) {
      expect(Number.isFinite(q.answer)).toBe(true);
      texts.push(q.prompt, q.explain);
    }
    for (const t of texts) {
      for (const m of t.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
        expect(() => katex.renderToString(m[1] ?? m[2], { throwOnError: true }), m[0]).not.toThrow();
      }
    }
  });

  it('matches the worked answers in the notes', () => {
    const ans = Object.fromEntries(PROBLEMS.map((q) => [q.id, q.answer]));
    expect(ans['p-carbon']).toBeCloseTo(6693, -1);
    expect(ans['p-bacteria']).toBeCloseTo(8.887, 2);
    expect(ans['p-ball']).toBeCloseTo(7.407, 2);
    expect(ans['p-lunar']).toBeCloseTo(40500, 5);
    expect(ans['p-amplitude']).toBeCloseTo(Math.sqrt(5) / 2, 10);
    expect(ans['p-ivp']).toBe(13);
  });
});

describe('grade', () => {
  const carbon = PROBLEMS.find((q) => q.id === 'p-carbon')!;
  const period = PROBLEMS.find((q) => q.id === 'p-period')!;
  it('accepts answers within tolerance, in any reasonable notation', () => {
    expect(grade(carbon, '6693')).toBe(true);
    expect(grade(carbon, '6,700')).toBe(true); // within 0.5%
    expect(grade(carbon, '6000')).toBe(false);
    expect(grade(period, '2π/10')).toBe(true);
    expect(grade(period, 'pi/5')).toBe(true);
    expect(grade(period, 'abc')).toBe(false);
  });
  it('checks multiple-choice indices', () => {
    expect(grade(CONCEPTS[0], CONCEPTS[0].answer)).toBe(true);
    expect(grade(CONCEPTS[0], (CONCEPTS[0].answer + 1) % 4)).toBe(false);
  });
});

describe('buildQuiz', () => {
  it('respects mode, topic and count', () => {
    const q = buildQuiz('problems', ['ch3'], 5, rng(7));
    expect(q.length).toBe(5);
    expect(q.every((x) => x.type === 'numeric' && x.topic === 'ch3')).toBe(true);
    const mixed = buildQuiz('mixed', [...ALL], 12, rng(3));
    expect(mixed.length).toBe(12);
    expect(new Set(mixed.map((x) => x.id)).size).toBe(12);
  });
});
