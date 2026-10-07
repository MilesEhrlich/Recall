import { applyReview } from '../model/review';
import { nextDue, todayQueue } from '../model/scheduler';
import type { Card, Rating } from '../model/types';
import { COURSE_CARDS } from '../data/course';
import { deckById, save, state, uid } from '../store';
import { h, navigate } from './dom';
import { gapLabel, plural, startOfDay } from './format';
import { kindChip, sourceLabel } from './cardMeta';
import { icon } from './icons';
import { mathBlock } from './math';

interface Entry {
  id: string;
  /** Which version of a worked example to show (-1 = the card's own text). */
  variant: number;
  /** A second look at a card missed earlier this session: shown and rated, but doesn't change S or get logged. */
  recheck: boolean;
}

type HistoryItem =
  | { kind: 'review'; before: Card; reviewId: string; rating: Rating; queuedRecheck: boolean }
  | { kind: 'recheck' };

interface Session {
  queue: Entry[];
  index: number;
  revealed: boolean;
  counts: Record<Rating, number>;
  rechecks: number;
  history: HistoryItem[];
}

let session: Session | null = null;

/** Start a fresh session from the current due list (optionally one deck). */
export function startSession(deckId?: string): void {
  const now = Date.now();
  const due = todayQueue(state.cards, state.decks, state.reviews, now, startOfDay(now)).filter((c) => !deckId || c.deckId === deckId);
  session = { queue: due.map((c) => ({ id: c.id, recheck: false, variant: pickVariant(c) })), index: 0, revealed: false, counts: { got: 0, shaky: 0, missed: 0 }, rechecks: 0, history: [] };
}

/** Versions of a worked example (lecture original first), or null for cards without variants or that the user edited. */
function variantsOf(card: Card) {
  if (!card.seedId || card.userEdited) return null;
  const v = COURSE_CARDS.get(card.seedId)?.variants;
  return v && v.length > 1 ? v : null;
}

/** A random version, never the one shown last time. */
function pickVariant(card: Card): number {
  const v = variantsOf(card);
  if (!v) return -1;
  const choices = v.map((_, i) => i).filter((i) => i !== card.lastVariant);
  return choices[Math.floor(Math.random() * choices.length)];
}

const RATINGS: { rating: Rating; label: string; key: string }[] = [
  { rating: 'missed', label: 'Missed', key: '1' },
  { rating: 'shaky', label: 'Shaky', key: '2' },
  { rating: 'got', label: 'Got it', key: '3' },
];

export function renderReview(root: HTMLElement, rerender: () => void): () => void {
  if (!session) startSession();
  const s = session!;
  const entry = s.queue[s.index];
  const card = entry && state.cards.find((c) => c.id === entry.id);
  const total = s.queue.length;
  root.classList.add('review');

  const quit = () => { session = null; navigate('#/today'); };
  const undo = () => {
    const last = s.history.pop();
    if (!last) return;
    if (last.kind === 'recheck') {
      s.rechecks--;
    } else {
      const i = state.cards.findIndex((c) => c.id === last.before.id);
      if (i >= 0) state.cards[i] = last.before;
      state.reviews = state.reviews.filter((r) => r.id !== last.reviewId);
      s.counts[last.rating]--;
      if (last.queuedRecheck) s.queue.pop();
    }
    s.index--;
    s.revealed = true;
    save();
    rerender();
  };

  root.append(
    h('div', { class: 'review-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'End session', title: 'End session (Esc)', onclick: quit }, icon('x')),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': s.index },
        h('i', { style: `width:${total ? (s.index / total) * 100 : 100}%` })),
      h('span', { class: 'progress-label' }, `${Math.min(s.index + 1, total)} / ${total}`),
      h('button', {
        class: 'icon-btn', 'aria-label': 'Undo last rating', title: 'Undo (U)', disabled: !s.history.length, onclick: undo,
      }, icon('undo')),
    ),
  );

  const onKeyBase = (e: KeyboardEvent): boolean => {
    if (e.key === 'Escape') { quit(); return true; }
    if (e.key === 'u' || ((e.metaKey || e.ctrlKey) && e.key === 'z')) { e.preventDefault(); undo(); return true; }
    return false;
  };

  if (!card) {
    const reviewed = s.counts.got + s.counts.shaky + s.counts.missed;
    root.append(
      h('div', { class: 'done' },
        h('div', { class: 'done-icon' }, icon('check', 32)),
        h('h1', {}, reviewed ? 'Session complete' : 'Nothing due'),
        h('p', { class: 'text-2' }, reviewed
          ? `You reviewed ${plural(reviewed, 'card')}${s.rechecks ? ` and took a second look at ${s.rechecks}` : ''}. See you tomorrow.`
          : 'Every card is above your target recall today.'),
        reviewed > 0 &&
          h('div', { class: 'done-counts' },
            RATINGS.slice().reverse().map(({ rating, label }) =>
              h('div', { class: `done-count ${rating}` }, h('b', {}, s.counts[rating]), h('span', {}, label))),
          ),
        h('button', { class: 'btn primary lg', onclick: quit }, 'Back to Today'),
      ),
    );
    const onKey = (e: KeyboardEvent) => { onKeyBase(e); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }

  const deck = deckById(card.deckId);
  const reveal = () => {
    if (s.revealed) return;
    s.revealed = true;
    rerender();
  };
  const rate = (rating: Rating) => {
    if (entry.recheck) {
      // Second look: don't touch the schedule or the review log.
      s.history.push({ kind: 'recheck' });
      s.rechecks++;
    } else {
      const i = state.cards.indexOf(card);
      const wasNew = card.lastReview === null;
      const { card: updated, review } = applyReview(card, rating, Date.now(), uid());
      if (entry.variant >= 0) updated.lastVariant = entry.variant;
      state.cards[i] = updated;
      state.reviews.push(review);
      // Relearn within the session: missed cards (and shaky new ones) come back at the end once.
      const queuedRecheck = rating === 'missed' || (rating === 'shaky' && wasNew);
      if (queuedRecheck) s.queue.push({ id: card.id, recheck: true, variant: entry.variant });
      s.history.push({ kind: 'review', before: card, reviewId: review.id, rating, queuedRecheck });
      s.counts[rating]++;
      save();
    }
    s.index++;
    s.revealed = false;
    rerender();
  };
  /** When this card would come back after each rating (in study days). */
  const preview = (rating: Rating): string => {
    if (!deck) return '';
    if (entry.recheck) return 'no change';
    const now = Date.now();
    const { card: next } = applyReview(card, rating, now, 'preview');
    const when = gapLabel(nextDue(next, deck, now), now);
    const again = rating === 'missed' || (rating === 'shaky' && card.lastReview === null);
    return again ? `again soon · ${when}` : when;
  };

  const versions = variantsOf(card);
  const shown = versions && entry.variant >= 0 ? versions[entry.variant] : card;

  root.append(
    h('div', { class: `flashcard${s.revealed ? ' revealed' : ''}`, onclick: reveal },
      h('div', { class: 'card-meta' },
        h('span', { class: 'inline' }, kindChip(card.kind), sourceLabel(card.source),
          entry.recheck ? h('span', { class: 'chip warn', title: "A second look at a card you missed. It won't change the schedule." }, 'Second look') : '',
          versions && entry.variant >= 0 ? h('span', { class: 'source', title: 'This problem type has several versions; you get a different one each review.' }, `version ${entry.variant + 1}/${versions.length}`) : ''),
        h('span', { class: 'source' }, deck?.name ?? '')),
      mathBlock(shown.front, 'math front'),
      s.revealed && h('div', { class: 'answer' }, mathBlock(shown.back, 'math back')),
    ),
    h('div', { class: 'dock' },
      s.revealed
        ? h('div', { class: 'ratings' },
            RATINGS.map(({ rating, label, key }) =>
              h('button', { class: `rate ${rating}`, onclick: () => rate(rating) },
                h('span', { class: 'rate-label' }, label),
                h('span', { class: 'rate-when' }, preview(rating)),
                h('kbd', {}, key),
              )),
          )
        : h('button', { class: 'btn primary lg block', onclick: reveal }, 'Show answer', h('kbd', {}, 'Space')),
    ),
  );

  const onKey = (e: KeyboardEvent) => {
    if (onKeyBase(e)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); return; }
    const r = RATINGS.find((x) => x.key === e.key);
    if (r && s.revealed) rate(r.rating);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
