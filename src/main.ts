import './style.css';
import { todayQueue } from './model/scheduler';
import { state } from './store';
import { renderDeck, renderDecks } from './ui/decks';
import { h } from './ui/dom';
import { startOfDay } from './ui/format';
import { brand } from './ui/brand';
import { icon, type IconName } from './ui/icons';
import { renderInsights } from './ui/insights';
import { renderLab, renderLabs } from './ui/labs';
import { renderMath } from './ui/mathPage';
import { renderPractice } from './ui/practice';
import { renderReference } from './ui/reference';
import { renderReview } from './ui/review';
import { renderToday } from './ui/today';

const app = document.getElementById('app')!;
let cleanup: () => void = () => {};

const NAV: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: '#/today', label: 'Today', icon: 'today', match: ['#/today'] },
  { href: '#/decks', label: 'Decks', icon: 'decks', match: ['#/decks', '#/deck/', '#/reference'] },
  { href: '#/practice', label: 'Practice', icon: 'practice', match: ['#/practice'] },
  { href: '#/labs', label: 'Labs', icon: 'labs', match: ['#/labs'] },
  { href: '#/insights', label: 'Insights', icon: 'insights', match: ['#/insights', '#/math'] },
];

/** Re-render the current route. Navigation scrolls to top; in-place rerenders keep scroll. */
function render(): void {
  cleanup();
  cleanup = () => {};
  const route = location.hash.split('?')[0] || '#/today';
  const main = h('main', { class: 'screen' });

  if (route === '#/review') cleanup = renderReview(main, render);
  else if (route === '#/decks') renderDecks(main, render);
  else if (route.startsWith('#/deck/')) renderDeck(main, route.slice('#/deck/'.length), render);
  else if (route === '#/reference') renderReference(main);
  else if (route === '#/practice') cleanup = renderPractice(main, render);
  else if (route === '#/labs') renderLabs(main);
  else if (route.startsWith('#/labs/')) cleanup = renderLab(main, route.slice('#/labs/'.length));
  else if (route === '#/insights') renderInsights(main);
  else if (route === '#/math') cleanup = renderMath(main);
  else renderToday(main, render);

  const scrollY = window.scrollY;
  if (route === '#/review') {
    app.replaceChildren(main);
  } else {
    const active = NAV.find((t) => t.match.some((m) => route.startsWith(m))) ?? NAV[0];
    const now = Date.now();
    const due = todayQueue(state.cards, state.decks, state.reviews, now, startOfDay(now)).length;
    const link = (t: (typeof NAV)[number], showCount: boolean) =>
      h('a', { href: t.href, class: t === active ? 'active' : '', 'aria-current': t === active ? 'page' : undefined },
        icon(t.icon, showCount ? 19 : 22), h('span', {}, t.label),
        showCount && t.href === '#/today' && due > 0 ? h('span', { class: 'count' }, due) : '');
    app.replaceChildren(
      h('div', { class: 'shell' },
        h('aside', { class: 'sidebar' },
          brand(),
          h('nav', { class: 'side-nav', 'aria-label': 'Main' }, NAV.map((t) => link(t, true))),
          h('div', { class: 'side-foot' },
            h('b', {}, 'How it schedules'),
            h('div', {}, 'Every card follows ', h('span', { class: 'mono' }, 'dR/dt = −R/S'), '. ', h('a', { href: '#/math' }, 'See the math →')),
          ),
        ),
        h('div', { class: 'main' }, main),
      ),
      h('nav', { class: 'tabs', 'aria-label': 'Main' }, NAV.map((t) => link(t, false))),
    );
  }
  window.scrollTo(0, scrollY);
}

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
render();
