import { CONFIG, type Config } from '../config';
import type { Rating } from './types';

export const DAY_MS = 86_400_000;

/** Predicted recall after t days with stability S: R(t) = exp(-t/S), the solution of dR/dt = -R/S. */
export function recall(t: number, S: number): number {
  return Math.exp(-t / S);
}

/** Days until R(t) falls to the target retention: t_due = S * ln(1/target). */
export function dueInterval(S: number, target: number = CONFIG.targetRetention): number {
  return S * Math.log(1 / target);
}

export function updateStability(S: number, rating: Rating, cfg: Config = CONFIG): number {
  const next = S * cfg.stabilityMultiplier[rating];
  return rating === 'missed' ? Math.max(cfg.minStability, next) : next;
}

/** Time for recall to fall to 1/2: S * ln 2. */
export function halfLife(S: number): number {
  return S * Math.LN2;
}
