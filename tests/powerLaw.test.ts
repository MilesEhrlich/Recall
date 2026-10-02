import { describe, expect, it } from 'vitest';
import { fitExponential } from '../src/fit/exponential';
import { fitPowerLaw, powerRecall } from '../src/fit/powerLaw';

const ts = [0.25, 0.5, 1, 2, 3, 5, 8, 13, 21];

describe('fitPowerLaw', () => {
  it('recovers a and b from noiseless power-law data', () => {
    const pts = ts.map((t) => ({ t, r: powerRecall(t, 2, 1.5) }));
    const fit = fitPowerLaw(pts)!;
    expect(fit.a).toBeCloseTo(2, 3);
    expect(fit.b).toBeCloseTo(1.5, 3);
    expect(fit.rmse).toBeLessThan(1e-6);
    expect(powerRecall(fit.halfLife, fit.a, fit.b)).toBeCloseTo(0.5, 10);
  });

  it('beats the exponential on power-law data', () => {
    const pts = ts.map((t) => ({ t, r: powerRecall(t, 1, 0.8) }));
    expect(fitPowerLaw(pts)!.rmse).toBeLessThan(fitExponential(pts)!.rmse);
  });

  it('approaches the exponential on exponential data (large a, b/a ~ 1/S)', () => {
    const S = 4;
    const pts = ts.map((t) => ({ t, r: Math.exp(-t / S) }));
    const fit = fitPowerLaw(pts)!;
    expect(fit.a).toBeGreaterThan(100);
    expect(fit.b / fit.a).toBeCloseTo(1 / S, 3);
    expect(fit.rmse).toBeLessThan(1e-3);
  });

  it('is never meaningfully worse than the exponential in log space (it nests it as a -> infinity)', () => {
    const pts = [{ t: 1, r: 1 }, { t: 2, r: 0.6 }, { t: 3, r: 0.6 }, { t: 5, r: 0.1 }, { t: 0.5, r: 0.6 }];
    const exp = fitExponential(pts)!;
    const pow = fitPowerLaw(pts)!;
    const logSse = (f: (t: number) => number) => pts.reduce((s, p) => s + (Math.log(p.r) - Math.log(f(p.t))) ** 2, 0);
    const expSse = logSse((t) => Math.exp(-t / exp.S));
    // a is searched up to 1e6, so the exponential limit is only reached approximately.
    expect(logSse((t) => powerRecall(t, pow.a, pow.b))).toBeLessThanOrEqual(expSse * (1 + 1e-4));
  });

  it('returns null with no data or no forgetting', () => {
    expect(fitPowerLaw([])).toBeNull();
    expect(fitPowerLaw([{ t: 1, r: 1 }, { t: 4, r: 1 }])).toBeNull();
  });
});
