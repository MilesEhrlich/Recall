import { exportDeck, parseDeckFile } from '../io';
import { examReadiness, inFinalWindow, isDue, nextDue, pacedNewCards } from '../model/scheduler';
import type { Card, CardKind, Deck } from '../model/types';
import { cardsInDeck, deckById, newCard, removeCard, removeDeck, restoreCard, restoreCourse, save, state, uid } from '../store';
import { KIND_LABEL, kindChip, sourceLabel } from './cardMeta';
import { confirmDialog, openSheet, promptDialog } from './dialog';
import { h, navigate } from './dom';
import { dueLabel, examCountdown, pct, plural } from './format';
import { icon } from './icons';
import { mathBlock } from './math';
import { startSession } from './review';
import { deckSummary, tile } from './summary';
import { toast } from './toast';

export function decksTabs(active: 'decks' | 'reference'): HTMLElement {
  return h('nav', { class: 'segmented', 'aria-label': 'Decks views' },
    h('a', { href: '#/decks', class: active === 'decks' ? 'on' : '' }, 'Decks'),
    h('a', { href: '#/reference', class: active === 'reference' ? 'on' : '' }, 'Reference'),
  );
}

// ---------- Deck list ----------

export function renderDecks(root: HTMLElement, rerender: () => void): void {
  const now = Date.now();

  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onchange: async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const { name, count } = importDeck(await file.text());
        rerender();
        toast(`Imported “${name}” · ${plural(count, 'card')}`);
      } catch (e) {
        toast(`Import failed: ${(e as Error).message}`);
      } finally {
        fileInput.value = '';
      }
    },
  });

  root.append(
    h('header', { class: 'page-head split' },
      h('div', {}, h('div', { class: 'eyebrow' }, 'Library'), h('h1', {}, 'Decks')),
      h('div', { class: 'head-actions' },
        h('button', { class: 'icon-btn', 'aria-label': 'Import deck from JSON', title: 'Import deck (JSON)', onclick: () => fileInput.click() }, icon('upload')),
        h('button', { class: 'btn primary sm', onclick: createDeck }, icon('plus', 18), 'New deck'),
      ),
    ),
    fileInput,
    decksTabs('decks'),
  );

  if (!state.decks.length) {
    root.append(h('div', { class: 'empty' },
      h('div', { class: 'hero-icon' }, icon('decks', 26)),
      h('p', {}, 'No decks yet.'),
      h('p', { class: 'text-2' }, 'Create one, import a deck, or restore the course decks.'),
    ));
  } else {
    root.append(
      h('div', { class: 'deck-grid' },
        state.decks.map((d) => {
          const sum = deckSummary(d, now);
          const exam = examCountdown(d.examDate, now);
          return h('a', { class: 'deck-card', href: `#/deck/${d.id}` },
            h('div', { class: 'deck-card-top' },
              h('span', { class: 'deck-name' }, d.name),
              sum.due > 0 ? h('span', { class: 'chip accent' }, `${sum.due} today`) : '',
            ),
            d.description ? h('div', { class: 'deck-desc' }, d.description) : '',
            h('div', { class: 'deck-meta' },
              h('span', { class: 'mono' }, plural(sum.total, 'card')),
              h('span', {}, '·'),
              h('span', {}, `${sum.fresh} new`),
              exam ? h('span', { class: 'chip warn' }, icon('calendar', 13), `Exam ${exam}`) : '',
            ),
            h('div', { class: 'meter lg' }, h('i', { style: `width:${sum.total ? (sum.mastered / sum.total) * 100 : 0}%` })),
            h('div', { class: 'deck-meta small' }, `${sum.mastered} of ${sum.total} mastered`),
          );
        }),
      ),
    );
  }

  if (state.removedSeeds.length) {
    root.append(h('div', { class: 'panel quiet' },
      h('button', {
        class: 'btn ghost sm',
        onclick: () => { restoreCourse(); save(); rerender(); toast('Course content restored'); },
      }, icon('refresh', 16), 'Restore deleted course cards'),
    ));
  }
}

async function createDeck(): Promise<void> {
  const name = await promptDialog({ title: 'New deck', label: 'Deck name', placeholder: 'e.g. Ch. 4 · Laplace Transforms', confirm: 'Create deck' });
  if (!name) return;
  const deck: Deck = { id: uid(), name, examDate: null };
  state.decks.push(deck);
  save();
  navigate(`#/deck/${deck.id}`);
}

function importDeck(text: string): { name: string; count: number } {
  const file = parseDeckFile(text);
  let name = file.name;
  while (state.decks.some((d) => d.name === name)) name += ' (imported)';
  const deck: Deck = { id: uid(), name, examDate: file.examDate };
  const now = Date.now();
  state.decks.push(deck);
  file.cards.forEach((c, i) => {
    state.cards.push({
      ...newCard(deck.id, c.front, c.back, now + i), stability: c.stability!, lastReview: c.lastReview ?? null,
      ...(c.kind && { kind: c.kind }), ...(c.source && { source: c.source }),
    });
  });
  save();
  return { name, count: file.cards.length };
}

function download(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Deck detail ----------

let cardQuery = '';
let kindFilter: CardKind | 'all' = 'all';
let filterDeckId = '';

export function renderDeck(root: HTMLElement, deckId: string, rerender: () => void): void {
  const deck = deckById(deckId);
  if (!deck) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'Deck not found.'), h('a', { class: 'btn', href: '#/decks' }, 'Back to decks')));
    return;
  }
  if (filterDeckId !== deck.id) { cardQuery = ''; kindFilter = 'all'; filterDeckId = deck.id; }
  const now = Date.now();
  const cards = cardsInDeck(deck.id);
  const sum = deckSummary(deck, now);

  const title = h('input', {
    class: 'title-input', value: deck.name, 'aria-label': 'Deck name',
    onchange: () => {
      const v = title.value.trim();
      if (v && v !== deck.name) { deck.name = v; save(); toast('Deck renamed'); } else title.value = deck.name;
    },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') title.blur(); },
  });

  root.append(
    h('nav', { class: 'topbar' }, h('a', { class: 'back-link', href: '#/decks' }, icon('chevron-left'), 'Decks')),
    h('div', { class: 'title-row' }, title, h('span', { class: 'title-hint', 'aria-hidden': 'true' }, icon('pencil', 16))),
    deck.description ? h('p', { class: 'deck-detail-desc' }, deck.description) : h('div', { style: 'height:12px' }),
    h('div', { class: 'tiles' }, tile('Cards', sum.total), tile('Today', sum.due, sum.reviewsDue ? `${sum.reviewsDue} reviews due` : 'in session'), tile('Mastered', sum.mastered)),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn primary', disabled: sum.due === 0,
        onclick: () => { startSession(deck.id); navigate('#/review'); },
      }, sum.due ? 'Study this deck' : 'All caught up'),
      h('button', { class: 'btn', onclick: () => openCardEditor(deck, null, rerender) }, icon('plus', 18), 'Add card'),
    ),
    examPanel(deck, now, rerender),
  );

  // Card list with search + kind filter
  const kinds = (['definition', 'theorem', 'method', 'example', 'remark'] as CardKind[]).filter((k) => cards.some((c) => c.kind === k));
  const list = h('ul', { class: 'list' });
  const rows = cards.map((c) => {
    const li = cardRow(c, deck, now, rerender);
    li.dataset.search = `${c.front}\n${c.back}\n${c.source ?? ''}`.toLowerCase();
    li.dataset.kind = c.kind ?? '';
    return li;
  });
  list.append(...rows);
  const emptySearch = h('p', { class: 'list-more', hidden: true }, 'No cards match.');
  const count = h('span', { class: 'section-note' });
  const applyFilter = () => {
    const q = cardQuery.trim().toLowerCase();
    let shown = 0;
    for (const r of rows) {
      const match = (!q || r.dataset.search!.includes(q)) && (kindFilter === 'all' || r.dataset.kind === kindFilter);
      r.hidden = !match;
      if (match) shown++;
    }
    count.textContent = shown === cards.length ? String(cards.length) : `${shown} of ${cards.length}`;
    emptySearch.hidden = shown > 0 || !cards.length;
    list.hidden = shown === 0;
  };
  const filterBtns = kinds.length > 1
    ? h('div', { class: 'filters' },
        (['all', ...kinds] as (CardKind | 'all')[]).map((k) =>
          h('button', {
            class: `filter${kindFilter === k ? ' on' : ''}`,
            onclick: (e: Event) => {
              kindFilter = k;
              (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.filter').forEach((b) => b.classList.remove('on'));
              (e.currentTarget as HTMLElement).classList.add('on');
              applyFilter();
            },
          }, k === 'all' ? 'All' : `${KIND_LABEL[k]}s`)))
    : '';

  root.append(
    h('h2', { class: 'section-title' }, 'Cards', count),
    cards.length > 6 ? h('label', { class: 'search' },
      icon('search', 18),
      h('input', {
        type: 'search', placeholder: 'Search cards', value: cardQuery, 'aria-label': 'Search cards',
        oninput: (e: Event) => { cardQuery = (e.target as HTMLInputElement).value; applyFilter(); },
      }),
    ) : '',
    filterBtns,
    cards.length ? list : h('div', { class: 'empty small' }, h('p', { class: 'text-2' }, 'No cards yet. Add your first one.')),
    emptySearch,
  );
  applyFilter();

  root.append(
    h('section', { class: 'panel quiet' },
      h('button', {
        class: 'btn ghost sm',
        onclick: () => { download(`${deck.name.replace(/[^\w-]+/g, '_')}.json`, exportDeck(deck, cards)); toast('Deck exported'); },
      }, icon('download', 16), 'Export as JSON'),
      h('button', {
        class: 'btn ghost sm danger',
        onclick: async () => {
          const ok = await confirmDialog({
            title: 'Delete deck?',
            message: `“${deck.name}” and its ${plural(cards.length, 'card')} and review history will be removed. Export it first if you want a backup.`,
            confirm: 'Delete deck', danger: true,
          });
          if (!ok) return;
          removeDeck(deck);
          save();
          navigate('#/decks');
          toast('Deck deleted');
        },
      }, icon('trash', 16), 'Delete deck'),
    ),
  );
}

function examPanel(deck: Deck, now: number, rerender: () => void): HTMLElement {
  const dateInput = h('input', {
    type: 'date', value: deck.examDate ?? '', 'aria-label': 'Exam date',
    onchange: () => {
      deck.examDate = dateInput.value || null;
      save();
      rerender();
      if (deck.examDate) toast('Exam date set');
    },
  });
  const countdown = examCountdown(deck.examDate, now);
  const note = !deck.examDate
    ? 'Set a date and new cards are paced so everything is introduced in time, review gaps shrink as the exam approaches, and every card comes up once more in the final 2 days.'
    : countdown === null
      ? 'This exam has passed, so normal scheduling applies.'
      : inFinalWindow(deck, now)
        ? `Exam ${countdown}. Final review: every card will come up at least once, including new ones.`
        : `Exam ${countdown}. Gaps between reviews are capped at 20% of the time left.`;

  return h('section', { class: 'panel' },
    h('div', { class: 'panel-head' }, icon('calendar', 18), h('strong', {}, 'Exam date'),
      countdown ? h('span', { class: `chip ${inFinalWindow(deck, now) ? 'warn' : 'accent'}` }, countdown) : ''),
    h('div', { class: 'inline' },
      dateInput,
      deck.examDate ? h('button', { class: 'btn sm', onclick: () => { deck.examDate = null; save(); rerender(); toast('Exam date cleared'); } }, 'Clear') : '',
    ),
    readinessBlock(deck, now),
    h('p', { class: 'panel-note' }, note, ' ', h('a', { href: '#/math' }, 'How the exam cap works →')),
  );
}

function readinessBlock(deck: Deck, now: number): HTMLElement | '' {
  const r = examReadiness(deck, state.cards, now);
  if (!r) return '';
  const pace = pacedNewCards(deck, state.cards, 0, now);
  return h('dl', { class: 'readout', style: 'margin-top:12px' },
    h('dt', {}, 'Cards started'), h('dd', {}, `${r.total - r.fresh} / ${r.total}`),
    h('dt', {}, 'New cards per day needed'), h('dd', {}, r.fresh ? String(pace) : '— all started'),
    h('dt', {}, 'Recall on exam day if you stopped now'), h('dd', {}, pct(r.recall)),
  );
}

function cardRow(c: Card, deck: Deck, now: number, rerender: () => void): HTMLLIElement {
  const due = nextDue(c, deck, now);
  const status = c.lastReview === null ? 'New' : isDue(c, deck, now) ? 'Due today' : `Due ${dueLabel(due, now)}`;
  const open = () => openCardEditor(deck, c, rerender);
  return h('li', {
    class: 'item tappable', tabIndex: 0, role: 'button',
    onclick: open, onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') open(); },
  },
    h('div', { class: 'item-main' },
      h('div', { class: 'item-top' }, kindChip(c.kind), sourceLabel(c.source)),
      mathBlock(c.front, 'math clamp serif'),
      h('div', { class: 'item-sub' },
        h('span', { class: c.lastReview === null ? 'accent-text' : isDue(c, deck, now) ? 'warn-text' : '' }, status),
        c.lastReview !== null ? ` · S = ${c.stability < 10 ? c.stability.toFixed(1) : Math.round(c.stability)} d` : ''),
    ),
    h('span', { class: 'item-chevron' }, icon('chevron-right', 18)),
  );
}

// ---------- Card editor ----------

const SNIPPETS: { label: string; before: string; after: string }[] = [
  { label: '$x$', before: '$', after: '$' },
  { label: '$$x$$', before: '$$', after: '$$' },
  { label: 'dy/dt', before: '\\dfrac{dy}{dt}', after: '' },
  { label: 'a/b', before: '\\frac{', after: '}{}' },
  { label: "y''", before: "y''", after: '' },
  { label: 'eˣ', before: 'e^{', after: '}' },
  { label: '∫', before: '\\int ', after: '\\,dt' },
  { label: '√', before: '\\sqrt{', after: '}' },
  { label: 'ω₀', before: '\\omega_0', after: '' },
  { label: 'λ', before: '\\lambda', after: '' },
  { label: '⇔', before: '\\Leftrightarrow ', after: '' },
];

function openCardEditor(deck: Deck, card: Card | null, rerender: () => void): void {
  let lastFocused: HTMLTextAreaElement;
  let kind: CardKind | undefined = card?.kind;

  const field = (label: string, value: string, placeholder: string) => {
    const preview = h('div', { class: 'preview' });
    const update = () => preview.replaceChildren(
      ta.value.trim() ? mathBlock(ta.value) : h('span', { class: 'preview-empty' }, 'Preview'),
    );
    const ta: HTMLTextAreaElement = h('textarea', { value, placeholder, rows: 3, oninput: update, onfocus: () => { lastFocused = ta; } });
    update();
    return { ta, el: h('label', { class: 'field' }, h('span', {}, label), ta, preview) };
  };

  const front = field('Front', card?.front ?? '', 'e.g. Autonomous equation');
  const back = field('Back', card?.back ?? '', 'e.g. A first order ODE is autonomous if $\\dfrac{dy}{dt} = f(y)$.');
  lastFocused = front.ta;

  const insert = (before: string, after: string) => {
    const ta = lastFocused;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const sel = value.slice(a, b);
    ta.value = value.slice(0, a) + before + sel + after + value.slice(b);
    const caret = a + before.length + sel.length;
    ta.focus();
    ta.setSelectionRange(caret, caret);
    ta.dispatchEvent(new Event('input'));
  };

  const kindPicker = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': 'Card type' },
    (Object.keys(KIND_LABEL) as CardKind[]).map((k) =>
      h('button', {
        type: 'button', class: `chip kind ${k}${kind === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(kind === k),
        onclick: (e: Event) => {
          kind = kind === k ? undefined : k;
          kindPicker.querySelectorAll('button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
          if (kind) { (e.currentTarget as HTMLElement).classList.add('on'); (e.currentTarget as HTMLElement).setAttribute('aria-checked', 'true'); }
        },
      }, KIND_LABEL[k])),
  );

  openSheet(card ? 'Edit card' : 'New card', (close) => {
    const saveCard = (another: boolean) => {
      if (!front.ta.value.trim() || !back.ta.value.trim()) { toast('Both sides need some text'); return; }
      if (card) {
        const changed = card.front !== front.ta.value || card.back !== back.ta.value;
        Object.assign(card, { front: front.ta.value, back: back.ta.value, kind });
        if (changed && card.seedId) card.userEdited = true;
      } else {
        state.cards.push({ ...newCard(deck.id, front.ta.value, back.ta.value), ...(kind && { kind }) });
      }
      save();
      rerender();
      if (another) {
        for (const f of [front, back]) { f.ta.value = ''; f.ta.dispatchEvent(new Event('input')); }
        front.ta.focus();
        toast('Card added');
      } else {
        close();
        toast(card ? 'Card saved' : 'Card added');
      }
    };

    return [
      h('form', { class: 'stack', onsubmit: (e: Event) => { e.preventDefault(); saveCard(false); } },
        card?.source ? h('div', { class: 'inline' }, kindChip(card.kind), sourceLabel(card.source), card.userEdited ? h('span', { class: 'chip' }, 'Edited') : '') : '',
        h('div', { class: 'snippets', role: 'toolbar', 'aria-label': 'Insert LaTeX' },
          SNIPPETS.map((sn) =>
            h('button', {
              type: 'button', class: 'snippet', title: `Insert ${sn.before}${sn.after}`,
              onmousedown: (e: Event) => e.preventDefault(),
              onclick: () => insert(sn.before, sn.after),
            }, sn.label)),
        ),
        front.el,
        back.el,
        h('div', { class: 'field' }, h('span', {}, 'Type'), kindPicker),
        h('div', { class: 'sheet-actions' },
          card
            ? h('button', { type: 'button', class: 'btn ghost danger push-left', onclick: () => { close(); deleteCard(card, rerender); } }, icon('trash', 16), 'Delete')
            : h('button', { type: 'button', class: 'btn push-left', onclick: () => saveCard(true) }, 'Save & add another'),
          h('button', { type: 'submit', class: 'btn primary' }, card ? 'Save' : 'Add card'),
        ),
      ),
    ];
  });
  if (!card) setTimeout(() => front.ta.focus(), 50);
}

function deleteCard(c: Card, rerender: () => void): void {
  const idx = state.cards.indexOf(c);
  const reviews = state.reviews.filter((r) => r.cardId === c.id);
  removeCard(c);
  save();
  rerender();
  toast('Card deleted', { label: 'Undo', run: () => { restoreCard(c, reviews, idx); save(); rerender(); } });
}
