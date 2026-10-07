// Minimal stroke icons (24x24, currentColor).
const PATHS: Record<string, string> = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  decks: '<path d="m12 2-10 5 10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  stats: '<path d="M3 3v18h18"/><path d="M8 17v-4M13 17V7M18 17v-7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  practice: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  labs: '<path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
  insights: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M19 19v3H6a2 2 0 0 1-2-2"/><path d="M8 7h7M8 11h5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  play: '<path d="m7 4 13 8-13 8Z"/>',
  sigma: '<path d="M18 4H6l6 8-6 8h12"/>',
  wave: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>',
  field: '<path d="M4 18l3-3M10 18l3-3M16 18l3-3M4 12l3-1M10 12l3-1M16 12l3-1M4 6l3 1M10 6l3 1M16 6l3 1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 20): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML =
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
  return tpl.content.firstElementChild as SVGSVGElement;
}

/** The Recall logo: a forgetting curve that decays and jumps back up at each review. */
export function brandMark(): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML =
    '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect width="32" height="32" rx="8" fill="var(--ink)"/>' +
    '<path d="M6 25.5h20" stroke="var(--bg)" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M6 7c2.2 4.5 3.6 7 5.5 8.6V8.5c2.6 3.6 4.6 5.6 7 6.7V8.6c2.4 2.4 4.4 3.6 7.5 4.2" fill="none" stroke="#7c9cff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="11.5" cy="8.5" r="1.7" fill="#ff7c66"/><circle cx="18.5" cy="8.6" r="1.7" fill="#ff7c66"/></svg>';
  return tpl.content.firstElementChild as SVGSVGElement;
}
