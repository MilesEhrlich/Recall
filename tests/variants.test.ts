import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { COURSE } from '../src/data/course';
import { FAMILIES, VARIANTS, dec, num } from '../src/data/variants';

const byId = new Map(COURSE.flatMap((d) => d.cards).map((c) => [c.id, c]));

describe('problem variants', () => {
  it('every family belongs to a real worked-example card and has 4 extra versions', () => {
    for (const f of FAMILIES) {
      expect(byId.get(f.id)?.kind, f.id).toBe('example');
      expect(VARIANTS[f.id].length, f.id).toBe(4);
    }
  });

  for (const f of FAMILIES) {
    it(`${f.id}: every version's answer checks out (ODE, initial values, numbers)`, () => {
      for (const p of f.params) expect(f.check(p), JSON.stringify(p)).toBeLessThan(1e-4);
    });
  }

  it('versions are questions, distinct from each other and from the original, and render', () => {
    for (const f of FAMILIES) {
      const fronts = [byId.get(f.id)!.front, ...VARIANTS[f.id].map((v) => v.front)];
      expect(new Set(fronts).size, f.id).toBe(5);
      for (const v of VARIANTS[f.id]) {
        expect(v.front, f.id).toMatch(/\?/);
        for (const text of [v.front, v.back]) {
          expect(text.split('$').length % 2, `${f.id}: unbalanced $ in ${text}`).toBe(1);
          for (const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
            expect(() => katex.renderToString(m[1] ?? m[2], { throwOnError: true }), `${f.id}: ${m[0]}`).not.toThrow();
          }
          expect(text, `${f.id}: leftover formatting`).not.toMatch(/undefined|NaN|\+ -|- -|\+ \+/);
        }
      }
    }
  });

  it('course cards expose all 5 versions', () => {
    for (const f of FAMILIES) expect(byId.get(f.id)!.variants?.length, f.id).toBe(5);
  });
});

describe('number formatting', () => {
  it('prints exact fractions and tidy decimals', () => {
    expect(num(0.125)).toBe('\\tfrac{1}{8}');
    expect(num(-0.5)).toBe('-\\tfrac{1}{2}');
    expect(num(3)).toBe('3');
    expect(dec(1.09382, 5)).toBe('1.09382');
    expect(dec(2.5)).toBe('2.5');
  });
});
