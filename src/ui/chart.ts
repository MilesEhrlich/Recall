import { CONFIG } from '../config';
import type { ExpFit, Point } from '../fit/exponential';
import { powerRecall, type PowerFit } from '../fit/powerLaw';
import { h } from './dom';
import { pct } from './format';

const NS = 'http://www.w3.org/2000/svg';
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function niceTicks(max: number, count = 5): number[] {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw)!;
  const ticks: number[] = [];
  for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/**
 * Forgetting curves fitted to your reviews: the exponential (solid) and, when
 * available, the power law (dashed), over the observed review points.
 */
export function recallChart(exp: ExpFit, pow: PowerFit | null, points: Point[], obsLabel = 'Your reviews'): HTMLElement {
  const W = 600, H = 300, L = 40, R = 12, T = 16, B = 36;
  const tMax = Math.max(3 * exp.S, ...points.map((p) => p.t)) * 1.02;
  const xTicks = niceTicks(tMax);
  const xMax = xTicks[xTicks.length - 1];
  const x = (t: number) => L + (t / xMax) * (W - L - R);
  const y = (r: number) => T + (1 - r) * (H - T - B);

  const curves = [
    { key: 'exp', label: 'Exponential', f: (t: number) => Math.exp(-t / exp.S) },
    ...(pow ? [{ key: 'pow', label: 'Power law', f: (t: number) => powerRecall(t, pow.a, pow.b) }] : []),
  ];

  const svg = s('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img',
    'aria-label': `Forgetting curve fitted to ${points.length} reviews. Exponential half-life ${exp.halfLife.toFixed(1)} days.`,
  });

  for (const r of [0, 0.25, 0.5, 0.75, 1]) {
    svg.append(
      s('line', { x1: L, x2: W - R, y1: y(r), y2: y(r), class: r === 0 ? 'axis' : 'grid' }),
      s('text', { x: L - 6, y: y(r) + 3.5, 'text-anchor': 'end', class: 'tick' }, pct(r)),
    );
  }
  for (const t of xTicks) {
    svg.append(s('text', { x: x(t), y: H - B + 15, 'text-anchor': 'middle', class: 'tick' }, String(t)));
  }
  svg.append(s('text', { x: (L + W - R) / 2, y: H - 3, 'text-anchor': 'middle', class: 'tick' }, 'days since last review'));

  const target = CONFIG.targetRetention;
  svg.append(
    s('line', { x1: L, x2: W - R, y1: y(target), y2: y(target), class: 'ref' }),
    s('text', { x: W - R, y: y(target) - 5, 'text-anchor': 'end', class: 'tick' }, `target ${pct(target)}`),
  );

  for (const p of points) {
    const c = s('circle', { cx: x(p.t), cy: y(p.r), r: 4, class: 'obs' });
    c.append(s('title', {}, `${p.t.toFixed(2)} days → recall ${pct(p.r)}`));
    svg.append(c);
  }

  const N = 100;
  for (const c of curves) {
    let d = '';
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * xMax;
      d += `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(c.f(t)).toFixed(1)}`;
    }
    svg.append(s('path', { d, class: `curve ${c.key}` }));
  }

  // Hover / touch crosshair
  const cross = s('line', { y1: T, y2: H - B, class: 'cross', visibility: 'hidden' });
  const dots = curves.map((c) => s('circle', { r: 4.5, class: `cross-dot ${c.key}`, visibility: 'hidden' }));
  svg.append(cross, ...dots);
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const wrap = h('div', { class: 'chart-wrap' }, svg, tip);

  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
    tip.hidden = true;
  };
  const move = (e: PointerEvent) => {
    const box = svg.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    if (vx < L || vx > W - R) return hide();
    const t = ((vx - L) / (W - L - R)) * xMax;
    cross.setAttribute('x1', String(vx));
    cross.setAttribute('x2', String(vx));
    cross.setAttribute('visibility', 'visible');
    curves.forEach((c, i) => {
      dots[i].setAttribute('cx', String(vx));
      dots[i].setAttribute('cy', String(y(c.f(t))));
      dots[i].setAttribute('visibility', 'visible');
    });
    tip.replaceChildren(
      h('div', { class: 'chart-tip-title' }, `${t < 10 ? t.toFixed(1) : Math.round(t)} days`),
      ...curves.map((c) => h('div', { class: 'chart-tip-row' }, h('i', { class: `swatch ${c.key}` }), `${c.label} ${pct(c.f(t))}`)),
    );
    tip.hidden = false;
    const px = (vx / W) * box.width;
    tip.style.left = `${Math.min(Math.max(px, 70), box.width - 70)}px`;
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', hide);

  const legend = h('div', { class: 'legend' },
    curves.map((c) => h('span', {}, h('i', { class: `swatch ${c.key}` }), c.label)),
    h('span', {}, h('i', { class: 'swatch obs' }), obsLabel),
  );
  return h('figure', { class: 'figure' }, legend, wrap);
}
