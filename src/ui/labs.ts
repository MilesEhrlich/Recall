import { eigenvalues, equilibria, picardIterates, rk4Path, shoot, spring, type Pt, type Stability } from '../labs/numerics';
import { h } from './dom';
import { icon } from './icons';
import { mathBlock } from './math';
import { makePlot, sample, svg } from './plot';

// ---------- Shared widgets ----------

function slider(label: string, opts: { min: number; max: number; step: number; value: number }, fmt: (v: number) => string, onInput: (v: number) => void) {
  const out = h('output', {}, fmt(opts.value));
  const input = h('input', {
    type: 'range', min: opts.min, max: opts.max, step: opts.step, value: opts.value, 'aria-label': label,
    oninput: () => { const v = parseFloat(input.value); out.textContent = fmt(v); onInput(v); },
  });
  return { el: h('div', { class: 'slider' }, h('label', {}, label), input, out), input, set: (v: number) => { input.value = String(v); out.textContent = fmt(v); } };
}

function readout(rows: [string, string | Node][]): HTMLElement {
  return h('dl', { class: 'readout' }, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
}

function panel(title: string, ...children: (Node | string)[]): HTMLElement {
  return h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('strong', {}, title)), ...children);
}

const STAB_LABEL: Record<Stability, string> = { stable: 'stable', unstable: 'unstable', semi: 'semi-stable (counts as unstable)' };
const n3 = (v: number) => (Math.abs(v) < 1e-9 ? '0' : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(3));

interface Lab {
  id: string;
  title: string;
  source: string;
  blurb: string;
  thumb: string;
  render: (stage: HTMLElement, side: HTMLElement) => () => void;
}

// ---------- 1. Slope fields ----------

interface FieldPreset {
  label: string;
  tex: string;
  source: string;
  f: (t: number, y: number) => number;
  /** Set for autonomous equations: y' = g(y). */
  g?: (y: number) => number;
  t: [number, number];
  y: [number, number];
  demo: Pt[];
  note: string;
}

const FIELD_PRESETS: FieldPreset[] = [
  {
    label: '−y(y−2)', tex: String.raw`\dfrac{dy}{dt} = -y(y-2)`, source: '§1.3', f: (_, y) => -y * (y - 2), g: (y) => -y * (y - 2),
    t: [-2, 4], y: [-2, 4], demo: [[0, 0.5], [0, 3.5], [0, -0.15], [-2, 1.2]],
    note: 'If y(t₀) > 0, y(t) → 2. If y(t₀) < 0, y(t) ↘ −∞ (in finite time: y(0) = −1 exists only for t < ½ ln 3).',
  },
  {
    label: '2yt', tex: String.raw`\dfrac{dy}{dt} = 2yt`, source: '§1.1', f: (t, y) => 2 * y * t,
    t: [-2, 2], y: [-3, 3], demo: [[0, 0.2], [0, -0.2], [0, 0.05]],
    note: 'Solutions are y = Ce^{t²}: every curve is a scaled copy of e^{t²}.',
  },
  {
    label: 'Logistic', tex: String.raw`\dfrac{dP}{dt} = 0.6P(4-P)`, source: '§2.1', f: (_, P) => 0.6 * P * (4 - P), g: (P) => 0.6 * P * (4 - P),
    t: [0, 5], y: [-1, 6], demo: [[0, 0.3], [0, 1], [0, 5.5]],
    note: 'Any P₀ > 0 tends to the carrying capacity M = 4.',
  },
  {
    label: 'Cooling', tex: String.raw`\dfrac{dT}{dt} = -0.5(T - 20)`, source: '§1.5 · §2.2', f: (_, T) => -0.5 * (T - 20), g: (T) => -0.5 * (T - 20),
    t: [0, 10], y: [0, 40], demo: [[0, 38], [0, 5], [0, 28]],
    note: 'Every T₀ approaches the room temperature A = 20, the unique (stable) equilibrium.',
  },
  {
    label: 'P(4−P)(P−1)', tex: String.raw`\dfrac{dP}{dt} = P(4-P)(P-1)`, source: '§2.2', f: (_, P) => P * (4 - P) * (P - 1), g: (P) => P * (4 - P) * (P - 1),
    t: [0, 3], y: [-1, 5], demo: [[0, 0.9], [0, 1.1], [0, 4.6], [0, -0.6]],
    note: '0 and 4 are stable, 1 is unstable: P → 4 if P₀ > 1, P → 0 if P₀ < 1.',
  },
  {
    label: 'Doomsday', tex: String.raw`\dfrac{dP}{dt} = 0.6P(P-4)`, source: '§2.1', f: (_, P) => 0.6 * P * (P - 4), g: (P) => 0.6 * P * (P - 4),
    t: [0, 3], y: [-1, 8], demo: [[0, 3.8], [0, 4.2], [0, 1]],
    note: 'P₀ < 4 dies out; P₀ > 4 blows up at t = ln(P₀/(P₀−4))/2.4.',
  },
];

let fieldPreset = 0;

function slopeFieldLab(stage: HTMLElement, side: HTMLElement): () => void {
  let curves: Pt[][] = [];
  let last: Pt | null = null;
  const presetBar = h('div', { class: 'presets' });
  const info = h('div', {});
  const plotBox = h('div', {});

  const solve = (p: FieldPreset, t0: number, y0: number): Pt[] => {
    const lim = 50 * (p.y[1] - p.y[0]);
    const fwd = rk4Path(p.f, t0, y0, p.t[1], 400, lim);
    const back = rk4Path(p.f, t0, y0, p.t[0], 400, lim);
    return [...back.reverse(), ...fwd.slice(1)];
  };

  const draw = () => {
    const p = FIELD_PRESETS[fieldPreset];
    const plot = makePlot({ width: 600, height: 420, x: p.t, y: p.y, xLabel: 't', zeroAxes: true });
    plot.el.setAttribute('aria-label', `Slope field of ${p.label}. Tap to draw a solution curve.`);
    // Slope segments, equal length in screen space.
    const nx = 24, ny = 17;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const t = p.t[0] + ((i + 0.5) / nx) * (p.t[1] - p.t[0]);
        const y = p.y[0] + ((j + 0.5) / ny) * (p.y[1] - p.y[0]);
        const s = p.f(t, y);
        const dx = plot.x(t + 1) - plot.x(t);
        const dy = plot.y(y + s) - plot.y(y);
        const len = Math.hypot(dx, dy) || 1;
        const L = 8;
        const cx = plot.x(t), cy = plot.y(y);
        plot.layer.append(svg('line', { x1: cx - (dx / len) * L, y1: cy - (dy / len) * L, x2: cx + (dx / len) * L, y2: cy + (dy / len) * L, class: 'slope' }));
      }
    }
    const eqs = p.g ? equilibria(p.g, p.y[0], p.y[1]) : [];
    for (const e of eqs) {
      plot.layer.append(svg('line', { x1: plot.m.l, x2: plot.W - plot.m.r, y1: plot.y(e.c), y2: plot.y(e.c), class: `eq-line ${e.type}` }));
    }
    curves.forEach((c, i) => plot.line(c, i === curves.length - 1 ? 'sol' : 'sol old'));
    if (last) plot.layer.append(svg('circle', { cx: plot.x(last[0]), cy: plot.y(last[1]), r: 5, class: 'marker' }));
    plot.el.style.cursor = 'crosshair';
    plot.el.addEventListener('pointerdown', (e) => {
      const [t, y] = plot.toData(e);
      if (t < p.t[0] || t > p.t[1] || y < p.y[0] || y > p.y[1]) return;
      last = [t, y];
      curves = [...curves.slice(-7), solve(p, t, y)];
      draw();
    });
    plotBox.replaceChildren(plot.el);

    presetBar.replaceChildren(...FIELD_PRESETS.map((q, i) =>
      h('button', { class: `filter${i === fieldPreset ? ' on' : ''}`, onclick: () => { fieldPreset = i; reset(); } }, q.label)));
    info.replaceChildren(
      panel('Equation', mathBlock(`$$${p.tex}$$`, 'math formula'), h('p', { class: 'hint' }, `From ${p.source}. ${p.note}`)),
      panel('Readout',
        readout([
          ['point', last ? `(${n3(last[0])}, ${n3(last[1])})` : 'tap the field'],
          ['slope f(t,y)', last ? n3(p.f(last[0], last[1])) : '—'],
          ...(p.g ? [['equilibria', eqs.length ? '' : 'none'] as [string, string]] : []),
        ]),
        p.g && eqs.length
          ? h('div', { class: 'stack', style: 'gap:4px;margin-top:6px' },
              eqs.map((e) => h('div', { class: 'inline small' },
                h('span', { class: `chip ${e.type === 'stable' ? 'good' : 'warn'}` }, `y = ${n3(e.c)}`), STAB_LABEL[e.type])))
          : '',
        h('div', { class: 'inline', style: 'margin-top:12px' },
          h('button', { class: 'btn sm', onclick: () => { curves = []; last = null; draw(); } }, 'Clear curves'),
        ),
      ),
    );
  };
  const reset = () => {
    const p = FIELD_PRESETS[fieldPreset];
    curves = p.demo.map(([t, y]) => solve(p, t, y));
    last = null;
    draw();
  };

  stage.append(presetBar, plotBox, h('p', { class: 'hint' }, 'Tap or click anywhere to draw the solution curve through that point. Dashed lines are equilibria: green = stable, red = unstable.'));
  side.append(info);
  reset();
  return () => {};
}

// ---------- 2. Harvesting & bifurcation ----------

function harvestLab(stage: HTMLElement, side: HTMLElement): () => void {
  let hv = 3;
  const plots = h('div', { class: 'stack' });
  const info = h('div', {});
  const g = (P: number) => P * (4 - P) - hv;

  const draw = () => {
    // Bifurcation diagram (c vs h)
    const bif = makePlot({ width: 560, height: 260, x: [0, 5], y: [-1, 5], xLabel: 'harvest h', zeroAxes: true });
    const hs = Array.from({ length: 201 }, (_, i) => (4 * i) / 200);
    bif.line(hs.map((x) => [x, 2 + Math.sqrt(Math.max(0, 4 - x))]), 'curve c');
    bif.line(hs.map((x) => [x, 2 - Math.sqrt(Math.max(0, 4 - x))]), 'curve b');
    bif.layer.append(svg('line', { x1: bif.x(hv), x2: bif.x(hv), y1: bif.m.t, y2: bif.H - bif.m.b, class: 'ref' }));
    const eqs = equilibria(g, -2, 7);
    for (const e of eqs) {
      bif.layer.append(svg('circle', { cx: bif.x(hv), cy: bif.y(e.c), r: 5, class: e.type === 'stable' ? 'dot-stable' : e.type === 'semi' ? 'dot-semi' : 'dot-unstable' }));
    }
    bif.el.append(svg('text', { x: bif.x(4) + 4, y: bif.y(2) - 6, class: 'label' }, 'h = 4'));

    // Solutions for the current h
    const sol = makePlot({ width: 560, height: 280, x: [0, 4], y: [-1, 6], xLabel: 't', zeroAxes: true });
    for (const e of eqs) sol.layer.append(svg('line', { x1: sol.m.l, x2: sol.W - sol.m.r, y1: sol.y(e.c), y2: sol.y(e.c), class: `eq-line ${e.type}` }));
    for (const P0 of [0.3, 0.8, 1.3, 2, 2.8, 3.6, 4.6, 5.6]) sol.line(rk4Path((_, P) => g(P), 0, P0, 4, 300, 50), 'sol');

    plots.replaceChildren(
      h('div', {}, h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'swatch c' }), 'C₁ = 2 + √(4−h), stable'), h('span', {}, h('i', { class: 'swatch b' }), 'C₂ = 2 − √(4−h), unstable')), bif.el),
      h('div', {}, h('div', { class: 'legend' }, h('span', {}, `Solutions of P' = P(4−P) − ${hv.toFixed(2)} from several P₀`)), sol.el),
    );
    const verdict = hv < 4 ? 'P → C₁ (if P₀ > C₂) or P ↘ −∞' : hv === 4 ? 'one critical value c = 2, unstable' : 'no critical value: P ↘ −∞ (collapse)';
    info.replaceChildren(
      panel('Model', mathBlock(String.raw`$$\frac{dP}{dt} = P(4-P) - h$$`, 'math formula'),
        h('p', { class: 'hint' }, 'h: amount of fish removed by fishing/year (§2.2). Critical points solve P² − 4P + h = 0, so c = 2 ± √(4−h) ⇔ (c−2)² = 4 − h.')),
      panel('Readout', readout([
        ['h', hv.toFixed(2)],
        ['C₁ (stable)', hv <= 4 ? n3(2 + Math.sqrt(4 - hv)) : '—'],
        ['C₂ (unstable)', hv < 4 ? n3(2 - Math.sqrt(4 - hv)) : '—'],
        ['long run', verdict],
      ])),
    );
  };
  const s = slider('harvest h', { min: 0, max: 5, step: 0.05, value: hv }, (v) => v.toFixed(2), (v) => { hv = Math.abs(v - 4) < 0.026 ? 4 : v; draw(); });
  stage.append(h('div', { class: 'controls' }, s.el), plots, h('p', { class: 'hint' }, 'Drag h past 4 and watch the two equilibria merge and vanish: that is the bifurcation.'));
  side.append(info);
  draw();
  return () => {};
}

// ---------- 3. Picard iteration ----------

const PICARD = [
  { label: "y' = y", tex: String.raw`y' = y,\ y(0) = 1`, f: (_: number, y: number) => y, b: 1, T: 2, exact: (t: number) => Math.exp(t), exactTex: 'y = e^t', yr: [0, 8] as [number, number] },
  { label: "y' = 2ty", tex: String.raw`y' = 2ty,\ y(0) = 1`, f: (t: number, y: number) => 2 * t * y, b: 1, T: 1.3, exact: (t: number) => Math.exp(t * t), exactTex: 'y = e^{t^2}', yr: [0, 6] as [number, number] },
  { label: "y' = t sin(ty)", tex: String.raw`y' = t\sin(ty),\ y(0) = 1`, f: (t: number, y: number) => t * Math.sin(t * y), b: 1, T: 2, exact: null, exactTex: 'RK4 reference', yr: [0.5, 2.5] as [number, number] },
];
let picardPreset = 0;

function picardLab(stage: HTMLElement, side: HTMLElement): () => void {
  let n = 3;
  const presetBar = h('div', { class: 'presets' });
  const plotBox = h('div', {});
  const info = h('div', {});

  const draw = () => {
    const p = PICARD[picardPreset];
    const { t, ys } = picardIterates(p.f, 0, p.b, p.T, n, 400);
    const ref = p.exact
      ? t.map((x) => p.exact!(x))
      : (() => { const path = rk4Path(p.f, 0, p.b, p.T, 400); return path.map((q) => q[1]); })();
    const plot = makePlot({ width: 600, height: 380, x: [0, p.T], y: p.yr, xLabel: 't' });
    plot.line(t.map((x, i) => [x, ref[i]]), 'curve c');
    ys.forEach((yk, k) => plot.line(t.map((x, i) => [x, yk[i]]), k === n ? 'curve a' : 'curve faint'));
    plotBox.replaceChildren(
      h('div', { class: 'legend' },
        h('span', {}, h('i', { class: 'swatch c' }), p.exact ? `exact ${p.label === "y' = y" ? 'eᵗ' : 'e^(t²)'}` : 'RK4 reference'),
        h('span', {}, h('i', { class: 'swatch a' }), `y${sub(n)}(t)`),
        h('span', {}, h('i', { class: 'swatch faint' }), 'earlier iterates')),
      plot.el,
    );
    const errs = ys.map((yk) => Math.max(...yk.map((v, i) => Math.abs(v - ref[i]))));
    presetBar.replaceChildren(...PICARD.map((q, i) => h('button', { class: `filter${i === picardPreset ? ' on' : ''}`, onclick: () => { picardPreset = i; draw(); } }, q.label)));
    info.replaceChildren(
      panel('Iteration', mathBlock(String.raw`$$y_0(t) := b,\qquad y_{n+1}(t) := b + \int_a^t f(x, y_n(x))\,dx$$`, 'math formula'),
        mathBlock(`$$${p.tex}$$`, 'math formula')),
      panel('Max error on [0, T]', readout(errs.map((e, k) => [`y${sub(k)}`, k === n ? h('b', {}, e.toExponential(2)) : e.toExponential(2)] as [string, string | Node]))),
      h('p', { class: 'hint' }, 'The errors shrink like kⁿMTⁿ⁺¹/(n+1)!, the bound from Lecture 5, so yₙ ⇉ y uniformly.'),
    );
  };
  const s = slider('iterations n', { min: 0, max: 10, step: 1, value: n }, (v) => String(v), (v) => { n = v; draw(); });
  stage.append(presetBar, h('div', { class: 'controls' }, s.el), plotBox);
  side.append(info);
  draw();
  return () => {};
}

const sub = (k: number) => String(k).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('');

// ---------- 4. Spring–mass ----------

function springLab(stage: HTMLElement, side: HTMLElement): () => void {
  const P = { m: 1, c: 0.6, k: 9, y0: 1, v0: 0 };
  const T = 10;
  const plotBox = h('div', {});
  const anim = svg('svg', { viewBox: '0 0 600 90', class: 'plot', role: 'img', 'aria-label': 'Animated spring and mass' });
  const info = h('div', {});
  let sol = spring(P.m, P.c, P.k, P.y0, P.v0);
  let cursor: SVGCircleElement | null = null;
  let plotRef: ReturnType<typeof makePlot> | null = null;
  let raf = 0;
  let t0 = performance.now();
  let playing = true;

  const draw = () => {
    sol = spring(P.m, P.c, P.k, P.y0, P.v0);
    const pts = sample(sol.y, 0, T, 500);
    const peak = Math.max(0.5, ...pts.map(([, v]) => Math.abs(v))) * 1.15;
    const plot = makePlot({ width: 600, height: 300, x: [0, T], y: [-peak, peak], xLabel: 't (s)', zeroAxes: true });
    if (sol.regime === 'underdamped' || sol.regime === 'undamped') {
      const amp = sol.regime === 'undamped' ? sol.amplitude! : Math.hypot(P.y0, (P.v0 + sol.p * P.y0) / sol.w1!);
      plot.line(sample((t) => amp * Math.exp(-sol.p * t), 0, T), 'curve faint');
      plot.line(sample((t) => -amp * Math.exp(-sol.p * t), 0, T), 'curve faint');
    }
    plot.line(pts, 'curve a');
    cursor = svg('circle', { r: 5, class: 'marker' });
    plot.layer.append(cursor);
    plotRef = plot;
    plotBox.replaceChildren(plot.el);

    const regimeChip = { undamped: 'chip accent', underdamped: 'chip accent', critical: 'chip good', overdamped: 'chip warn' }[sol.regime];
    const formula = {
      undamped: String.raw`$$y = A\cos\omega_0t + B\sin\omega_0t = C\cos(\omega_0t - \alpha)$$`,
      underdamped: String.raw`$$y(t) = e^{-pt}(c_1\cos\omega_1t + c_2\sin\omega_1t),\quad \omega_1 = \sqrt{\omega_0^2 - p^2}$$`,
      critical: String.raw`$$y(t) = c_1e^{-pt} + c_2te^{-pt}$$`,
      overdamped: String.raw`$$y(t) = c_1e^{r_1t} + c_2e^{r_2t},\quad r_1, r_2 < 0$$`,
    }[sol.regime];
    info.replaceChildren(
      panel('Regime',
        h('div', { class: 'inline', style: 'margin-bottom:8px' }, h('span', { class: regimeChip }, sol.regime === 'critical' ? 'critical damping' : sol.regime),
          h('span', { class: 'small text-2' }, sol.regime === 'undamped' ? 'c = 0' : sol.regime === 'critical' ? 'p = ω₀' : sol.regime === 'overdamped' ? 'p > ω₀' : 'p < ω₀')),
        mathBlock(formula, 'math formula'),
      ),
      panel('Readout', readout([
        ['ω₀ = √(k/m)', n3(sol.w0)],
        ['p = c/2m', n3(sol.p)],
        ['roots r', sol.roots.join(', ')],
        ...(sol.regime === 'undamped'
          ? [['amplitude C', n3(sol.amplitude!)], ['period 2π/ω₀', n3((2 * Math.PI) / sol.w0)], ['frequency ω₀/2π', n3(sol.w0 / (2 * Math.PI))]] as [string, string][]
          : sol.regime === 'underdamped' ? [['ω₁', n3(sol.w1!)], ['quasi-period 2π/ω₁', n3((2 * Math.PI) / sol.w1!)]] as [string, string][] : []),
      ])),
    );
  };

  const drawSpring = (y: number) => {
    const x0 = 30, rest = 300, scale = 80;
    const xm = rest + y * scale;
    const coils = 14, amp = 10;
    let d = `M${x0},45`;
    for (let i = 1; i < coils; i++) d += `L${x0 + ((xm - 28 - x0) * i) / coils},${45 + (i % 2 ? -amp : amp)}`;
    d += `L${xm - 28},45`;
    anim.replaceChildren(
      svg('rect', { x: 0, y: 8, width: 30, height: 74, class: 'wall' }),
      svg('line', { x1: 0, x2: 600, y1: 82, y2: 82, class: 'axis' }),
      svg('line', { x1: rest, x2: rest, y1: 14, y2: 82, class: 'ref' }),
      svg('path', { d, class: 'spring' }),
      svg('rect', { x: xm - 28, y: 26, width: 56, height: 40, rx: 6, class: 'mass' }),
      svg('text', { x: xm, y: 51, 'text-anchor': 'middle', fill: 'var(--accent-ink)', 'font-size': 12, 'font-family': 'var(--font-mono)' }, `m=${P.m}`),
    );
  };

  const tick = (now: number) => {
    const t = playing ? ((now - t0) / 1000) % T : 0;
    const y = sol.y(t);
    drawSpring(Math.max(-3.4, Math.min(3.4, y)));
    if (cursor && plotRef) { cursor.setAttribute('cx', String(plotRef.x(t))); cursor.setAttribute('cy', String(plotRef.y(y))); }
    raf = requestAnimationFrame(tick);
  };

  const sliders = {
    m: slider('mass m', { min: 0.1, max: 5, step: 0.1, value: P.m }, (v) => v.toFixed(1), (v) => { P.m = v; restart(); }),
    c: slider('friction c', { min: 0, max: 12, step: 0.05, value: P.c }, (v) => v.toFixed(2), (v) => { P.c = v; restart(); }),
    k: slider('spring k', { min: 0.5, max: 60, step: 0.5, value: P.k }, (v) => v.toFixed(1), (v) => { P.k = v; restart(); }),
    y0: slider('y(0)', { min: -2, max: 2, step: 0.1, value: P.y0 }, (v) => v.toFixed(1), (v) => { P.y0 = v; restart(); }),
    v0: slider("y'(0)", { min: -10, max: 10, step: 0.5, value: P.v0 }, (v) => v.toFixed(1), (v) => { P.v0 = v; restart(); }),
  };
  const restart = () => { t0 = performance.now(); draw(); };
  const setAll = (q: Partial<typeof P>) => {
    Object.assign(P, q);
    (Object.keys(sliders) as (keyof typeof sliders)[]).forEach((k) => sliders[k].set(P[k]));
    restart();
  };
  const presets: [string, Partial<typeof P>][] = [
    ['Lecture: k=50, m=0.5', { m: 0.5, c: 0, k: 50, y0: 1, v0: -5 }],
    ['Undamped', { m: 1, c: 0, k: 9, y0: 1, v0: 0 }],
    ['Underdamped', { m: 1, c: 0.8, k: 9, y0: 1, v0: 0 }],
    ['Critical', { m: 1, c: 6, k: 9, y0: 1, v0: 0 }],
    ['Overdamped', { m: 1, c: 10, k: 9, y0: 1, v0: 0 }],
  ];

  stage.append(
    h('div', { class: 'presets' }, presets.map(([label, q]) => h('button', { class: 'filter', onclick: () => setAll(q) }, label))),
    anim,
    plotBox,
    h('div', { class: 'controls' }, Object.values(sliders).map((s) => s.el)),
    h('div', { class: 'inline' },
      h('button', { class: 'btn sm', onclick: (e: Event) => { playing = !playing; t0 = performance.now(); (e.currentTarget as HTMLElement).textContent = playing ? 'Pause' : 'Play'; } }, 'Pause'),
      h('span', { class: 'hint', style: 'margin:0' }, 'my″ + cy′ + ky = 0 · the dot traces y(t) on the graph'),
    ),
  );
  side.append(info);
  draw();
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// ---------- 5. Eigenvalues by shooting ----------

function eigenLab(stage: HTMLElement, side: HTMLElement): () => void {
  let lam = 3;
  let L = Math.PI;
  const plots = h('div', { class: 'stack' });
  const info = h('div', {});

  const draw = () => {
    const y = shoot(lam);
    const pts = sample(y, 0, L, 300);
    const peak = Math.max(1, ...pts.map(([, v]) => Math.abs(v))) * 1.15;
    const top = makePlot({ width: 600, height: 260, x: [0, L], y: [-peak, peak], xLabel: 't', zeroAxes: true });
    top.line(pts, 'curve a');
    const yL = y(L);
    const hit = Math.abs(yL) < 0.02 * peak;
    top.layer.append(svg('circle', { cx: top.x(L), cy: top.y(0), r: 7, fill: 'none', stroke: 'var(--green)', 'stroke-width': 2 }));
    top.layer.append(svg('circle', { cx: top.x(L), cy: top.y(yL), r: 5, class: hit ? 'dot-stable' : 'marker' }));

    const lamRange: [number, number] = [-10, 40];
    const F = (l: number) => shoot(l)(L);
    const fpts = sample(F, lamRange[0], lamRange[1], 600);
    const bot = makePlot({ width: 600, height: 200, x: lamRange, y: [-2, 2], xLabel: 'λ', zeroAxes: true });
    bot.line(fpts.map(([a, b]) => [a, Math.max(-2.5, Math.min(2.5, b))]), 'curve c');
    for (const ev of eigenvalues(L, 8).filter((v) => v <= lamRange[1])) {
      bot.layer.append(svg('line', { x1: bot.x(ev), x2: bot.x(ev), y1: bot.m.t, y2: bot.H - bot.m.b, class: 'ref' }));
    }
    bot.layer.append(svg('circle', { cx: bot.x(lam), cy: bot.y(Math.max(-2, Math.min(2, F(lam)))), r: 5, class: 'marker' }));

    plots.replaceChildren(
      h('div', {}, h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'swatch a' }), `y(t) with y(0)=0, y′(0)=1, λ = ${lam.toFixed(2)}`), h('span', {}, 'target: y(L) = 0')), top.el),
      h('div', {}, h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'swatch c' }), 'y(L) as a function of λ — zeros are the eigenvalues')), bot.el),
    );
    const evs = eigenvalues(L, 4);
    const n = evs.findIndex((v) => Math.abs(v - lam) < 0.03);
    info.replaceChildren(
      panel('Problem', mathBlock(String.raw`$$y'' + \lambda y = 0,\quad y(0) = 0,\ y(L) = 0$$`, 'math formula'),
        h('p', { class: 'hint' }, 'Shoot from t = 0 with slope 1 and adjust λ until the curve lands on y(L) = 0 (§3.8).')),
      panel('Readout', readout([
        ['λ', lam.toFixed(3)],
        ['L', L.toFixed(3)],
        ['case', lam > 0 ? 'λ > 0: sin' : lam < 0 ? 'λ < 0: sinh (never 0 again)' : 'λ = 0: y = t'],
        ['y(L)', n3(yL)],
        ['eigenvalue?', n >= 0 ? h('b', { class: 'accent-text' }, `yes: λ${sub(n + 1)} = ${n + 1}²π²/L²`) : 'no'],
      ]),
        h('div', { class: 'inline', style: 'margin-top:10px' }, evs.map((v, i) => h('button', { class: 'btn sm', onclick: () => { lam = v; s.set(v); draw(); } }, `λ${sub(i + 1)}`))),
      ),
    );
  };
  const s = slider('λ', { min: -10, max: 40, step: 0.01, value: lam }, (v) => v.toFixed(2), (v) => { lam = v; draw(); });
  const sL = slider('L', { min: 1, max: 6, step: 0.01, value: L }, (v) => v.toFixed(2), (v) => { L = v; draw(); });
  stage.append(h('div', { class: 'controls' }, s.el, sL.el), plots);
  side.append(info);
  draw();
  return () => {};
}

// ---------- Registry & screens ----------

const LABS: Lab[] = [
  {
    id: 'slope-field', title: 'Slope fields & solution curves', source: 'Lectures 1–2, 6–7 · §1.3, §2.1–2.2',
    blurb: 'Draw the slope at every point, then trace solution curves through any point you tap. Equilibria and their stability appear automatically.',
    thumb: thumbField(), render: slopeFieldLab,
  },
  {
    id: 'harvest', title: 'Harvesting & bifurcation', source: 'Lecture 7 · §2.2',
    blurb: 'The fish-in-a-lake model P′ = P(4−P) − h. Slide the harvest past h = 4 and watch the equilibria collide and disappear.',
    thumb: thumbBif(), render: harvestLab,
  },
  {
    id: 'picard', title: 'Picard iteration', source: 'Lecture 5 · Appendix 1',
    blurb: 'Build y₀, y₁, y₂, … by repeated integration and watch them converge uniformly to the solution.',
    thumb: thumbPicard(), render: picardLab,
  },
  {
    id: 'spring', title: 'Spring–mass vibrations', source: 'Lecture 10 · §3.4',
    blurb: 'An animated spring. Tune m, c, k to move between undamped, under-, critical and overdamping.',
    thumb: thumbSpring(), render: springLab,
  },
  {
    id: 'eigen', title: 'Eigenvalues by shooting', source: 'Lecture 11 · §3.8',
    blurb: 'Find the λ that make y″ + λy = 0, y(0) = y(L) = 0 have nonzero solutions: λₙ = n²π²/L².',
    thumb: thumbEigen(), render: eigenLab,
  },
];

export function renderLabs(root: HTMLElement): void {
  root.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, 'Labs'),
      h('h1', {}, 'Explore the equations'),
      h('p', { class: 'page-sub' }, 'Interactive versions of the examples from lecture. Everything is computed live in your browser.'),
    ),
    h('div', { class: 'lab-grid' },
      LABS.map((l) => {
        const thumb = h('div', { class: 'lab-thumb' });
        thumb.innerHTML = l.thumb;
        return h('a', { class: 'lab-card', href: `#/labs/${l.id}` },
          thumb,
          h('div', { class: 'lab-card-body' }, h('div', { class: 'source' }, l.source), h('b', {}, l.title), h('span', {}, l.blurb)));
      }),
    ),
  );
}

export function renderLab(root: HTMLElement, id: string): () => void {
  const lab = LABS.find((l) => l.id === id);
  if (!lab) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'Lab not found.'), h('a', { class: 'btn', href: '#/labs' }, 'All labs')));
    return () => {};
  }
  const stage = h('div', { class: 'lab-stage' });
  const side = h('div', { class: 'lab-side' });
  root.style.maxWidth = '1180px';
  root.append(
    h('nav', { class: 'topbar' }, h('a', { class: 'back-link', href: '#/labs' }, icon('chevron-left'), 'Labs')),
    h('header', { class: 'page-head' }, h('div', { class: 'eyebrow' }, lab.source), h('h1', {}, lab.title), h('p', { class: 'page-sub' }, lab.blurb)),
    h('div', { class: 'lab-layout' }, stage, side),
  );
  return lab.render(stage, side);
}

// ---------- Thumbnails (static SVG) ----------

function thumbField(): string {
  let s = '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">';
  for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) {
    const x = 10 + i * 17, y = 10 + j * 17, yy = 3 - j * 0.8;
    const a = Math.atan(-yy * (yy - 2) * 0.6);
    s += `<line x1="${x - 5 * Math.cos(a)}" y1="${y + 5 * Math.sin(a)}" x2="${x + 5 * Math.cos(a)}" y2="${y - 5 * Math.sin(a)}" class="slope"/>`;
  }
  return s + '<path d="M0 100 C 60 98, 80 40, 110 36 S 170 30, 200 30" class="sol"/></svg>';
}
function thumbBif(): string {
  return '<svg viewBox="0 0 200 120"><path d="M20 20 Q 120 40 150 62" class="curve c"/><path d="M20 104 Q 120 84 150 62" class="curve b"/><line x1="110" x2="110" y1="8" y2="114" class="ref"/><circle cx="110" cy="37" r="5" class="dot-stable"/><circle cx="110" cy="88" r="5" class="dot-unstable"/></svg>';
}
function thumbPicard(): string {
  return '<svg viewBox="0 0 200 120"><path d="M10 100 L190 100" class="curve faint"/><path d="M10 100 L190 55" class="curve faint"/><path d="M10 100 Q 100 85 190 35" class="curve faint"/><path d="M10 100 C 90 95 150 60 190 12" class="curve c"/><path d="M10 100 C 90 95 150 64 190 20" class="curve a"/></svg>';
}
function thumbSpring(): string {
  let d = 'M10 60';
  for (let x = 10; x <= 190; x += 2) d += ` L${x} ${60 - 40 * Math.exp(-(x - 10) / 70) * Math.cos((x - 10) / 9)}`;
  return `<svg viewBox="0 0 200 120"><line x1="10" x2="190" y1="60" y2="60" class="axis0"/><path d="${d}" class="curve a"/></svg>`;
}
function thumbEigen(): string {
  let d1 = 'M10 60', d2 = 'M10 60';
  for (let x = 10; x <= 190; x += 2) {
    d1 += ` L${x} ${60 - 35 * Math.sin(((x - 10) / 180) * Math.PI)}`;
    d2 += ` L${x} ${60 - 30 * Math.sin(((x - 10) / 180) * 3 * Math.PI)}`;
  }
  return `<svg viewBox="0 0 200 120"><line x1="10" x2="190" y1="60" y2="60" class="axis0"/><path d="${d1}" class="curve a"/><path d="${d2}" class="curve c"/></svg>`;
}
