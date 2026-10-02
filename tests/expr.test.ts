import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/practice/expr';

describe('evaluate', () => {
  it('handles plain numbers and arithmetic', () => {
    expect(evaluate('42')).toBe(42);
    expect(evaluate('1/8')).toBe(0.125);
    expect(evaluate('2 + 3*4')).toBe(14);
    expect(evaluate('-(2^3)')).toBe(-8);
    expect(evaluate('40,500')).toBe(40500);
    expect(evaluate('1e3')).toBe(1000);
  });

  it('handles constants, functions and implicit multiplication', () => {
    expect(evaluate('2π/10')).toBeCloseTo(Math.PI / 5);
    expect(evaluate('2pi/10')).toBeCloseTo(Math.PI / 5);
    expect(evaluate('√5/2')).toBeCloseTo(Math.sqrt(5) / 2);
    expect(evaluate('sqrt(5)/2')).toBeCloseTo(Math.sqrt(5) / 2);
    expect(evaluate('ln(2)/0.1')).toBeCloseTo(Math.LN2 / 0.1);
    expect(evaluate('2e^(-3)')).toBeCloseTo(2 * Math.exp(-3));
    expect(evaluate('9')).toBe(9);
  });

  it('rejects junk', () => {
    expect(evaluate('')).toBeNaN();
    expect(evaluate('alert(1)')).toBeNaN();
    expect(evaluate('2 +')).toBeNaN();
    expect(evaluate('(1')).toBeNaN();
    expect(evaluate('window')).toBeNaN();
  });
});
