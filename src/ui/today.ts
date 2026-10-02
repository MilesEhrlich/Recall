import { examReadiness, inFinalWindow, predictedRecall, studyDayEnd, todayQueue } from '../model/scheduler';
import { save, state } from '../store';
import { brand } from './brand';
import { kindChip, sourceLabel } from './cardMeta';
import { h, navigate } from './dom';
import { dateLabel, examCountdown, pct, plural, startOfDay } from './format';
import { icon } from './icons';
import { mathBlock } from './math';
import { startSession } from './review';
import { recallMeter } from './summary';
import { toast } from './toast';

const TIP_KEY = 'recall-rate/tip-dismissed';
const SECONDS_PER_CARD = 10;
const LIST_LIMIT = 8;

function tipDismissed(): boolean {
  try { return localStorage.getItem(TIP_KEY) === '1'; } catch { return true; }
}

export function renderToday(root: HTMLElement, rerender: () => void): void {
  const now = Date.now();
  const queue = todayQueue(state.cards, state.decks, state.reviews, now, startOfDay(now));
  const fresh = queue.filter((c) => c.lastReview === null).length;
  const reviews = queue.length - fresh;
  const reviewedToday = state.reviews.filter((r) => r.timestamp >= startOfDay(now)).length;

  root.append(
    h('div', { class: 'mobile-brand' }, brand()),
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, dateLabel(now)),
      h('h1', {}, 'Today'),
    ),
  );

  if (!tipDismissed()) root.append(howItWorks(rerender));

  const upcoming = state.decks.filter((d) => examCountdown(d.examDate, now));
  for (const d of upcoming) {
    const ready = examReadiness(d, state.cards, now);
    root.append(
      h('a', { class: 'banner', href: `#/deck/${d.id}` },
        icon('calendar', 18),
        h('span', {}, h('strong', {}, d.name), ` exam ${examCountdown(d.examDate, now)}`,
          inFinalWindow(d, now) ? h('span', { class: 'banner-tag' }, 'Final review') : '',
          ready ? h('span', { class: 'banner-sub' }, readinessText(ready)) : ''),
      ),
    );
  }
  if (!upcoming.length && state.decks.length) root.append(examCard(rerender));

  const hero = h('section', { class: 'hero' });
  if (queue.length) {
    const minutes = Math.max(1, Math.round((queue.length * SECONDS_PER_CARD) / 60));
    hero.append(
      h('div', { class: 'eyebrow' }, "Today's session"),
      h('div', { class: 'hero-num' }, queue.length, h('small', {}, queue.length === 1 ? 'card' : 'cards')),
      h('div', { class: 'hero-split' },
        h('div', {}, h('b', {}, reviews), 'to review'),
        h('div', {}, h('b', {}, fresh), 'new'),
        h('div', {}, h('b', {}, `~${minutes}`), 'min'),
      ),
      h('button', { class: 'btn primary lg block', onclick: () => { startSession(); navigate('#/review'); } },
        'Start session', icon('arrow', 18)),
    );
  } else {
    // Preview tomorrow's session: the queue as it will look at the start of the next study day.
    const tomorrow = studyDayEnd(now);
    const nextCount = todayQueue(state.cards, state.decks, state.reviews, tomorrow, tomorrow).length;
    hero.append(
      h('div', { class: 'hero-icon' }, icon('check', 26)),
      h('div', { class: 'hero-label' }, state.cards.length ? 'Done for today' : 'No cards yet'),
      h('div', { class: 'hero-sub' },
        state.cards.length
          ? `Next session tomorrow${nextCount ? ` · ${plural(nextCount, 'card')}` : ''}. Nothing more is due today, so a practice quiz or a lab is a good use of extra time.`
          : 'Add a deck to get started.'),
    );
  }
  hero.append(h('div', { class: 'hero-foot' },
    h('span', {}, `${plural(reviewedToday, 'review')} today`),
    h('a', { href: '#/math' }, 'Why these cards? →'),
  ));
  root.append(hero);

  if (queue.length) {
    root.append(h('h2', { class: 'section-title' }, 'Up next', h('span', { class: 'section-note' }, 'lowest predicted recall first')));
    root.append(
      h('ul', { class: 'list' },
        queue.slice(0, LIST_LIMIT).map((c) =>
          h('li', { class: 'item' },
            h('div', { class: 'item-main' },
              h('div', { class: 'item-top' }, kindChip(c.kind), sourceLabel(c.source)),
              mathBlock(c.front, 'math clamp serif'),
            ),
            c.lastReview === null ? h('span', { class: 'chip accent' }, 'New') : recallMeter(predictedRecall(c, now)),
          ),
        ),
      ),
      queue.length > LIST_LIMIT ? h('p', { class: 'list-more' }, `+ ${queue.length - LIST_LIMIT} more in this session`) : '',
    );
  }

  root.append(
    h('h2', { class: 'section-title' }, 'Keep going'),
    h('div', { class: 'shortcuts' },
      shortcut('#/practice', 'practice', 'Practice quiz', 'Definitions, classification and worked problems with instant feedback.'),
      shortcut('#/labs/slope-field', 'field', 'Slope field lab', 'Tap anywhere to draw a solution curve through that point.'),
      shortcut('#/labs/spring', 'wave', 'Spring–mass lab', 'Watch under-, critical and overdamping as you tune m, c, k.'),
    ),
  );
}

function shortcut(href: string, ic: Parameters<typeof icon>[0], title: string, text: string): HTMLElement {
  return h('a', { class: 'shortcut', href }, icon(ic, 22), h('b', {}, title), h('span', {}, text));
}

function howItWorks(rerender: () => void): HTMLElement {
  return h('section', { class: 'tip' },
    h('div', { class: 'tip-head' }, icon('info', 18), h('strong', {}, 'How Recall Rate schedules your cards')),
    h('p', {},
      'Study once a day. Each card has a memory strength S; predicted recall decays like R(t) = e^(−t/S), and a card comes back on the day R would drop below 90% (never sooner than tomorrow). Missed cards get a second look at the end of the session. New cards arrive 15 a day in lecture order, or faster if needed to finish before an exam.'),
    h('ul', { class: 'tip-list' },
      h('li', {}, h('span', { class: 'dot got' }), h('b', {}, 'Got it'), ' — strength ×2.5'),
      h('li', {}, h('span', { class: 'dot shaky' }), h('b', {}, 'Shaky'), ' — strength ×1.2'),
      h('li', {}, h('span', { class: 'dot missed' }), h('b', {}, 'Missed'), ' — strength ×0.3, see it again soon'),
    ),
    h('div', { class: 'inline' },
      h('button', { class: 'btn sm', onclick: () => { try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ } rerender(); } }, 'Dismiss'),
      h('a', { class: 'btn sm ghost', href: '#/math' }, 'See the math'),
    ),
  );
}

function readinessText(r: { recall: number; fresh: number; total: number }): string {
  if (r.fresh) return `${r.fresh} of ${r.total} cards not started yet`;
  return `predicted recall on exam day: ${pct(r.recall)}${r.recall >= 0.9 ? ' · on track' : ' if you stopped now'}`;
}

/** Prompt to set an exam date, applied to the chosen decks. */
function examCard(rerender: () => void): HTMLElement {
  const chosen = new Set(state.decks.map((d) => d.id));
  const date = h('input', { type: 'date', 'aria-label': 'Exam date', min: new Date().toISOString().slice(0, 10) });
  const chips = h('div', { class: 'filters', style: 'margin:0' },
    state.decks.map((d) => {
      const b = h('button', {
        class: 'filter on', type: 'button',
        onclick: () => {
          if (chosen.has(d.id)) chosen.delete(d.id); else chosen.add(d.id);
          b.classList.toggle('on', chosen.has(d.id));
        },
      }, d.name.replace(/ · .*/, ''));
      return b;
    }));
  return h('section', { class: 'panel exam-card' },
    h('div', { class: 'panel-head' }, icon('calendar', 18), h('strong', {}, 'Have an exam coming up?')),
    h('p', { class: 'text-2 small', style: 'margin-bottom:10px' },
      'Set the date and Recall Rate paces new cards so everything is introduced in time, shortens review gaps as the exam approaches, and shows every card once more in the final 2 days.'),
    h('form', {
      class: 'stack', style: 'gap:10px',
      onsubmit: (e: Event) => {
        e.preventDefault();
        if (!date.value || !chosen.size) return;
        for (const d of state.decks) if (chosen.has(d.id)) d.examDate = date.value;
        save();
        rerender();
        toast(`Exam set for ${plural(chosen.size, 'deck')}`);
      },
    },
      h('div', { class: 'inline' }, date, h('button', { class: 'btn primary', type: 'submit' }, 'Set exam date')),
      chips,
    ),
  );
}
