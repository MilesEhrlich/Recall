import { describe, expect, it } from 'vitest';
import { dueInterval, halfLife, recall, updateStability } from '../src/model/forgetting';

describe('recall', () => {
  it('is 1 right after review and decays exponentially', () => {
    expect(recall(0, 3)).toBe(1);
    expect(recall(3, 3)).toBeCloseTo(Math.exp(-1), 12);
    expect(recall(6, 3)).toBeCloseTo(Math.exp(-2), 12);
  });

  it('satisfies dR/dt = -R/S (finite difference)', () => {
    const S = 4, t = 2.5, h = 1e-6;
    const deriv = (recall(t + h, S) - recall(t - h, S)) / (2 * h);
    expect(deriv).toBeCloseTo(-recall(t, S) / S, 8);
  });
});

describe('dueInterval', () => {
  it('is S * ln(1/0.9) by default', () => {
    expect(dueInterval(1)).toBeCloseTo(0.1053605, 6);
    expect(dueInterval(10)).toBeCloseTo(1.053605, 5);
  });

  it('lands exactly on the target retention', () => {
    for (const S of [0.5, 1, 7.3, 100]) {
      expect(recall(dueInterval(S), S)).toBeCloseTo(0.9, 12);
      expect(recall(dueInterval(S, 0.8), S)).toBeCloseTo(0.8, 12);
    }
  });
});

describe('updateStability', () => {
  it('multiplies by 2.5 / 1.2 / 0.3', () => {
    expect(updateStability(2, 'got')).toBeCloseTo(5);
    expect(updateStability(2, 'shaky')).toBeCloseTo(2.4);
    expect(updateStability(10, 'missed')).toBeCloseTo(3);
  });

  it('floors missed at 0.5 days', () => {
    expect(updateStability(1, 'missed')).toBe(0.5);
    expect(updateStability(0.5, 'missed')).toBe(0.5);
  });

  it('does not floor got/shaky', () => {
    expect(updateStability(0.1, 'got')).toBeCloseTo(0.25);
  });

  it('new card sequence: got, got, missed', () => {
    let S = 1;
    S = updateStability(S, 'got'); // 2.5
    S = updateStability(S, 'got'); // 6.25
    S = updateStability(S, 'missed'); // 1.875
    expect(S).toBeCloseTo(1.875);
  });
});

describe('halfLife', () => {
  it('is where recall hits 1/2', () => {
    expect(recall(halfLife(5), 5)).toBeCloseTo(0.5, 12);
  });
});
