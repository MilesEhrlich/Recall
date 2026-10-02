// Least-squares fit of the exponential forgetting curve R(t) = exp(-t/S).
// Taking logs gives ln R = -t/S, a line through the origin with slope k = -1/S.
// Minimizing sum (ln r_i + k t_i)^2 over k gives k = -sum(t_i ln r_i) / sum(t_i^2).

import { CONFIG } from '../config';
import type { Rating } from '../model/types';

export interface Point {
  /** Days since the previous review. */
  t: number;
  /** Observed recall in (0, 1]. */
  r: number;
}

export interface ExpFit {
  /** Fitted stability in days. */
  S: number;
  /** S * ln 2. */
  halfLife: number;
  /** Number of points used. */
  n: number;
  /** Root-mean-square error of R (not ln R), for comparing against other models. */
  rmse: number;
}

/** Turn stored reviews into (t, r) points. A card's first review has no gap and is skipped. */
export function reviewsToPoints(
  reviews: { rating: Rating; elapsedDays: number | null }[],
  recallValue: Record<Rating, number> = CONFIG.recallValue,
): Point[] {
  return reviews
    .filter((r) => r.elapsedDays !== null && r.elapsedDays > 0)
    .map((r) => ({ t: r.elapsedDays!, r: recallValue[r.rating] }));
}

/**
 * Returns null when there is nothing to fit: no points with t > 0 and r > 0,
 * or no forgetting observed (every recall = 1 gives slope 0, i.e. S = infinity).
 */
export function fitExponential(points: Point[]): ExpFit | null {
  const pts = points.filter((p) => p.t > 0 && p.r > 0);
  let stt = 0;
  let sty = 0;
  for (const { t, r } of pts) {
    stt += t * t;
    sty += t * Math.log(r);
  }
  if (pts.length === 0 || stt === 0) return null;
  const k = -sty / stt;
  if (!(k > 0)) return null;
  const S = 1 / k;
  const sse = pts.reduce((acc, { t, r }) => acc + (r - Math.exp(-t / S)) ** 2, 0);
  return { S, halfLife: S * Math.LN2, n: pts.length, rmse: Math.sqrt(sse / pts.length) };
}
