// Least-squares fit of the power-law forgetting curve R(t) = (1 + t/a)^(-b).
// Taking logs: ln R = -b * ln(1 + t/a). For a fixed a this is a line through the
// origin in x = ln(1 + t/a), so the best b is closed-form: b = -sum(x y) / sum(x^2).
// That leaves a 1-D search over a, done as a log-spaced grid plus golden-section refinement.

import type { Point } from './exponential';

export interface PowerFit {
  a: number;
  b: number;
  /** Time for R to fall to 1/2: a (2^(1/b) - 1). */
  halfLife: number;
  n: number;
  /** Root-mean-square error of R (not ln R), comparable with ExpFit.rmse. */
  rmse: number;
}

export function powerRecall(t: number, a: number, b: number): number {
  return Math.pow(1 + t / a, -b);
}

/** Best b for a given a, and the resulting sum of squared errors in log space. */
function solveB(pts: Point[], a: number): { b: number; sse: number } {
  let sxx = 0, sxy = 0, syy = 0;
  for (const { t, r } of pts) {
    const x = Math.log1p(t / a);
    const y = Math.log(r);
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
  }
  const b = -sxy / sxx;
  // sum (y + b x)^2 = syy + 2b sxy + b^2 sxx
  return { b, sse: syy + 2 * b * sxy + b * b * sxx };
}

export function fitPowerLaw(points: Point[], aRange: [number, number] = [1e-3, 1e6]): PowerFit | null {
  const pts = points.filter((p) => p.t > 0 && p.r > 0);
  if (pts.length === 0) return null;
  if (pts.every((p) => p.r === 1)) return null; // no forgetting observed

  const lo = Math.log(aRange[0]);
  const hi = Math.log(aRange[1]);
  const loss = (u: number) => solveB(pts, Math.exp(u)).sse;

  // Coarse grid over ln a, then golden-section search around the best grid point.
  const N = 120;
  let best = 0;
  let bestLoss = Infinity;
  for (let i = 0; i <= N; i++) {
    const l = loss(lo + ((hi - lo) * i) / N);
    if (l < bestLoss) { bestLoss = l; best = i; }
  }
  let left = lo + ((hi - lo) * Math.max(0, best - 1)) / N;
  let right = lo + ((hi - lo) * Math.min(N, best + 1)) / N;
  const g = (Math.sqrt(5) - 1) / 2;
  let c = right - g * (right - left);
  let d = left + g * (right - left);
  for (let i = 0; i < 80; i++) {
    if (loss(c) < loss(d)) right = d; else left = c;
    c = right - g * (right - left);
    d = left + g * (right - left);
  }

  const a = Math.exp((left + right) / 2);
  const { b } = solveB(pts, a);
  if (!(b > 0)) return null;
  const sse = pts.reduce((acc, { t, r }) => acc + (r - powerRecall(t, a, b)) ** 2, 0);
  return { a, b, halfLife: a * (Math.pow(2, 1 / b) - 1), n: pts.length, rmse: Math.sqrt(sse / pts.length) };
}
