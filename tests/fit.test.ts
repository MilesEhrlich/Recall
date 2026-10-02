import { describe, expect, it } from 'vitest';
import { fitExponential, reviewsToPoints } from '../src/fit/exponential';

describe('fitExponential', () => {
  it('recovers S exactly from noiseless data', () => {
    const S = 5;
    const pts = [0.5, 1, 2, 4, 9].map((t) => ({ t, r: Math.exp(-t / S) }));
    const fit = fitExponential(pts)!;
    expect(fit.S).toBeCloseTo(5, 10);
    expect(fit.halfLife).toBeCloseTo(5 * Math.LN2, 10);
    expect(fit.rmse).toBeCloseTo(0, 10);
    expect(fit.n).toBe(5);
  });

  it('matches a hand computation', () => {
    // sum t^2 = 1 + 4 = 5; sum t ln r = ln 0.6 + 2 ln 0.1
    const fit = fitExponential([{ t: 1, r: 0.6 }, { t: 2, r: 0.1 }])!;
    const k = -(Math.log(0.6) + 2 * Math.log(0.1)) / 5;
    expect(fit.S).toBeCloseTo(1 / k, 12);
    expect(fit.S).toBeCloseTo(0.97733, 4);
  });

  it('is the least-squares minimizer in log space', () => {
    const pts = [{ t: 1, r: 1 }, { t: 2, r: 0.6 }, { t: 3, r: 0.6 }, { t: 5, r: 0.1 }];
    const { S } = fitExponential(pts)!;
    const loss = (s: number) => pts.reduce((a, p) => a + (Math.log(p.r) + p.t / s) ** 2, 0);
    expect(loss(S)).toBeLessThan(loss(S * 1.01));
    expect(loss(S)).toBeLessThan(loss(S * 0.99));
  });

  it('returns null with no usable data or no forgetting', () => {
    expect(fitExponential([])).toBeNull();
    expect(fitExponential([{ t: 0, r: 0.5 }])).toBeNull();
    expect(fitExponential([{ t: 1, r: 1 }, { t: 3, r: 1 }])).toBeNull();
  });
});

describe('reviewsToPoints', () => {
  it('maps ratings to recall values and skips first reviews', () => {
    const pts = reviewsToPoints([
      { rating: 'got', elapsedDays: null },
      { rating: 'got', elapsedDays: 1 },
      { rating: 'shaky', elapsedDays: 2 },
      { rating: 'missed', elapsedDays: 3 },
    ]);
    expect(pts).toEqual([{ t: 1, r: 1 }, { t: 2, r: 0.6 }, { t: 3, r: 0.1 }]);
  });
});
