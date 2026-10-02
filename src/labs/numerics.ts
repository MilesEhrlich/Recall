// Numerical tools behind the interactive labs. Pure functions, unit tested.

export type Pt = [number, number];

/** Classic RK4 for y' = f(t, y). Integrates from (t0, y0) to tEnd (either direction); stops if y leaves ±yLimit. */
export function rk4Path(f: (t: number, y: number) => number, t0: number, y0: number, tEnd: number, steps = 400, yLimit = 1e6): Pt[] {
  const h = (tEnd - t0) / steps;
  const out: Pt[] = [[t0, y0]];
  let t = t0, y = y0;
  for (let i = 0; i < steps; i++) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + (h / 2) * k1);
    const k3 = f(t + h / 2, y + (h / 2) * k2);
    const k4 = f(t + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t += h;
    if (!Number.isFinite(y) || Math.abs(y) > yLimit) break;
    out.push([t, y]);
  }
  return out;
}

/** RK4 for the second-order system y'' = g(t, y, y'). Returns samples of y. */
export function rk4Second(g: (t: number, y: number, v: number) => number, y0: number, v0: number, tEnd: number, steps = 1000): Pt[] {
  const h = tEnd / steps;
  const out: Pt[] = [[0, y0]];
  let t = 0, y = y0, v = v0;
  for (let i = 0; i < steps; i++) {
    const k1y = v, k1v = g(t, y, v);
    const k2y = v + (h / 2) * k1v, k2v = g(t + h / 2, y + (h / 2) * k1y, v + (h / 2) * k1v);
    const k3y = v + (h / 2) * k2v, k3v = g(t + h / 2, y + (h / 2) * k2y, v + (h / 2) * k2v);
    const k4y = v + h * k3v, k4v = g(t + h, y + h * k3y, v + h * k3v);
    y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    t += h;
    out.push([t, y]);
  }
  return out;
}

export type Stability = 'stable' | 'unstable' | 'semi';

/** Critical points of an autonomous y' = g(y) in [lo, hi], classified by the sign of g on each side. */
export function equilibria(g: (y: number) => number, lo: number, hi: number, n = 4000): { c: number; type: Stability }[] {
  const roots: number[] = [];
  const dy = (hi - lo) / n;
  const bisect = (a: number, b: number) => {
    let fa = g(a);
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2, fm = g(m);
      if (fm === 0) return m;
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  };
  for (let i = 0; i < n; i++) {
    const a = lo + i * dy, b = a + dy;
    const fa = g(a), fb = g(b);
    if (fa === 0) roots.push(a);
    else if (Math.sign(fa) !== Math.sign(fb) && fb !== 0) roots.push(bisect(a, b));
    else if (i > 0) {
      // Touching root (double root): |g| has a tiny local minimum without a sign change.
      const fp = g(a - dy);
      if (Math.abs(fa) < Math.abs(fp) && Math.abs(fa) <= Math.abs(fb) && Math.abs(fa) < 1e-6 * (1 + Math.abs(fp))) {
        let l = a - dy, r = b;
        for (let k = 0; k < 100; k++) {
          const m1 = l + (r - l) / 3, m2 = r - (r - l) / 3;
          if (Math.abs(g(m1)) < Math.abs(g(m2))) r = m2; else l = m1;
        }
        const c = (l + r) / 2;
        if (Math.abs(g(c)) < 1e-9) roots.push(c);
      }
    }
  }
  const unique = roots.filter((c, i) => i === 0 || Math.abs(c - roots[i - 1]) > dy * 2);
  return unique.map((c) => {
    const d = Math.max(1e-4, Math.abs(c) * 1e-4);
    const l = Math.sign(g(c - d)), r = Math.sign(g(c + d));
    const type: Stability = l > 0 && r < 0 ? 'stable' : l < 0 && r > 0 ? 'unstable' : 'semi';
    return { c: Math.abs(c) < 1e-9 ? 0 : c, type };
  });
}

/**
 * Picard iterates y_0 … y_n for y' = f(t, y), y(a) = b on [a, tMax],
 * using the trapezoid rule on a uniform grid: y_{k+1}(t) = b + ∫_a^t f(x, y_k(x)) dx.
 */
export function picardIterates(f: (t: number, y: number) => number, a: number, b: number, tMax: number, n: number, grid = 400): { t: number[]; ys: number[][] } {
  const t = Array.from({ length: grid + 1 }, (_, i) => a + ((tMax - a) * i) / grid);
  const ys: number[][] = [t.map(() => b)];
  for (let k = 0; k < n; k++) {
    const prev = ys[k];
    const next = [b];
    for (let i = 1; i <= grid; i++) {
      const dx = t[i] - t[i - 1];
      next.push(next[i - 1] + (dx / 2) * (f(t[i - 1], prev[i - 1]) + f(t[i], prev[i])));
    }
    ys.push(next);
  }
  return { t, ys };
}

export type Regime = 'undamped' | 'underdamped' | 'critical' | 'overdamped';

/** Closed-form solution of my'' + cy' + ky = 0, y(0) = y0, y'(0) = v0 (Lecture 10). */
export function spring(m: number, c: number, k: number, y0: number, v0: number) {
  const p = c / (2 * m);
  const w0 = Math.sqrt(k / m);
  const disc = p * p - w0 * w0;
  const eps = 1e-9 * Math.max(1, w0 * w0);
  if (c === 0) {
    const A = y0, B = v0 / w0;
    return { regime: 'undamped' as Regime, p, w0, roots: [`±${w0.toFixed(3)}i`], amplitude: Math.hypot(A, B), y: (t: number) => A * Math.cos(w0 * t) + B * Math.sin(w0 * t) };
  }
  if (Math.abs(disc) <= eps) {
    const c1 = y0, c2 = v0 + p * y0;
    return { regime: 'critical' as Regime, p, w0, roots: [`${(-p).toFixed(3)} (double)`], y: (t: number) => (c1 + c2 * t) * Math.exp(-p * t) };
  }
  if (disc < 0) {
    const w1 = Math.sqrt(-disc);
    const c1 = y0, c2 = (v0 + p * y0) / w1;
    return { regime: 'underdamped' as Regime, p, w0, w1, roots: [`${(-p).toFixed(3)} ± ${w1.toFixed(3)}i`], y: (t: number) => Math.exp(-p * t) * (c1 * Math.cos(w1 * t) + c2 * Math.sin(w1 * t)) };
  }
  const s = Math.sqrt(disc);
  const r1 = -p + s, r2 = -p - s;
  const c2 = (v0 - r1 * y0) / (r2 - r1), c1 = y0 - c2;
  return { regime: 'overdamped' as Regime, p, w0, roots: [r1.toFixed(3), r2.toFixed(3)], y: (t: number) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t) };
}

/** Shooting for y'' + λy = 0, y(0) = 0, y'(0) = 1. Exact solution (Lecture 11 cases). */
export function shoot(lambda: number): (t: number) => number {
  if (lambda > 0) { const a = Math.sqrt(lambda); return (t) => Math.sin(a * t) / a; }
  if (lambda < 0) { const a = Math.sqrt(-lambda); return (t) => Math.sinh(a * t) / a; }
  return (t) => t;
}

/** Eigenvalues n²π²/L² of y'' + λy = 0, y(0) = y(L) = 0. */
export function eigenvalues(L: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => ((i + 1) * Math.PI / L) ** 2);
}
