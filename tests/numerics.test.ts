import { describe, expect, it } from 'vitest';
import { eigenvalues, equilibria, picardIterates, rk4Path, rk4Second, shoot, spring } from '../src/labs/numerics';

describe('rk4Path', () => {
  it('matches the logistic solution from Lecture 6', () => {
    const path = rk4Path((_, P) => 0.6 * P * (4 - P), 0, 1, 1, 200);
    const [t, P] = path[path.length - 1];
    expect(t).toBeCloseTo(1, 10);
    expect(P).toBeCloseTo(4 / (1 + 3 * Math.exp(-2.4)), 6);
  });
  it('integrates backwards and stops at blow-up', () => {
    const back = rk4Path((_, y) => y, 0, 1, -1, 200);
    expect(back[back.length - 1][1]).toBeCloseTo(Math.exp(-1), 8);
    const blow = rk4Path((_, y) => y * y, 0, 1, 2, 2000, 1e3); // y = 1/(1-t) blows up at t = 1
    expect(blow[blow.length - 1][0]).toBeLessThan(1.01);
  });
});

describe('equilibria', () => {
  it('finds and classifies P(4-P)(P-1)', () => {
    const eq = equilibria((P) => P * (4 - P) * (P - 1), -1, 5);
    expect(eq.map((e) => +e.c.toFixed(6))).toEqual([0, 1, 4]);
    expect(eq.map((e) => e.type)).toEqual(['stable', 'unstable', 'stable']);
  });
  it('fishing model: two equilibria for h<4, one semi-stable for h=4, none for h>4', () => {
    const at = (h: number) => equilibria((P) => P * (4 - P) - h, -2, 7);
    const h3 = at(3);
    expect(h3.map((e) => +e.c.toFixed(6))).toEqual([1, 3]);
    expect(h3.map((e) => e.type)).toEqual(['unstable', 'stable']);
    const h4 = at(4);
    expect(h4.length).toBe(1);
    expect(h4[0].c).toBeCloseTo(2, 4);
    expect(h4[0].type).toBe('semi');
    expect(at(4.5)).toEqual([]);
  });
});

describe('picardIterates', () => {
  it('y\'=y, y(0)=1 gives the Taylor polynomials of e^t', () => {
    const { t, ys } = picardIterates((_, y) => y, 0, 1, 1, 3, 2000);
    const i = t.length - 1; // t = 1
    expect(ys[1][i]).toBeCloseTo(2, 5); // 1 + t
    expect(ys[2][i]).toBeCloseTo(2.5, 5); // 1 + t + t²/2
    expect(ys[3][i]).toBeCloseTo(1 + 1 + 0.5 + 1 / 6, 5);
  });
  it('converges to the exact solution', () => {
    const { t, ys } = picardIterates((x, y) => 2 * x * y, 0, 1, 1, 12, 2000);
    expect(ys[12][t.length - 1]).toBeCloseTo(Math.E, 4); // e^{t²} at t=1
  });
});

describe('spring', () => {
  const cases: [number, number, number, string][] = [
    [1, 0, 4, 'undamped'], [1, 1, 4, 'underdamped'], [1, 4, 4, 'critical'], [1, 6, 4, 'overdamped'], [0.5, 0, 50, 'undamped'],
  ];
  for (const [m, c, k, regime] of cases) {
    it(`${regime}: closed form matches RK4 (m=${m}, c=${c}, k=${k})`, () => {
      const s = spring(m, c, k, 1, -5);
      expect(s.regime).toBe(regime);
      const num = rk4Second((_, y, v) => (-c * v - k * y) / m, 1, -5, 3, 3000);
      for (const [t, y] of num.filter((_, i) => i % 300 === 0)) expect(s.y(t)).toBeCloseTo(y, 5);
    });
  }
  it('lecture example: amplitude √5/2, ω0 = 10', () => {
    const s = spring(0.5, 0, 50, 1, -5);
    expect(s.w0).toBeCloseTo(10);
    expect(s.amplitude).toBeCloseTo(Math.sqrt(5) / 2);
  });
});

describe('eigenvalue shooting', () => {
  it('y(L) = 0 exactly at λ = n²π²/L²', () => {
    const L = 2;
    for (const lam of eigenvalues(L, 4)) expect(shoot(lam)(L)).toBeCloseTo(0, 10);
    expect(Math.abs(shoot(-3)(L))).toBeGreaterThan(0.1);
    expect(shoot(0)(L)).toBe(L);
  });
});
