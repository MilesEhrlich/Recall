// Minimal SVG plotting helper used by the labs and The Math page.

const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

export function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

function fmtTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${v / 1000}k`;
  return String(Math.round(v * 1000) / 1000);
}

export interface PlotOptions {
  width?: number;
  height?: number;
  x: [number, number];
  y: [number, number];
  xLabel?: string;
  yLabel?: string;
  margin?: { l: number; r: number; t: number; b: number };
  yFormat?: (v: number) => string;
  /** Draw the t- and y-axes through zero when in range. */
  zeroAxes?: boolean;
}

export interface Plot {
  el: SVGSVGElement;
  W: number;
  H: number;
  m: { l: number; r: number; t: number; b: number };
  x: (v: number) => number;
  y: (v: number) => number;
  /** Pixel → data coordinates for a pointer event. */
  toData: (e: { clientX: number; clientY: number }) => [number, number];
  layer: SVGGElement;
  line: (pts: [number, number][], cls: string) => SVGPathElement;
  clear: () => void;
}

export function makePlot(o: PlotOptions): Plot {
  const W = o.width ?? 560, H = o.height ?? 340;
  const m = o.margin ?? { l: 40, r: 12, t: 12, b: 34 };
  const [x0, x1] = o.x, [y0, y1] = o.y;
  const x = (v: number) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const el = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot', role: 'img' });

  for (const t of niceTicks(y0, y1)) {
    el.append(
      svg('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }),
      svg('text', { x: m.l - 6, y: y(t) + 3.5, 'text-anchor': 'end', class: 'tick' }, o.yFormat ? o.yFormat(t) : fmtTick(t)),
    );
  }
  for (const t of niceTicks(x0, x1, 6)) {
    el.append(
      svg('line', { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, class: 'grid' }),
      svg('text', { x: x(t), y: H - m.b + 14, 'text-anchor': 'middle', class: 'tick' }, fmtTick(t)),
    );
  }
  el.append(svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'none', class: 'axis' }));
  if (o.zeroAxes) {
    if (y0 < 0 && y1 > 0) el.append(svg('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'axis0' }));
    if (x0 < 0 && x1 > 0) el.append(svg('line', { x1: x(0), x2: x(0), y1: m.t, y2: H - m.b, class: 'axis0' }));
  }
  if (o.xLabel) el.append(svg('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'tick' }, o.xLabel));
  if (o.yLabel) el.append(svg('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'tick', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }, o.yLabel));

  // Clip data to the plotting area.
  const clipId = `clip${Math.random().toString(36).slice(2, 8)}`;
  const defs = svg('defs');
  const cp = svg('clipPath', { id: clipId });
  cp.append(svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }));
  defs.append(cp);
  el.append(defs);
  const layer = svg('g', { 'clip-path': `url(#${clipId})` });
  el.append(layer);

  const toData = (e: { clientX: number; clientY: number }): [number, number] => {
    const box = el.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    return [x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0), y0 + (1 - (py - m.t) / (H - m.t - m.b)) * (y1 - y0)];
  };
  const line = (pts: [number, number][], cls: string) => {
    let d = '';
    let pen = false;
    for (const [a, b] of pts) {
      if (!Number.isFinite(b) || Math.abs(b) > 1e6) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${x(a).toFixed(1)},${y(b).toFixed(1)}`;
      pen = true;
    }
    const p = svg('path', { d, class: cls });
    layer.append(p);
    return p;
  };
  return { el, W, H, m, x, y, toData, layer, line, clear: () => layer.replaceChildren() };
}

export function sample(f: (t: number) => number, a: number, b: number, n = 300): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = a + ((b - a) * i) / n;
    return [t, f(t)] as [number, number];
  });
}
