import { fitExponential, reviewsToPoints } from '../fit/exponential';
import { fitPowerLaw, powerRecall } from '../fit/powerLaw';
import { COURSE } from '../data/course';
import { examReadiness } from '../model/scheduler';
import { state } from '../store';
import { recallChart } from './chart';
import { h } from './dom';
import { durationShort, examCountdown, pct, startOfDay } from './format';
import { icon } from './icons';
import { mathBlock } from './math';
import { deckSummary, tile } from './summary';

/** The power law has two parameters, so it needs a few more points to mean anything. */
const MIN_POWER_POINTS = 4;

export function insightsTabs(active: 'progress' | 'math'): HTMLElement {
  return h('nav', { class: 'segmented', 'aria-label': 'Insights views' },
    h('a', { href: '#/insights', class: active === 'progress' ? 'on' : '' }, 'Progress'),
    h('a', { href: '#/math', class: active === 'math' ? 'on' : '' }, 'The Math'),
  );
}

export function renderInsights(root: HTMLElement): void {
  const now = Date.now();
  const today = state.reviews.filter((r) => r.timestamp >= startOfDay(now)).length;
  const mastered = state.decks.reduce((n, d) => n + deckSummary(d, now).mastered, 0);
  const seen = state.cards.filter((c) => c.lastReview !== null).length;
  const quizCorrect = state.practice.filter((p) => p.correct).length;

  root.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, 'Insights'),
      h('h1', {}, 'Your progress'),
      h('p', { class: 'page-sub' }, 'How fast you forget, fitted from your own reviews. See The Math for how each number is computed.'),
    ),
    insightsTabs('progress'),
    h('div', { class: 'tiles four' },
      tile('Reviews today', today),
      tile('Cards seen', seen, `of ${state.cards.length}`),
      tile('Mastered', mastered, 'S ≥ 21 days'),
      tile('Quiz accuracy', state.practice.length ? pct(quizCorrect / state.practice.length) : '—', `${state.practice.length} answered`),
    ),
    examPanel(now),
    practicePanel(),
    h('h2', { class: 'section-title' }, 'Forgetting curves', h('span', { class: 'section-note' }, 'fitted per deck')),
  );

  for (const deck of state.decks) {
    const reviews = state.reviews.filter((r) => r.deckId === deck.id);
    const points = reviewsToPoints(reviews);
    const exp = fitExponential(points);
    const pow = points.length >= MIN_POWER_POINTS ? fitPowerLaw(points) : null;

    const panel = h('section', { class: 'panel' }, h('h2', { class: 'panel-title' }, deck.name));
    root.append(panel);

    if (!exp) {
      panel.append(
        h('div', { class: 'empty small' },
          h('div', { class: 'hero-icon sm' }, icon('stats', 22)),
          h('p', { class: 'text-2' },
            points.length === 0
              ? 'Your forgetting curve appears here once you’ve reviewed some cards a second time.'
              : 'No forgetting yet: every repeat review was “Got it”. Keep going and the curve will fill in.'),
        ),
      );
      continue;
    }

    panel.append(
      h('div', { class: 'tiles' },
        tile('Half-life', durationShort(exp.halfLife), 'until recall hits 50%'),
        tile('Strength S', `${exp.S < 10 ? exp.S.toFixed(1) : Math.round(exp.S)} d`, 'fitted'),
        tile('Data', exp.n, 'repeat reviews'),
      ),
      recallChart(exp, pow, points),
    );

    // Model comparison: only call a winner when the errors differ by more than half a point.
    const better = !pow ? null : pow.rmse < exp.rmse - 0.005 ? 'pow' : exp.rmse < pow.rmse - 0.005 ? 'exp' : null;
    const model = (key: 'exp' | 'pow', name: string, formula: string, params: string, half: number, rmse: number) =>
      h('div', { class: `model${better === key ? ' best' : ''}` },
        h('div', { class: 'model-id' },
          h('div', { class: 'model-name' }, h('i', { class: `swatch ${key}` }), name,
            better === key ? h('span', { class: 'chip good' }, 'Better fit') : ''),
          h('div', { class: 'model-params' }, mathBlock(formula, 'math model-formula'), h('span', {}, params)),
        ),
        h('div', { class: 'model-num' }, h('span', {}, 'Half-life'), h('b', {}, durationShort(half))),
        h('div', { class: 'model-num' }, h('span', {}, 'Error'), h('b', {}, pct(rmse))),
      );
    panel.append(
      h('div', { class: 'models' },
        model('exp', 'Exponential', '$e^{-t/S}$', `S = ${fmt(exp.S)}`, exp.halfLife, exp.rmse),
        pow
          ? model('pow', 'Power law', '$(1+t/a)^{-b}$', `a = ${fmt(pow.a)}, b = ${fmt(pow.b)}`, pow.halfLife, pow.rmse)
          : h('p', { class: 'model-missing' }, `The power-law fit appears after ${MIN_POWER_POINTS} repeat reviews.`),
      ),
      h('p', { class: 'panel-note' },
        'Both are least-squares fits of ln R. Error is the RMS gap between predicted and actual recall (Got it = 100%, Shaky = 60%, Missed = 10%).',
        !pow ? '' : better === 'pow'
          ? ' Your forgetting looks closer to a power law: fast at first, then slower.'
          : better === 'exp'
            ? ' The exponential model fits your reviews better.'
            : ' Neither model is clearly better yet, so the simpler exponential is a fine choice.'),
      h('details', { class: 'data' },
        h('summary', {}, 'Show data'),
        h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Days'), h('th', {}, 'Recall'), h('th', {}, 'Exp.'), pow ? h('th', {}, 'Power') : '')),
          h('tbody', {},
            points.slice(-60).reverse().map((p) =>
              h('tr', {},
                h('td', {}, p.t.toFixed(2)),
                h('td', {}, pct(p.r)),
                h('td', {}, pct(Math.exp(-p.t / exp.S))),
                pow ? h('td', {}, pct(powerRecall(p.t, pow.a, pow.b))) : '',
              )),
          ),
        ),
      ),
    );
  }
}

function examPanel(now: number): HTMLElement | '' {
  const rows = state.decks
    .map((d) => ({ d, r: examReadiness(d, state.cards, now), when: examCountdown(d.examDate, now) }))
    .filter((x) => x.r && x.when);
  if (!rows.length) return '';
  return h('section', { class: 'panel' },
    h('div', { class: 'panel-head' }, icon('calendar', 18), h('strong', {}, 'Exam readiness')),
    h('div', { class: 'bars' },
      rows.map(({ d, r, when }) =>
        h('div', { class: 'bar-row' },
          h('span', {}, d.name.replace(/^Ch\. \d · /, ''), h('div', { class: 'tile-sub' }, `exam ${when}${r!.fresh ? ` · ${r!.fresh} not started` : ''}`)),
          h('div', { class: 'meter' }, h('i', { style: `width:${r!.recall * 100}%` })),
          h('b', {}, pct(r!.recall)),
        ))),
    h('p', { class: 'panel-note' }, 'Average predicted recall on exam day if you stopped reviewing now (cards not started count as 0). Keep doing your daily sessions and the final-window review pushes this up.'),
  );
}

function practicePanel(): HTMLElement {
  if (!state.practice.length) {
    return h('section', { class: 'panel' },
      h('div', { class: 'panel-head' }, icon('practice', 18), h('strong', {}, 'Practice by chapter')),
      h('p', { class: 'text-2 small' }, 'Answer some practice questions and your accuracy per chapter shows up here. ', h('a', { href: '#/practice' }, 'Start practicing →')),
    );
  }
  return h('section', { class: 'panel' },
    h('div', { class: 'panel-head' }, icon('practice', 18), h('strong', {}, 'Practice by chapter')),
    h('div', { class: 'bars' },
      COURSE.map((ch) => {
        const tries = state.practice.filter((p) => p.topic === ch.id);
        const acc = tries.length ? tries.filter((p) => p.correct).length / tries.length : 0;
        return h('div', { class: 'bar-row' },
          h('span', {}, ch.name.replace(/^Ch\. \d · /, '')),
          h('div', { class: 'meter' }, h('i', { style: `width:${acc * 100}%` })),
          h('b', {}, tries.length ? pct(acc) : '—'),
        );
      }),
    ),
  );
}

function fmt(v: number): string {
  if (v >= 1000) return v.toExponential(1);
  return v < 10 ? v.toFixed(2) : v.toFixed(0);
}
