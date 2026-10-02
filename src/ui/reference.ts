import { COURSE, type CourseCard } from '../data/course';
import type { CardKind } from '../model/types';
import { KIND_LABEL, kindChip, sourceLabel } from './cardMeta';
import { decksTabs } from './decks';
import { h } from './dom';
import { icon } from './icons';
import { mathBlock } from './math';

let query = '';
let kind: CardKind | 'all' = 'definition';

const ALL: CourseCard[] = COURSE.flatMap((d) => d.cards);

/** Searchable notes reference: every definition, theorem, method and example, grouped by lecture. */
export function renderReference(root: HTMLElement): void {
  root.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, 'Library'),
      h('h1', {}, 'Reference'),
      h('p', { class: 'page-sub' }, 'Everything from Lectures 1–11. Definitions are word-for-word from the notes.'),
    ),
    decksTabs('reference'),
  );

  const results = h('div', {});
  const kinds: (CardKind | 'all')[] = ['definition', 'theorem', 'method', 'example', 'remark', 'all'];
  const filters = h('div', { class: 'filters' });
  const draw = () => {
    filters.replaceChildren(...kinds.map((k) => {
      const n = ALL.filter((c) => k === 'all' || c.kind === k).length;
      return h('button', { class: `filter${kind === k ? ' on' : ''}`, onclick: () => { kind = k; draw(); } },
        `${k === 'all' ? 'All' : `${KIND_LABEL[k]}s`} · ${n}`);
    }));
    const q = query.trim().toLowerCase();
    const shown = ALL.filter((c) => (kind === 'all' || c.kind === kind) && (!q || `${c.front}\n${c.back}`.toLowerCase().includes(q)));
    const groups = new Map<string, CourseCard[]>();
    for (const c of shown) groups.set(c.source, [...(groups.get(c.source) ?? []), c]);
    results.replaceChildren(
      ...(shown.length
        ? [...groups].map(([source, cards]) =>
            h('section', { class: 'ref-group' },
              h('h3', {}, source),
              cards.map((c) =>
                h('article', { class: 'ref-entry', id: `ref-${c.id}` },
                  h('div', { class: 'ref-entry-head' }, kindChip(c.kind), sourceLabel(c.source)),
                  mathBlock(c.front, 'math ref-term'),
                  mathBlock(c.back, 'math ref-body'),
                )),
            ))
        : [h('div', { class: 'empty small' }, h('p', { class: 'text-2' }, 'Nothing matches that search.'))]),
    );
  };

  root.append(
    h('label', { class: 'search' }, icon('search', 18),
      h('input', {
        type: 'search', placeholder: 'Search definitions, theorems, examples…', value: query, 'aria-label': 'Search reference',
        oninput: (e: Event) => { query = (e.target as HTMLInputElement).value; draw(); },
      })),
    filters,
    results,
  );
  draw();
}
