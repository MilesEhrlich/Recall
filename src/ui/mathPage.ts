// "The Math": an interactive explanation of the model Recall runs on.
// Everything here calls the same functions the scheduler and Insights use.

import { CONFIG } from '../config';
import { fitExponential, reviewsToPoints, type Point } from '../fit/exponential';
import { fitPowerLaw, powerRecall } from '../fit/powerLaw';
import { DAY_MS, dueInterval, halfLife, recall, updateStability } from '../model/forgetting';
import { applyReview } from '../model/review';
import { nextDue } from '../model/scheduler';
import type { Card, Deck, Rating } from '../model/types';
import { state } from '../store';
import { recallChart } from './chart';
import { h } from './dom';
import { duration, pct } from './format';
import { insightsTabs } from './insights';
import { mathBlock } from './math';
import { makePlot, sample, svg } from './plot';

const r = String.raw;

function section(num: string, title: string, ...children: (Node | string)[]): HTMLElement {
  return h('section', { class: 'panel math-section' },
    h('h2', { class: 'panel-title' }, h('span', { class: 'num' }, num), title), ...children);
}

function prose(tex: string): HTMLElement {
  return mathBlock(tex, 'math math-prose');
}

function slider(label: string, opts: { min: number; max: number; step: number; value: number }, fmt: (v: number) => string, onInput: (v: number) => void) {
  const out = h('output', {}, fmt(opts.value));
  const input = h('input', {
    type: 'range', min: opts.min, max: opts.max, step: opts.step, value: opts.value, 'aria-label': label,
    oninput: () => { const v = parseFloat(input.value); out.textContent = fmt(v); onInput(v); },
  });
  return h('div', { class: 'slider' }, h('label', {}, label), input, out);
}

export function renderMath(root: HTMLElement): () => void {
  root.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, 'Insights'),
      h('h1', {}, 'The math behind Recall'),
      h('p', { class: 'page-sub' }, 'The scheduler is a first-order linear ODE, a few update rules, and two least-squares fits. Every chart below runs the app’s real code with the constants from config.ts.'),
    ),
    insightsTabs('math'),
    forgettingSection(),
    stabilitySection(),
    examSection(),
    ...fittingSections(),
    constantsSection(),
  );
  return () => {};
}

// ---------- 1. The forgetting ODE ----------

function forgettingSection(): HTMLElement {
  let S = 4;
  let target = CONFIG.targetRetention;
  const box = h('div', {});
  const out = h('div', {});

  const draw = () => {
    const tDue = dueInterval(S, target);
    const tHalf = halfLife(S);
    const T = Math.max(3 * S, tHalf * 1.4);
    const plot = makePlot({ width: 600, height: 280, x: [0, T], y: [0, 1], xLabel: 'days since last review', yFormat: (v) => pct(v) });
    plot.layer.append(svg('rect', { x: plot.x(0), y: plot.m.t, width: plot.x(tDue) - plot.x(0), height: plot.H - plot.m.t - plot.m.b, class: 'band' }));
    plot.line(sample((t) => recall(t, S), 0, T), 'curve a');
    plot.layer.append(
      svg('line', { x1: plot.m.l, x2: plot.W - plot.m.r, y1: plot.y(target), y2: plot.y(target), class: 'ref' }),
      svg('line', { x1: plot.x(tDue), x2: plot.x(tDue), y1: plot.m.t, y2: plot.H - plot.m.b, class: 'ref' }),
      svg('circle', { cx: plot.x(tDue), cy: plot.y(target), r: 5, class: 'marker' }),
      svg('circle', { cx: plot.x(tHalf), cy: plot.y(0.5), r: 4.5, class: 'marker shaky' }),
    );
    plot.el.append(
      svg('text', { x: plot.x(tDue) + 6, y: plot.m.t + 14, class: 'label' }, `due: t = ${duration(tDue)}`),
      svg('text', { x: plot.x(tHalf) + 7, y: plot.y(0.5) - 7, class: 'label' }, `half-life ${duration(tHalf)}`),
    );
    box.replaceChildren(plot.el);
    out.replaceChildren(mathBlock(r`$t_{\text{due}} = S\ln\frac{1}{R^*} = ${S.toFixed(1)}\cdot\ln\frac{1}{${target.toFixed(2)}} = ${tDue.toFixed(3)}$ days $\;(${duration(tDue)})$, so the next session is ${Math.max(CONFIG.minIntervalDays, Math.floor(tDue)) === 1 ? 'tomorrow' : `in ${Math.max(CONFIG.minIntervalDays, Math.floor(tDue))} days`}. Half-life $= S\ln 2 = ${tHalf.toFixed(2)}$ days.`, 'math math-prose'));
  };

  const el = section('01', 'Forgetting is a first-order linear ODE',
    prose(r`Each card has a **stability** $S$ (days). Between reviews its predicted recall $R$ decays at a rate proportional to itself — the same equation as radioactive decay in §1.4:
$$\frac{dR}{dt} = -\frac{R}{S},\qquad R(0) = 1 \quad\Longrightarrow\quad R(t) = e^{-t/S}.$$
It's separable ($\frac1R\frac{dR}{dt} = -\frac1S$), or linear with integrating factor $e^{t/S}$. The card is due when $R$ falls to the target retention $R^* = ${CONFIG.targetRetention}$:
$$e^{-t/S} = R^* \;\Longrightarrow\; t_{\text{due}} = S\ln\frac{1}{R^*}.$$
Because you study once a day, the actual gap is $\max(${CONFIG.minIntervalDays}\text{ day},\ t_{\text{due}})$, and a card counts as due for the whole study day its due time falls in (days roll over at ${CONFIG.studyDayStartHour} am, so a late night still counts as today). A card that comes due while you're asleep simply waits for your next session.`.replace(/\*\*(.+?)\*\*/g, '$1')),
    h('div', { class: 'controls' },
      slider('stability S', { min: 0.5, max: 60, step: 0.5, value: S }, (v) => `${v} d`, (v) => { S = v; draw(); }),
      slider('target R*', { min: 0.7, max: 0.97, step: 0.01, value: target }, (v) => v.toFixed(2), (v) => { target = v; draw(); }),
    ),
    box, out,
  );
  draw();
  return el;
}

// ---------- 2. Stability updates ----------

/** Whole days until the next session for stability S (no exam): the card is studied on the day it comes due. */
function nextGap(S: number): number {
  return Math.max(CONFIG.minIntervalDays, Math.floor(dueInterval(S)));
}

function stabilitySection(): HTMLElement {
  type Step = { t: number; S: number; rating: Rating | null };
  let steps: Step[] = [{ t: 0, S: CONFIG.initialStability, rating: null }];
  const box = h('div', {});
  const line = h('div', { class: 'timeline' });

  const draw = () => {
    const lastStep = steps[steps.length - 1];
    const end = lastStep.t + Math.max(nextGap(lastStep.S), dueInterval(lastStep.S)) * 1.5 + 0.5;
    const plot = makePlot({ width: 600, height: 250, x: [0, end], y: [0.75, 1.01], xLabel: 'days', yFormat: (v) => pct(v) });
    plot.layer.append(svg('line', { x1: plot.m.l, x2: plot.W - plot.m.r, y1: plot.y(CONFIG.targetRetention), y2: plot.y(CONFIG.targetRetention), class: 'ref' }));
    steps.forEach((s, i) => {
      const until = i + 1 < steps.length ? steps[i + 1].t : end;
      plot.line(sample((t) => recall(t - s.t, s.S), s.t, until, 120), 'curve a');
      plot.layer.append(svg('circle', { cx: plot.x(s.t), cy: plot.y(1), r: 5, class: `marker ${s.rating ?? ''}` }));
    });
    box.replaceChildren(plot.el);
    line.replaceChildren(...steps.map((s, i) =>
      h('span', {}, i === 0 ? `new: S=${s.S}` : `day ${s.t}: ${s.rating === 'got' ? 'Got it' : s.rating === 'shaky' ? 'Shaky' : 'Missed'} → S=${+s.S.toFixed(2)} · next ${nextGap(s.S) === 1 ? 'tomorrow' : `in ${nextGap(s.S)} days`}`)));
  };
  const rate = (rating: Rating) => {
    const last = steps[steps.length - 1];
    const t = last.t + nextGap(last.S); // one session a day: reviewed on the day it comes due
    steps = [...steps, { t, S: updateStability(last.S, rating), rating }].slice(-10);
    draw();
  };

  const el = section('02', 'Each rating rescales the stability',
    prose(r`A review resets $R$ to 1 and multiplies $S$, so the next decay curve is flatter (or steeper):
$$S \leftarrow \begin{cases} ${CONFIG.stabilityMultiplier.got}\,S & \text{Got it}\\ ${CONFIG.stabilityMultiplier.shaky}\,S & \text{Shaky}\\ \max(${CONFIG.minStability},\ ${CONFIG.stabilityMultiplier.missed}\,S) & \text{Missed}\end{cases}\qquad S_{\text{new card}} = ${CONFIG.initialStability}.$$
Because $t_{\text{due}}$ is proportional to $S$, the gaps between reviews grow geometrically. With one session a day, a new card answered "Got it" every time comes back after 1, 1, 1, 4, 10, then 25 days. The dips below 90% are the hours between a card's exact due time and your next session. Try it:`),
    h('div', { class: 'sim-buttons' },
      h('button', { class: 'rate missed', style: 'min-height:44px;padding:6px 16px', onclick: () => rate('missed') }, 'Missed'),
      h('button', { class: 'rate shaky', style: 'min-height:44px;padding:6px 16px', onclick: () => rate('shaky') }, 'Shaky'),
      h('button', { class: 'rate got', style: 'min-height:44px;padding:6px 16px', onclick: () => rate('got') }, 'Got it'),
      h('button', { class: 'btn sm ghost', onclick: () => { steps = [{ t: 0, S: CONFIG.initialStability, rating: null }]; draw(); } }, 'Reset'),
    ),
    box, line,
  );
  draw();
  return el;
}

// ---------- 3. Exam cap ----------

function examSection(): HTMLElement {
  let days = 20;
  let S0 = 30;
  const box = h('div', {});
  const out = h('div', {});

  const simulate = (withExam: boolean) => {
    const T0 = new Date(2026, 0, 1).getTime();
    const exam = new Date(2026, 0, 1 + days);
    const deck: Deck = { id: 'd', name: 'sim', examDate: withExam ? `${exam.getFullYear()}-${String(exam.getMonth() + 1).padStart(2, '0')}-${String(exam.getDate()).padStart(2, '0')}` : null };
    let card: Card = { id: 'c', deckId: 'd', front: '', back: '', stability: S0, lastReview: T0, createdAt: T0 };
    const times: number[] = [0];
    for (let i = 0; i < 60; i++) {
      const due = nextDue(card, deck, card.lastReview!);
      if ((due - T0) / DAY_MS >= days) break;
      card = applyReview(card, 'got', due, 'r').card;
      times.push((due - T0) / DAY_MS);
    }
    return times;
  };

  const draw = () => {
    const capped = simulate(true);
    const plain = simulate(false);
    const W = 600, H = 150, L = 40, R = 14;
    const x = (d: number) => L + (d / days) * (W - L - R);
    const plot = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot', role: 'img', 'aria-label': 'Review schedule before the exam' });
    const winStart = days - CONFIG.exam.finalWindowDays;
    plot.append(
      svg('rect', { x: x(Math.max(0, winStart)), y: 14, width: x(days) - x(Math.max(0, winStart)), height: H - 44, class: 'band-red' }),
      svg('text', { x: x(Math.max(0, winStart)) + 4, y: 26, class: 'tick' }, 'final window'),
      svg('line', { x1: L, x2: W - R, y1: 52, y2: 52, class: 'axis' }),
      svg('line', { x1: L, x2: W - R, y1: 96, y2: 96, class: 'axis' }),
      svg('text', { x: L - 6, y: 56, 'text-anchor': 'end', class: 'tick' }, 'cap'),
      svg('text', { x: L - 6, y: 100, 'text-anchor': 'end', class: 'tick' }, 'none'),
      svg('line', { x1: x(days), x2: x(days), y1: 10, y2: H - 30, stroke: 'var(--red)', 'stroke-width': 2 }),
      svg('text', { x: x(days), y: H - 14, 'text-anchor': 'end', class: 'label' }, `exam · day ${days}`),
    );
    for (const t of capped) plot.append(svg('circle', { cx: x(t), cy: 52, r: 5, class: 'marker got' }));
    for (const t of plain) plot.append(svg('circle', { cx: x(t), cy: 96, r: 5, class: 'marker', opacity: 0.55 }));
    box.replaceChildren(plot);
    const gaps = capped.slice(1).map((t, i) => t - capped[i]);
    out.replaceChildren(
      h('div', { class: 'calc' },
        `normal gap   S·ln(1/0.9) = ${(dueInterval(S0)).toFixed(2)} days\n` +
        `capped gap   max(${CONFIG.minIntervalDays}, min(normal, ${CONFIG.exam.capFraction}·days left))\n` +
        `reviews before exam: ${capped.length} with cap, ${plain.length} without\n` +
        `gaps (days): ${gaps.map((g) => g.toFixed(2)).join(', ') || '—'}`),
    );
  };

  const el = section('03', 'Exam mode caps the gap',
    prose(r`With an exam set, the gap after a review at time $t_r$ is capped at a fraction of the time left:
$$\Delta t = \max\!\Big(${CONFIG.minIntervalDays},\ \min\big(S\ln\tfrac{1}{R^*},\ ${CONFIG.exam.capFraction}\,(t_{\text{exam}} - t_r)\big)\Big)\text{ days}.$$
The floor of ${CONFIG.minIntervalDays} day matters: without it, reviewing at $t_r$ schedules the next review at $t_r + 0.2(t_{\text{exam}} - t_r)$, so the time left shrinks by a factor of 0.8 each time and you'd need infinitely many reviews before the exam (a geometric series, just like Zeno). In the final ${CONFIG.exam.finalWindowDays} days, any card not seen since the window opened is due immediately. A well-known card (large $S$) answered "Got it" every time:`),
    h('div', { class: 'controls' },
      slider('days to exam', { min: 3, max: 60, step: 1, value: days }, (v) => `${v} d`, (v) => { days = v; draw(); }),
      slider('stability S', { min: 1, max: 200, step: 1, value: S0 }, (v) => `${v} d`, (v) => { S0 = v; draw(); }),
    ),
    box, out,
  );
  draw();
  return el;
}

// ---------- 4–5. Least squares & power law ----------

function fittingSections(): HTMLElement[] {
  let trueModel: 'exp' | 'pow' = 'exp';
  let trueS = 5;
  let n = 80;
  let seed = 7;
  let useMine = false;
  let measure: 'noise' | 'ratings' = 'noise';
  const mine = reviewsToPoints(state.reviews);

  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const generate = (): Point[] => {
    const s0 = seed;
    const pts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const t = 0.1 + rnd() * 3 * trueS;
      const p = trueModel === 'exp' ? Math.exp(-t / trueS) : powerRecall(t, trueS / 4, 0.9);
      if (measure === 'noise') {
        // Idealized: the true recall with multiplicative log-normal noise.
        const g = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
        pts.push({ t, r: Math.min(1, Math.max(0.02, p * Math.exp(0.18 * g))) });
      } else {
        // Realistic: each review only records a rating.
        const u = rnd();
        const rating: Rating = u < p ? 'got' : u < p + (1 - p) * 0.45 ? 'shaky' : 'missed';
        pts.push({ t, r: CONFIG.recallValue[rating] });
      }
    }
    seed = s0;
    return pts;
  };

  const lsBox = h('div', {});
  const lsCalc = h('div', {});
  const powBox = h('div', {});

  const draw = () => {
    const pts = useMine && mine.length ? mine : generate();
    const exp = fitExponential(pts);
    const pow = pts.length >= 4 ? fitPowerLaw(pts) : null;

    // Section 4 plot: data, fitted exponential, and (for synthetic data) the true curve.
    const T = Math.max(...pts.map((p) => p.t), 1) * 1.05;
    const plot = makePlot({ width: 600, height: 260, x: [0, T], y: [0, 1.05], xLabel: 'days since previous review', yFormat: (v) => pct(Math.min(1, v)) });
    if (!(useMine && mine.length)) {
      plot.line(sample((t) => (trueModel === 'exp' ? Math.exp(-t / trueS) : powerRecall(t, trueS / 4, 0.9)), 0, T), 'curve faint');
    }
    for (const p of pts) plot.layer.append(svg('circle', { cx: plot.x(p.t), cy: plot.y(p.r), r: 4, class: 'obs' }));
    if (exp) plot.line(sample((t) => Math.exp(-t / exp.S), 0, T), 'curve a');
    lsBox.replaceChildren(
      h('div', { class: 'legend' },
        h('span', {}, h('i', { class: 'swatch obs' }), useMine && mine.length ? 'your reviews' : measure === 'noise' ? 'simulated recall + noise' : 'simulated ratings (1 / 0.6 / 0.1)'),
        h('span', {}, h('i', { class: 'swatch a' }), 'least-squares fit'),
        !(useMine && mine.length) ? h('span', {}, h('i', { class: 'swatch faint' }), 'true curve') : ''),
      plot.el,
    );

    const usable = pts.filter((p) => p.t > 0 && p.r > 0);
    const stt = usable.reduce((a, p) => a + p.t * p.t, 0);
    const sty = usable.reduce((a, p) => a + p.t * Math.log(p.r), 0);
    lsCalc.replaceChildren(h('div', { class: 'calc' },
      `n          = ${usable.length}\n` +
      `Σ t²       = ${stt.toFixed(3)}\n` +
      `Σ t·ln r   = ${sty.toFixed(3)}\n` +
      `k = −Σt ln r / Σt² = ${(-sty / stt).toFixed(5)}\n` +
      (exp
        ? `S = 1/k    = ${exp.S.toFixed(3)} days\nhalf-life  = S·ln 2 = ${exp.halfLife.toFixed(3)} days\nRMSE (R)   = ${pct(exp.rmse)}`
        : 'k ≤ 0: no forgetting observed, so S is unbounded')));

    powBox.replaceChildren(
      exp ? recallChart(exp, pow, pts, useMine && mine.length ? 'Your reviews' : 'Simulated data') : h('p', { class: 'text-2' }, 'Not enough forgetting in this data to fit.'),
      exp && pow
        ? h('div', { class: 'calc' },
            `exponential   S = ${exp.S.toFixed(3)}                  RMSE ${pct(exp.rmse)}\n` +
            `power law     a = ${pow.a < 1000 ? pow.a.toFixed(3) : pow.a.toExponential(2)}, b = ${pow.b.toFixed(3)}   RMSE ${pct(pow.rmse)}\n` +
            `b/a = ${(pow.b / pow.a).toFixed(4)}   vs   1/S = ${(1 / exp.S).toFixed(4)}`)
        : '',
    );
  };

  const modeBar = h('div', { class: 'presets' });
  const drawModes = () => modeBar.replaceChildren(
    h('button', { class: `filter${!useMine && trueModel === 'exp' ? ' on' : ''}`, onclick: () => { useMine = false; trueModel = 'exp'; drawModes(); draw(); } }, 'Simulate: exponential'),
    h('button', { class: `filter${!useMine && trueModel === 'pow' ? ' on' : ''}`, onclick: () => { useMine = false; trueModel = 'pow'; drawModes(); draw(); } }, 'Simulate: power law'),
    h('button', { class: `filter${useMine ? ' on' : ''}`, disabled: mine.length < 2, title: mine.length < 2 ? 'Review some cards twice first' : '', onclick: () => { useMine = true; drawModes(); draw(); } }, `My reviews (${mine.length})`),
    h('button', { class: 'btn sm ghost', onclick: () => { seed = (seed * 7919 + 13) >>> 0; draw(); } }, 'Resample'),
  );
  const measureBar = h('div', { class: 'presets' });
  const drawMeasure = () => measureBar.replaceChildren(
    h('span', { class: 'small text-2', style: 'align-self:center;margin-right:4px' }, 'Measurements:'),
    h('button', { class: `filter${measure === 'noise' ? ' on' : ''}`, onclick: () => { measure = 'noise'; drawMeasure(); draw(); } }, 'Exact recall + noise'),
    h('button', { class: `filter${measure === 'ratings' ? ' on' : ''}`, onclick: () => { measure = 'ratings'; drawMeasure(); draw(); } }, 'Ratings only'),
  );
  drawMeasure();
  drawModes();

  const s4 = section('04', 'Fitting your forgetting rate (least squares)',
    prose(r`Every review is stored with $t$ = days since the card's previous review and an observed recall $r$ (Got it $= ${CONFIG.recallValue.got}$, Shaky $= ${CONFIG.recallValue.shaky}$, Missed $= ${CONFIG.recallValue.missed}$). Taking logs of $r \approx e^{-t/S}$ gives a line through the origin, $\ln r = -k\,t$ with $k = 1/S$. Minimizing the squared error
$$E(k) = \sum_i (\ln r_i + k\,t_i)^2,\qquad E'(k) = 2\sum_i t_i(\ln r_i + k\,t_i) = 0$$
gives the closed form
$$k = -\frac{\sum_i t_i\ln r_i}{\sum_i t_i^2},\qquad S = \frac1k,\qquad t_{1/2} = S\ln 2.$$
Insights shows this half-life per deck. Here it is on simulated data (or your own reviews):`),
    modeBar,
    measureBar,
    h('div', { class: 'controls' },
      slider('true S', { min: 1, max: 30, step: 0.5, value: trueS }, (v) => `${v} d`, (v) => { trueS = v; draw(); }),
      slider('reviews', { min: 4, max: 200, step: 1, value: n }, (v) => String(v), (v) => { n = v; draw(); }),
    ),
    lsBox, lsCalc,
  );
  const s5 = section('05', 'Exponential vs. power law',
    prose(r`Real forgetting often drops fast and then levels off, which a power law captures better:
$$R(t) = \left(1 + \frac ta\right)^{-b}\quad\Longrightarrow\quad \ln R = -b\,\ln\!\left(1 + \frac ta\right).$$
For a fixed $a$ this is again a line through the origin in $x = \ln(1 + t/a)$, so $b = -\sum x_i\ln r_i / \sum x_i^2$ is exact; Recall then searches over $a$ (a log-spaced grid followed by golden-section refinement). As $a \to \infty$ with $b/a \to 1/S$, $(1 + t/a)^{-b} \to e^{-t/S}$: the exponential is a limiting case, so the power law never fits worse in log space. The two are compared by RMS error in $R$. Because each review only records one of three recall levels, small data sets give noisy fits (sometimes with extreme $a$); the comparison gets meaningful as reviews accumulate. Switch the simulation to "power law" to see it win:`),
    powBox,
  );
  draw();
  return [s4, s5];
}

// ---------- Constants ----------

function constantsSection(): HTMLElement {
  return section('06', 'All the constants', h('div', { class: 'calc' },
    `initialStability     ${CONFIG.initialStability} day\n` +
    `targetRetention      ${CONFIG.targetRetention}\n` +
    `multipliers          got ×${CONFIG.stabilityMultiplier.got}, shaky ×${CONFIG.stabilityMultiplier.shaky}, missed ×${CONFIG.stabilityMultiplier.missed}\n` +
    `minStability         ${CONFIG.minStability} day\n` +
    `masteredStability    ${CONFIG.masteredStability} days\n` +
    `newCardsPerDay       ${CONFIG.newCardsPerDay}\n` +
    `exam.capFraction     ${CONFIG.exam.capFraction}\n` +
    `studyDayStartHour    ${CONFIG.studyDayStartHour} (4 am rollover)\n` +
    `minIntervalDays      ${CONFIG.minIntervalDays} day\n` +
    `exam.finalWindowDays ${CONFIG.exam.finalWindowDays}\n` +
    `recallValue          got ${CONFIG.recallValue.got}, shaky ${CONFIG.recallValue.shaky}, missed ${CONFIG.recallValue.missed}`),
    h('p', { class: 'panel-note' }, 'Edit src/config.ts to tune any of these; the scheduler, Insights and this page all read from it.'),
  );
}
