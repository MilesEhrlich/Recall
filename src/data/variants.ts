// Alternate versions of the worked-example cards, so reviewing a problem type
// shows a new, similar problem instead of the one you've memorized.
//
// Each family renders its question and worked solution from parameters, so every
// number on the back is computed. `check` returns the largest residual of the
// claimed solution (ODE + initial conditions); tests require it to be ~0.

import { equilibria, shoot } from '../labs/numerics';

const r = String.raw;

export interface Variant {
  front: string;
  back: string;
}

interface Family<P> {
  id: string;
  params: P[];
  render: (p: P) => Variant;
  /** Largest residual of the claimed answer; ~0 means the math checks out. */
  check: (p: P) => number;
}

// ---------- Formatting helpers ----------

/** Exact TeX for simple rationals (denominator ≤ 64), else a short decimal. */
export function num(x: number): string {
  if (Number.isInteger(x)) return String(x);
  for (let d = 2; d <= 64; d++) {
    const n = Math.round(x * d);
    if (Math.abs(x * d - n) < 1e-9) return `${n < 0 ? '-' : ''}\\tfrac{${Math.abs(n)}}{${d}}`;
  }
  return dec(x);
}

/** Decimal with up to `digits` significant decimals, trailing zeros trimmed. */
export function dec(x: number, digits = 3): string {
  const s = Math.abs(x) >= 1000 ? x.toFixed(0) : x.toFixed(digits);
  const t = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return Math.abs(x) >= 1000 ? Number(t).toLocaleString('en-US').replace(/,/g, '{,}') : t;
}

/** Coefficient in front of a symbol: 1 → "", −1 → "-", else the number. */
function coef(x: number, sym: string): string {
  if (sym === '') return num(x);
  if (x === 1) return sym;
  if (x === -1) return `-${sym}`;
  return `${num(x)}${sym}`;
}

/** Polynomial-like sum of [coefficient, symbol] terms with proper signs; zero terms dropped. */
function sum(terms: [number, string][]): string {
  const parts = terms.filter(([c]) => c !== 0);
  if (!parts.length) return '0';
  return parts
    .map(([c, s], i) => {
      const t = coef(Math.abs(c), s);
      if (i === 0) return c < 0 ? `-${t}` : t;
      return c < 0 ? ` - ${t}` : ` + ${t}`;
    })
    .join('');
}

/** A term with its sign for appending after something else: "+ 4y", "- y'", or "" for 0. */
function plus(c: number, sym: string): string {
  if (c === 0) return '';
  return `${c < 0 ? '-' : '+'} ${coef(Math.abs(c), sym)}`;
}

/** √n in TeX, simplified when n is a perfect square. */
function surd(n: number): string {
  const s = Math.round(Math.sqrt(n));
  if (s * s === n) return String(s);
  return `\\sqrt{${n}}`;
}

/** Numerical derivative helpers for the checks. */
const H = 1e-4;
const d1 = (f: (t: number) => number, t: number) => (f(t + H) - f(t - H)) / (2 * H);
const d2 = (f: (t: number) => number, t: number) => (f(t + H) - 2 * f(t) + f(t - H)) / (H * H);
const SAMPLE = [-0.7, -0.3, 0.2, 0.5, 0.9, 1.3];
const maxAbs = (xs: number[]) => Math.max(...xs.map(Math.abs));

// ---------- Families ----------

const ivp1: Family<[number, number, number, number]> = {
  id: 'l2-ex-ivp',
  params: [[6, 2, 0, 5], [2, -5, 2, 3], [-4, 1, 1, 0], [10, 0, -1, 7]],
  render: ([a, b, t0, y0]) => {
    const C = y0 - (a / 2) * t0 * t0 - b * t0;
    const yC = sum([[a / 2, 't^2'], [b, 't']]);
    return {
      front: r`What is the solution of the IVP $\dfrac{dy}{dt} = ${sum([[a, 't'], [b, '']])}$, $y(${t0}) = ${y0}$?`,
      back: r`$y = \int ${sum([[a, 't'], [b, '']])}\,dt = ${yC} + C$.
$${y0} = y(${t0}) = ${num((a / 2) * t0 * t0 + b * t0)} + C$ ⇒ $C = ${num(C)}$.
$$\therefore\ y(t) = ${sum([[a / 2, 't^2'], [b, 't'], [C, '']])}.$$`,
    };
  },
  check: ([a, b, t0, y0]) => {
    const C = y0 - (a / 2) * t0 * t0 - b * t0;
    const y = (t: number) => (a / 2) * t * t + b * t + C;
    return maxAbs([y(t0) - y0, ...SAMPLE.map((t) => d1(y, t) - (a * t + b))]);
  },
};

const ball: Family<[number, number]> = {
  id: 'l2-ex-ball',
  params: [[16, 320], [32, 240], [40, 600], [48, 1000]],
  render: ([v0, h]) => {
    const D = v0 * v0 + 64 * h;
    const t = (v0 + Math.sqrt(D)) / 32;
    const exact = Number.isInteger(Math.sqrt(D));
    return {
      front: `A ball is thrown upward with initial velocity ${v0} ft/s from the top of a ${h} ft cliff. When does it hit the ground?`,
      back: r`$s(0) = ${h}$, $v(0) = ${v0}$, $a(t) = -32$ (gravity).
$v(t) = \int -32\,dt = -32t + ${v0}$.
$s(t) = \int -32t + ${v0}\,dt = -16t^2 + ${v0}t + ${h}$.
$s(t) = 0$ ⇒ $$t = \frac{${v0} + \sqrt{${D}}}{32} ${exact ? '=' : '\\approx'} ${dec(t)}\text{ sec}.$$`,
    };
  },
  check: ([v0, h]) => {
    const t = (v0 + Math.sqrt(v0 * v0 + 64 * h)) / 32;
    return Math.abs(-16 * t * t + v0 * t + h);
  },
};

const lunar: Family<[number, number]> = {
  id: 'l2-ex-lunar',
  params: [[300, 2], [200, 4], [600, 3], [120, 1.5]],
  render: ([v, a]) => {
    const t0 = v / a;
    const C = (v * v) / (2 * a);
    return {
      front: `A lunar module is falling at ${v} m/s. Its engine, when fired, decelerates it at ${a} m/s². To land softly, at what height should the engine be activated?`,
      back: r`$y'(t) = v(t) = -${v} + ${dec(a)}t$, so $y(t) = -${v}t + ${coef(a / 2, 't^2')} + C$ where $C = y(0)$ = height when the engine is activated.
landing softly ⇔ $y(t_0) = 0$, $v(t_0) = 0$.
$v(t_0) = 0$ ⇒ $t_0 = \frac{${v}}{${dec(a)}} = ${num(t0)}$. $y(${num(t0)}) = 0$ ⇒ $C = ${dec(C)}$.
∴ need to activate at ${dec(C).replace('{,}', ',')} m.`,
    };
  },
  check: ([v, a]) => {
    const t0 = v / a, C = (v * v) / (2 * a);
    return maxAbs([-v + a * t0, -v * t0 + (a / 2) * t0 * t0 + C]);
  },
};

const slope: Family<number> = {
  id: 'l2-ex-slope',
  params: [3, 4, 5, 6],
  render: (K) => {
    const f = (y: number) => -y * (y - K);
    const bound = Math.log(K + 1) / K;
    return {
      front: r`For $\dfrac{dy}{dt} = -y(y-${K})$, what does the slope field tell you about the solutions?`,
      back: r`Slopes: at $(1,1)$: $${num(f(1))}$; at $(1,${K})$: $0$; at $(-1,${K + 1})$: $${num(f(K + 1))}$; at $(1,0)$: $0$; at $(0,${num(K / 4)})$: $${num(f(K / 4))}$.
• If $y(t_0) > 0$ at some $t_0$, $\lim_{t\to\infty} y(t) = ${K}$.
• If $y(t_0) < 0$ at some $t_0$, as $t\nearrow$, $y(t)\searrow -\infty$.
Indeed, if $y(0) = -1$, $y(t) = \dfrac{${K}}{1 - ${K + 1}e^{-${K === 1 ? '' : K}t}}$, which exists only for $t < ${K === 1 ? '' : r`\tfrac{1}{${K}}`}\ln ${K + 1} \approx ${dec(bound)}$.`,
    };
  },
  check: (K) => {
    const y = (t: number) => K / (1 - (K + 1) * Math.exp(-K * t));
    const bound = Math.log(K + 1) / K;
    const ts = [-0.5, -0.1, bound * 0.3, bound * 0.6];
    return maxAbs([y(0) + 1, ...ts.map((t) => (d1(y, t) - -y(t) * (y(t) - K)) / (1 + Math.abs(y(t)) ** 2))]);
  },
};

const sepIvp: Family<[number, number]> = {
  id: 'l3-ex-ivp',
  params: [[4, 5], [2, -3], [-2, 1], [10, 4]],
  render: ([k, A]) => {
    const e = sum([[-k / 2, 't^2']]);
    return {
      front: r`What is the solution of the IVP $\dfrac{dy}{dt} = ${coef(-k, 'ty')}$, $y(0) = ${A}$?`,
      back: r`Separable: $\dfrac1y\dfrac{dy}{dt} = ${coef(-k, 't')}$ ⇒ $\ln|y| = ${e} + C$ ⇒ $y(t) = Ae^{${e}}$.
$${A} = y(0) = A$. $$y(t) = ${A === 1 ? '' : A === -1 ? '-' : A}e^{${e}}.$$`,
    };
  },
  check: ([k, A]) => {
    const y = (t: number) => A * Math.exp((-k / 2) * t * t);
    return maxAbs([y(0) - A, ...SAMPLE.map((t) => d1(y, t) - -k * t * y(t))]);
  },
};

const domain: Family<number> = {
  id: 'l3-ex-domain',
  params: [-2, -1.25, 0, 1],
  render: (y0) => {
    const C = -1 / (1 + y0);
    const sol = C > 0
      ? r`$y(t) = \dfrac{1}{t^2 - ${num(C)}} - 1$ with domain $(-${surdOrNum(C)}, ${surdOrNum(C)})$ (it blows up at $t^2 = ${num(C)}$).`
      : r`$y(t) = \dfrac{1}{t^2 + ${num(-C)}} - 1$, defined for all $t$: domain $(-\infty, \infty)$.`;
    return {
      front: r`What is the solution of $\dfrac{dy}{dt} = -2t(1+y)^2$, $y(0) = ${num(y0)}$, and on what domain does it exist?`,
      back: r`$-\dfrac{1}{1+y} = -t^2 + C$ ⇒ $y = \dfrac{1}{t^2 - C} - 1$.
Rmk. The domain of the solution depends on $C$: $C<0$: $(-\infty,\infty)$; $C=0$: $(-\infty,0)$ or $(0,\infty)$; $C>0$: $(-\sqrt C,\sqrt C)$ (around $t = 0$).
$${num(y0)} = \dfrac{1}{0 - C} - 1$ ⇒ $C = ${num(C)}$, so ${sol}`,
    };
  },
  check: (y0) => {
    const C = -1 / (1 + y0);
    const y = (t: number) => 1 / (t * t - C) - 1;
    const ts = C > 0 ? [-0.4, 0.2, 0.4].map((s) => s * Math.sqrt(C)) : SAMPLE;
    return maxAbs([y(0) - y0, ...ts.map((t) => d1(y, t) - -2 * t * (1 + y(t)) ** 2)]);
  },
};

function surdOrNum(x: number): string {
  const s = Math.sqrt(x);
  if (Math.abs(s - Math.round(s * 64) / 64) < 1e-9) return num(Math.round(s * 64) / 64);
  return `\\sqrt{${num(x)}}`;
}

const bacteria: Family<[number, number, number, number]> = {
  id: 'l3-ex-bacteria',
  params: [[100, 400, 2, 10000], [500, 4000, 3, 1e6], [50, 450, 4, 100000], [200, 1000, 5, 50000]],
  render: ([P0, P1, T, N]) => {
    const k = Math.log(P1 / P0) / T;
    const t = Math.log(N / P0) / k;
    return {
      front: `A bacteria culture grows. Initially it was ${P0}. After ${T} hours, it is ${P1.toLocaleString('en-US')}. When will the population reach ${N.toLocaleString('en-US')}?`,
      back: r`$P(t) = ${P0}e^{kt}$. $${P1} = ${P0}e^{${T}k}$ ⇒ $k = \tfrac1{${T}}\ln\tfrac{${P1}}{${P0}} \approx ${dec(k, 5)}$.
$${dec(N)} = ${P0}e^{${dec(k, 5)}t}$ ⇒ $$t = \frac{1}{${dec(k, 5)}}\ln\frac{${dec(N)}}{${P0}} \approx ${dec(t)}\text{ hrs}.$$`,
    };
  },
  check: ([P0, P1, T, N]) => {
    const k = Math.log(P1 / P0) / T, t = Math.log(N / P0) / k;
    return maxAbs([P0 * Math.exp(k * T) / P1 - 1, P0 * Math.exp(k * t) / N - 1]);
  },
};

const carbon: Family<number> = {
  id: 'l3-ex-carbon',
  params: [0.6, 0.25, 0.8, 0.1],
  render: (p) => {
    const t = (-5730 * Math.log(p)) / Math.LN2;
    return {
      front: `An old piece of wood contains ${dec(p * 100)}% of the ¹⁴C found in living matter. How old is it? (half-life of ¹⁴C = 5730 years)`,
      back: r`$m(t) = Ae^{-kt}$ with $k = \dfrac{\ln 2}{5730}$. Want $m(t) = ${dec(p)}A$:
$${dec(p)} = e^{-kt}$ ⇒ $$t = -\frac1k\ln ${dec(p)} = -5730\,\frac{\ln ${dec(p)}}{\ln 2} \approx ${dec(Math.round(t))}\text{ years}.$$`,
    };
  },
  check: (p) => {
    const t = (-5730 * Math.log(p)) / Math.LN2;
    return Math.abs(Math.exp((-Math.LN2 / 5730) * t) - p);
  },
};

const linear1: Family<[number, number]> = {
  id: 'l4-ex-1',
  params: [[1, 5], [-3, 2], [4, -1], [0.5, 6]],
  render: ([a, b]) => {
    const ex = (k: number) => (k === 1 ? 't' : k === -1 ? '-t' : `${num(k)}t`);
    return {
      front: r`What is the general solution of $\dfrac{dy}{dt} ${a > 0 ? '-' : '+'} ${coef(Math.abs(a), 'y')} = ${b === 1 ? '' : b === -1 ? '-' : num(b)}e^{${ex(a)}}$?`,
      back: r`$P(t) = ${num(-a)}$, $Q(t) = ${b === 1 ? '' : b === -1 ? '-' : num(b)}e^{${ex(a)}}$, $\rho(t) = e^{\int ${num(-a)}\,dt} = e^{${ex(-a)}}$.
$\dfrac{d}{dt}\left(e^{${ex(-a)}}y\right) = e^{${ex(-a)}}\cdot ${b < 0 ? '(' : ''}${b === 1 ? '' : b === -1 ? '-' : num(b)}e^{${ex(a)}}${b < 0 ? ')' : ''} = ${num(b)}$ ⇒ $e^{${ex(-a)}}y = ${sum([[b, 't']])} + C$.
$$y = e^{${ex(a)}}(${sum([[b, 't']])} + C).$$`,
    };
  },
  check: ([a, b]) => {
    const y = (t: number) => Math.exp(a * t) * (b * t + 1.7);
    return maxAbs(SAMPLE.map((t) => d1(y, t) - a * y(t) - b * Math.exp(a * t)));
  },
};

const linear2: Family<[number, number]> = {
  id: 'l4-ex-2',
  params: [[2, 1], [4, 3], [1, 5], [6, 1]],
  render: ([k, c]) => {
    const half = num(k / 2);
    const rho = k === 2 ? '(t^2+1)' : `(t^2+1)^{${half}}`;
    const inv = k === 2 ? '(t^2+1)^{-1}' : `(t^2+1)^{-${half}}`;
    const lhsK = coef(k, 'ty');
    return {
      front: r`What is the general solution of $(t^2+1)\dfrac{dy}{dt} + ${lhsK} = ${num(k * c)}t$?`,
      back: r`$\dfrac{dy}{dt} + \dfrac{${coef(k, 't')}}{t^2+1}y = \dfrac{${num(k * c)}t}{t^2+1}$. $\int P\,dt = ${k === 2 ? '' : half}\ln(t^2+1)$ ⇒ $\rho(t) = ${rho}$.
$${rho}y = \int ${k === 2 ? '' : (k / 2 - 1 === 1 ? '(t^2+1)' : `(t^2+1)^{${num(k / 2 - 1)}}`)}\,${num(k * c)}t\,dt = ${c === 1 ? '' : c}${rho} + C$.
$$y = ${c} + C${inv}.$$`,
    };
  },
  check: ([k, c]) => {
    const y = (t: number) => c + 1.3 * (t * t + 1) ** (-k / 2);
    return maxAbs(SAMPLE.map((t) => (t * t + 1) * d1(y, t) + k * t * y(t) - k * c * t));
  },
};

const logistic: Family<[number, number]> = {
  id: 'l6-ex-logistic',
  params: [[0.5, 2], [0.1, 10], [0.25, 8], [0.2, 5]],
  render: ([k, M]) => {
    const kM = k * M;
    const e = (s: string) => (kM === 1 ? `e^{${s}t}` : `e^{${s}${num(kM)}t}`);
    return {
      front: r`What is the solution of $\dfrac{dP}{dt} = ${num(k)}P(${M} - P)$, and what is its long-term limit?`,
      back: r`Partial fractions: $\dfrac{1}{P(${M}-P)} = \dfrac1{${M}}\cdot\dfrac1P + \dfrac1{${M}}\cdot\dfrac{1}{${M}-P}$ ⇒ $\tfrac1{${M}}\ln\left|\dfrac{P}{${M}-P}\right| = ${num(k)}t + C$.
$\dfrac{P}{${M}-P} = \dfrac{P_0}{${M}-P_0}${e('')}$ ⇒ $$P = \frac{${M}P_0}{P_0 + (${M} - P_0)${e('-')}},\qquad \lim_{t\to\infty}P(t) = ${M}.$$`,
    };
  },
  check: ([k, M]) => {
    const P0 = 0.7;
    const P = (t: number) => (M * P0) / (P0 + (M - P0) * Math.exp(-k * M * t));
    return maxAbs([P(0) - P0, ...SAMPLE.map((t) => d1(P, t) - k * P(t) * (M - P(t)))]);
  },
};

const doomsday: Family<[number, number]> = {
  id: 'l6-ex-doomsday',
  params: [[0.5, 2], [0.1, 10], [0.25, 8], [1, 3]],
  render: ([k, M]) => {
    const kM = k * M;
    const e = (s: string) => (kM === 1 ? `e^{${s}t}` : `e^{${s}${num(kM)}t}`);
    return {
      front: r`What is the solution of $\dfrac{dP}{dt} = ${k === 1 ? '' : num(k)}P(P - ${M})$, and what happens for $P_0 < ${M}$ and $P_0 > ${M}$?`,
      back: r`$\dfrac{P}{P-${M}} = \dfrac{P_0}{P_0-${M}}${e('-')}$ ⇒ $$P = \frac{${M}P_0}{P_0 - (P_0 - ${M})${e('')}}.$$
If $P_0 < ${M}$: $t\to\infty$ ⇒ denom → ∞ ⇒ $P \to 0$ … extinction.
If $P_0 > ${M}$: the denominator hits 0 at $t = ${kM === 1 ? '' : r`\frac{1}{${num(kM)}}`}\ln\frac{P_0}{P_0-${M}}$, and as $t\nearrow$, $P\nearrow\infty$ … doomsday.`,
    };
  },
  check: ([k, M]) => {
    const P0 = M + 1;
    const P = (t: number) => (M * P0) / (P0 - (P0 - M) * Math.exp(k * M * t));
    const blow = Math.log(P0 / (P0 - M)) / (k * M);
    const ts = [-0.5, blow * 0.2, blow * 0.5].filter((t) => t < blow);
    return maxAbs([P(0) - P0, ...ts.map((t) => (d1(P, t) - k * P(t) * (P(t) - M)) / (1 + P(t) ** 2))]);
  },
};

const stability: Family<[number, number]> = {
  id: 'l7-ex-stability',
  params: [[5, 2], [3, 1], [6, 3], [10, 4]],
  render: ([a, b]) => ({
    front: r`For $\dfrac{dP}{dt} = P(${a} - P)(P - ${b})$, what are the critical points, which are stable, and what is the limit behavior?`,
    back: r`Q1. $P(${a}-P)(P-${b}) = 0 \Leftrightarrow P = 0, ${b}, ${a}$.
Q2. $P_0 > ${a} ⇒ P\searrow ${a}$; $${b} < P_0 < ${a} ⇒ P\nearrow ${a}$; $0 < P_0 < ${b} ⇒ P\searrow 0$; $P_0 < 0 ⇒ P\nearrow 0$.
∴ 0, ${a} are stable. ${b} is unstable.
Q3. $P(t) \to ${a}$ if $P_0 > ${b}$; $P(t) = ${b}$ if $P_0 = ${b}$; $P(t) \to 0$ if $P_0 < ${b}$.`,
  }),
  check: ([a, b]) => {
    const eq = equilibria((P) => P * (a - P) * (P - b), -1, a + 2);
    const want = [[0, 'stable'], [b, 'unstable'], [a, 'stable']] as const;
    if (eq.length !== 3) return 1;
    return maxAbs(eq.map((e, i) => (e.type === want[i][1] ? e.c - want[i][0] : 1)));
  },
};

const fishing: Family<number> = {
  id: 'l7-ex-fishing',
  params: [6, 2, 8, 10],
  render: (K) => {
    const half = K / 2, hs = (K * K) / 4;
    return {
      front: r`Fish in a lake: $\dfrac{dP}{dt} = P(${K} - P) - h$ ($h$: amount of fish removed by fishing/year). What happens as $h$ changes?`,
      back: r`Critical points: $P^2 - ${K}P + h = 0 \Leftrightarrow P = ${num(half)} \pm\sqrt{${num(hs)}-h}$. Let $C_1 := ${num(half)} + \sqrt{${num(hs)}-h}$, $C_2 := ${num(half)} - \sqrt{${num(hs)}-h}$ ($0 \le h < ${num(hs)}$).
$P_0 > C_1 ⇒ P\searrow C_1$; $C_2 < P_0 < C_1 ⇒ P\nearrow C_1$; $P_0 < C_2 ⇒ P\searrow -\infty$.
$h = ${num(hs)}$: one critical value $c = ${num(half)}$, unstable. $h > ${num(hs)}$: no critical value, $P(t)\searrow -\infty$.`,
    };
  },
  check: (K) => {
    const hs = (K * K) / 4, h = hs * 0.75;
    const eq = equilibria((P) => P * (K - P) - h, -K, 2 * K);
    const c1 = K / 2 + Math.sqrt(hs - h), c2 = K / 2 - Math.sqrt(hs - h);
    const none = equilibria((P) => P * (K - P) - hs * 1.1, -K, 2 * K).length;
    if (eq.length !== 2 || none !== 0) return 1;
    return maxAbs([eq[0].c - c2, eq[1].c - c1, eq[1].type === 'stable' ? 0 : 1, eq[0].type === 'unstable' ? 0 : 1]);
  },
};

const ivp2: Family<[number, number, number]> = {
  id: 'l8-ex-ivp',
  params: [[2, 1, 4], [3, -2, 6], [1, 0, 5], [4, 5, -8]],
  render: ([w, A, B]) => {
    const s = (fn: string) => (w === 1 ? `\\${fn} t` : `\\${fn} ${w}t`);
    const lhs = w === 1 ? "y'' + y" : `y'' + ${w * w}y`;
    const c1 = B / w;
    return {
      front: r`What is the solution of the IVP $${lhs} = 0$, $y(0) = ${A}$, $y'(0) = ${B}$?`,
      back: r`$${s('sin')}$ and $${s('cos')}$ are two solutions. Set $y = C_1${s('sin')} + C_2${s('cos')}$.
$${A} = y(0) = C_2$; $y' = ${w === 1 ? '' : w}C_1${s('cos')} - ${w === 1 ? '' : w}C_2${s('sin')}$ ⇒ $${B} = y'(0) = ${w === 1 ? '' : w}C_1$ ⇒ $C_1 = ${num(c1)}$.
$$\therefore\ y = ${sum([[c1, s('sin')], [A, s('cos')]])}.$$`,
    };
  },
  check: ([w, A, B]) => {
    const y = (t: number) => (B / w) * Math.sin(w * t) + A * Math.cos(w * t);
    return maxAbs([y(0) - A, d1(y, 0) - B, ...SAMPLE.map((t) => (d2(y, t) + w * w * y(t)) / 100)]);
  },
};

const repeated: Family<number> = {
  id: 'l8-ex-tet',
  params: [2, -1, 3, -2],
  render: (r0) => {
    const e = r0 === 1 ? 'e^t' : r0 === -1 ? 'e^{-t}' : `e^{${r0}t}`;
    return {
      front: r`What are two linearly independent solutions of $y'' ${plus(-2 * r0, "y'")} ${plus(r0 * r0, 'y')} = 0$?`,
      back: r`Characteristic equation: $r^2 ${plus(-2 * r0, 'r')} ${plus(r0 * r0, '')} = (r ${plus(-r0, '')})^2 = 0$, so $r = ${r0}$ is a multiple root.
$y_1(t) = ${e}$, $y_2(t) = t${e}$.
Check: $y_2' = ${e} ${plus(r0, 't' + e)}$, $y_2'' = ${num(2 * r0)}${e} ${plus(r0 * r0, 't' + e)}$ ⇒ $y_2'' ${plus(-2 * r0, "y_2'")} ${plus(r0 * r0, 'y_2')} = 0$.`,
    };
  },
  check: (r0) => {
    const y = (t: number) => t * Math.exp(r0 * t);
    return maxAbs(SAMPLE.map((t) => (d2(y, t) - 2 * r0 * d1(y, t) + r0 * r0 * y(t)) / 100));
  },
};

const complexRoots: Family<[number, number]> = {
  id: 'l9-ex-complex',
  params: [[2, 5], [4, 5], [0, 9], [-2, 2]],
  render: ([p, q]) => {
    const a = -p / 2, b2 = q - (p * p) / 4;
    const b = surd(b2);
    const bt = b === '1' ? 't' : `${b}t`;
    const ex = a === 0 ? '' : a === 1 ? 'e^{t}' : a === -1 ? 'e^{-t}' : `e^{${num(a)}t}`;
    const ode = `y'' ${p === 0 ? '' : p > 0 ? `+ ${coef(p, "y'")} ` : `- ${coef(-p, "y'")} `}+ ${q}y`;
    return {
      front: r`What is the general solution of $${ode} = 0$?`,
      back: (p === 0
        ? r`$r^2 + ${q} = 0$ ⇒ $r = \pm\sqrt{-${q}} = \pm ${b === '1' ? '' : b}i$.`
        : r`$r^2 ${p > 0 ? `+ ${coef(p, 'r')}` : `- ${coef(-p, 'r')}`} + ${q} = 0$ ⇒ $r = \dfrac{${num(-p)} \pm\sqrt{${p * p} - ${4 * q}}}{2} = ${num(a)} \pm ${b === '1' ? '' : b}i$.`) + r`
Two solutions: $${ex}\cos ${bt}$, $${ex}\sin ${bt}$.
$$y = c_1${ex}\cos ${bt} + c_2${ex}\sin ${bt}.$$`,
    };
  },
  check: ([p, q]) => {
    const a = -p / 2, b = Math.sqrt(q - (p * p) / 4);
    const y = (t: number) => Math.exp(a * t) * (0.6 * Math.cos(b * t) + 1.1 * Math.sin(b * t));
    return maxAbs(SAMPLE.map((t) => (d2(y, t) + p * d1(y, t) + q * y(t)) / 100));
  },
};

const springEx: Family<[number, number, number, number]> = {
  id: 'l10-ex-spring',
  params: [[1, 4, 2, 0], [2, 8, 0, 6], [1, 9, 3, 12], [0.25, 4, -1, 4]],
  render: ([m, k, y0, v0]) => {
    const w = Math.sqrt(k / m);
    const B = v0 / w;
    const C2 = y0 * y0 + B * B;
    const C = surdOrNum(C2);
    const amp = Math.sqrt(C2);
    const s = (fn: string) => `\\${fn} ${w}t`;
    return {
      front: r`A spring with $k = ${k}$ N/m holds $m = ${num(m)}$ kg, with $y(0) = ${y0}$ m and $y'(0) = ${v0}$ m/s. What is $y(t)$?`,
      back: r`${m === 1 ? '' : `$${coef(m, "y''")} + ${k}y = 0$ ⇒ `}$y'' + ${num(k / m)}y = 0$ ⇒ $\omega_0 = ${w}$, $y = A${s('cos')} + B${s('sin')}$.
$A = ${y0}$; $${v0} = y'(0) = ${w}B$ ⇒ $B = ${num(B)}$. $y(t) = ${sum([[y0, s('cos')], [B, s('sin')]])}$.
$C = \sqrt{A^2 + B^2} = ${C}$ ⇒ $y(t) = ${C === '1' ? '' : C}\cos(${w}t - \alpha)$, $\cos\alpha = ${dec(y0 / amp)}$, $\sin\alpha = ${dec(B / amp)}$. period: $\frac{2\pi}{${w}}${w === 2 ? ' = \\pi' : ''}$.`,
    };
  },
  check: ([m, k, y0, v0]) => {
    const w = Math.sqrt(k / m), B = v0 / w;
    const y = (t: number) => y0 * Math.cos(w * t) + B * Math.sin(w * t);
    return maxAbs([y(0) - y0, d1(y, 0) - v0, ...SAMPLE.map((t) => (m * d2(y, t) + k * y(t)) / 100)]);
  },
};

const guess: Family<[number, number, number, number]> = {
  id: 'l10-ex-guess',
  params: [[1, 1, 0, 0], [9, 0, 9, 0], [4, 4, 0, 0], [1, 0, 2, 3]],
  render: ([w2, a, b, c]) => {
    const A = a / w2, B = b / w2, C = (c - 2 * A) / w2;
    const w = Math.sqrt(w2);
    const trig = (fn: string) => (w === 1 ? `\\${fn} t` : `\\${fn} ${w}t`);
    const lhs = w2 === 1 ? "y'' + y" : `y'' + ${w2}y`;
    return {
      front: r`What is the general solution of $${lhs} = ${sum([[a, 't^2'], [b, 't'], [c, '']])}$?`,
      back: r`Set $y = At^2 + Bt + C$: $${w2 === 1 ? '' : w2}At^2 + ${w2 === 1 ? '' : w2}Bt + (2A + ${w2 === 1 ? '' : w2}C) = ${sum([[a, 't^2'], [b, 't'], [c, '']])}$ ⇒ $A = ${num(A)}$, $B = ${num(B)}$, $C = ${num(C)}$. $y_p = ${sum([[A, 't^2'], [B, 't'], [C, '']])}$.
$${lhs} = 0$ has $y_h = c_1${trig('cos')} + c_2${trig('sin')}$.
$$y = c_1${trig('cos')} + c_2${trig('sin')} ${sum([[A, 't^2'], [B, 't'], [C, '']]).startsWith('-') ? '' : '+ '}${sum([[A, 't^2'], [B, 't'], [C, '']])}.$$`,
    };
  },
  check: ([w2, a, b, c]) => {
    const A = a / w2, B = b / w2, C = (c - 2 * A) / w2;
    const y = (t: number) => A * t * t + B * t + C;
    return maxAbs(SAMPLE.map((t) => d2(y, t) + w2 * y(t) - (a * t * t + b * t + c)));
  },
};

const eigen: Family<{ L: number; Ltex: string; lam: string; fn: string }> = {
  id: 'l11-ex-eigen',
  params: [
    { L: 1, Ltex: '1', lam: r`n^2\pi^2`, fn: r`\sin n\pi t` },
    { L: 2, Ltex: '2', lam: r`\dfrac{n^2\pi^2}{4}`, fn: r`\sin\dfrac{n\pi t}{2}` },
    { L: Math.PI / 2, Ltex: r`\tfrac{\pi}{2}`, lam: '4n^2', fn: r`\sin 2nt` },
    { L: 3, Ltex: '3', lam: r`\dfrac{n^2\pi^2}{9}`, fn: r`\sin\dfrac{n\pi t}{3}` },
  ],
  render: ({ Ltex, lam, fn }) => ({
    front: r`What are the eigenvalues and eigenfunctions of $y'' + \lambda y = 0$, $y(0) = 0$, $y(${Ltex}) = 0$?`,
    back: r`① $\lambda > 0$: $\lambda = \alpha^2$, $y = c_1\cos\alpha t + c_2\sin\alpha t$ ⇒ $c_1 = 0$, $c_2\sin${Ltex === '1' ? '\\alpha' : `(${Ltex}\\alpha)`} = 0$ ⇒ $${Ltex === '1' ? '' : Ltex}\alpha = n\pi$.
② $\lambda < 0$: $y = d_1\cosh\sqrt{-\lambda}t + d_2\sinh\sqrt{-\lambda}t$ ⇒ $d_1 = d_2 = 0$. No eigenvalue.
③ $\lambda = 0$: $y = c_1 + c_2t$ ⇒ $c_1 = c_2 = 0$. No eigenvalue.
Summary: eigenvalues: $\lambda_n = ${lam}$, $n \in \mathbb{N}$. eigenfunctions: $${fn}$.`,
  }),
  check: ({ L }) => maxAbs([1, 2, 3].map((n) => shoot(((n * Math.PI) / L) ** 2)(L))),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FAMILIES: Family<any>[] = [
  ivp1, ball, lunar, slope, sepIvp, domain, bacteria, carbon, linear1, linear2,
  logistic, doomsday, stability, fishing, ivp2, repeated, complexRoots, springEx, guess, eigen,
];

/** Extra versions per card id (the lecture's original is version 1 of 5). */
export const VARIANTS: Record<string, Variant[]> = Object.fromEntries(
  FAMILIES.map((f) => [f.id, f.params.map((p) => f.render(p))]),
);
