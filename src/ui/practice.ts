import { COURSE } from '../data/course';
import type { Question, Topic } from '../practice/bank';
import { buildQuiz, grade, poolSize, type Mode } from '../practice/quiz';
import { save, state, uid } from '../store';
import { sourceLabel } from './cardMeta';
import { h } from './dom';
import { pct } from './format';
import { icon, type IconName } from './icons';
import { mathBlock } from './math';

interface Session {
  mode: Mode;
  questions: Question[];
  index: number;
  /** Response for the current question once answered. */
  response: number | string | null;
  results: boolean[];
}

let session: Session | null = null;
let topics: Topic[] = ['ch1', 'ch2', 'ch3'];
let length = 10;

const MODES: { mode: Mode; icon: IconName; title: string; text: string }[] = [
  { mode: 'definitions', icon: 'book', title: 'Definitions', text: 'Match terms to the exact wording from the notes, and back.' },
  { mode: 'concepts', icon: 'sigma', title: 'Concepts', text: 'Classify equations, pick the right theorem, predict behavior.' },
  { mode: 'problems', icon: 'practice', title: 'Problems', text: 'Compute numbers from the lecture examples. Answers like 2π/10 or √5/2 work.' },
];

function seed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}

function rand(): () => number {
  let s = seed();
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function start(mode: Mode, questions?: Question[]): void {
  session = { mode, questions: questions ?? buildQuiz(mode, topics, length, rand()), index: 0, response: null, results: [] };
}

export function renderPractice(root: HTMLElement, rerender: () => void): () => void {
  if (!session) return renderSetup(root, rerender);
  if (session.index >= session.questions.length) return renderSummary(root, rerender);
  return renderQuestion(root, rerender);
}

// ---------- Setup ----------

function renderSetup(root: HTMLElement, rerender: () => void): () => void {
  const total = state.practice.length;
  const correct = state.practice.filter((p) => p.correct).length;

  root.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow' }, 'Practice'),
      h('h1', {}, 'Test yourself'),
      h('p', { class: 'page-sub' }, 'Short quizzes with instant feedback and worked solutions. They don’t change your flashcard schedule.'),
    ),
    h('div', { class: 'field' }, h('span', {}, 'Chapters')),
    h('div', { class: 'scope' },
      COURSE.map((ch) =>
        h('button', {
          class: `filter${topics.includes(ch.id as Topic) ? ' on' : ''}`,
          onclick: () => {
            const t = ch.id as Topic;
            topics = topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t];
            if (!topics.length) topics = [t];
            rerender();
          },
        }, ch.name.replace(' · ', ' — '))),
    ),
    h('div', { class: 'field' }, h('span', {}, 'Length')),
    h('div', { class: 'scope' },
      [5, 10, 20].map((n) => h('button', { class: `filter${length === n ? ' on' : ''}`, onclick: () => { length = n; rerender(); } }, `${n} questions`)),
    ),
    h('div', { class: 'mode-grid' },
      MODES.map((m) =>
        h('button', { class: 'mode', onclick: () => { start(m.mode); rerender(); } },
          icon(m.icon, 22), h('b', {}, m.title), h('span', {}, m.text),
          h('small', {}, `${poolSize(m.mode, topics)} in pool`))),
    ),
    h('button', { class: 'btn primary lg block', style: 'margin-top:14px', onclick: () => { start('mixed'); rerender(); } },
      icon('play', 18), `Mixed quiz · ${length} questions`),
    total
      ? h('p', { class: 'panel-note', style: 'text-align:center' },
          `Lifetime: ${correct} / ${total} correct (${pct(correct / total)}). `, h('a', { href: '#/insights' }, 'By chapter →'))
      : '',
  );
  return () => {};
}

// ---------- Question ----------

const TYPE_LABEL = (q: Question) => (q.id.startsWith('def-') ? 'Definition' : q.type === 'numeric' ? 'Problem' : 'Concept');

function renderQuestion(root: HTMLElement, rerender: () => void): () => void {
  const s = session!;
  const q = s.questions[s.index];
  const answered = s.response !== null;
  const correct = answered ? s.results[s.index] : false;

  const submit = (response: number | string) => {
    if (s.response !== null) return;
    if (typeof response === 'string' && !response.trim()) return;
    const ok = grade(q, response);
    s.response = response;
    s.results[s.index] = ok;
    state.practice.push({ id: uid(), questionId: q.id, topic: q.topic, correct: ok, timestamp: Date.now() });
    save();
    rerender();
  };
  const next = () => {
    s.index++;
    s.response = null;
    rerender();
    window.scrollTo(0, 0);
  };

  root.append(
    h('div', { class: 'review-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'End quiz', title: 'End quiz', onclick: () => { session = null; rerender(); } }, icon('x')),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': s.questions.length, 'aria-valuenow': s.index },
        h('i', { style: `width:${(s.index / s.questions.length) * 100}%` })),
      h('span', { class: 'progress-label' }, `${s.index + 1} / ${s.questions.length}`),
    ),
  );

  const card = h('section', { class: 'quiz-card' },
    h('div', { class: 'inline' }, h('span', { class: 'chip accent' }, TYPE_LABEL(q)), sourceLabel(q.source)),
    q.type === 'mc' && q.quote
      ? h('div', {}, h('p', { class: 'eyebrow', style: 'margin-top:12px' }, 'Which term is defined here?'), mathBlock(q.prompt, 'math quiz-prompt quote'))
      : mathBlock(q.prompt, 'math quiz-prompt'),
  );

  let input: HTMLInputElement | null = null;
  if (q.type === 'mc') {
    card.append(h('div', { class: 'choices' },
      q.choices.map((c, i) => {
        const state = !answered ? '' : i === q.answer ? ' correct' : i === s.response ? ' wrong' : '';
        return h('button', { class: `choice${state}`, disabled: answered, onclick: () => submit(i) },
          h('span', { class: 'letter' }, 'ABCD'[i]), mathBlock(c, 'math'));
      }),
    ));
  } else {
    input = h('input', {
      type: 'text', inputMode: 'decimal', autocomplete: 'off', placeholder: 'Your answer, e.g. 6693 or 2π/10',
      value: typeof s.response === 'string' ? s.response : '', disabled: answered, 'aria-label': 'Answer',
    });
    card.append(
      h('form', { class: 'numeric', onsubmit: (e: Event) => { e.preventDefault(); submit(input!.value); } },
        input,
        q.unit ? h('span', { class: 'unit' }, q.unit) : '',
        answered ? '' : h('button', { class: 'btn primary', type: 'submit' }, 'Check'),
      ),
    );
  }

  if (answered) {
    card.append(
      h('div', { class: `feedback ${correct ? 'ok' : 'bad'}` },
        h('div', { class: 'feedback-head' }, icon(correct ? 'check' : 'x', 18), correct ? 'Correct' : 'Not quite',
          q.type === 'numeric' ? h('span', { class: 'mono', style: 'margin-left:auto;font-weight:500' }, `answer ≈ ${fmtAnswer(q.answer)}${q.unit ? ` ${q.unit}` : ''}`) : ''),
        mathBlock(q.explain, 'math'),
      ),
      h('div', { class: 'sheet-actions', style: 'margin-top:14px' },
        h('button', { class: 'btn primary', onclick: next },
          s.index + 1 < s.questions.length ? 'Next question' : 'See results', h('kbd', {}, 'Enter')),
      ),
    );
  }
  root.append(card);
  if (input && !answered) setTimeout(() => input!.focus(), 30);

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement && !answered) return;
    if (answered && e.key === 'Enter') { e.preventDefault(); next(); return; }
    if (!answered && q.type === 'mc') {
      const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (i >= 0 && i < q.choices.length) submit(i);
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function fmtAnswer(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  return String(Math.round(v * 1000) / 1000);
}

// ---------- Summary ----------

function renderSummary(root: HTMLElement, rerender: () => void): () => void {
  const s = session!;
  const right = s.results.filter(Boolean).length;
  const missed = s.questions.filter((_, i) => !s.results[i]);
  const frac = right / s.questions.length;

  const R = 52, C = 2 * Math.PI * R;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 120 120');
  ring.setAttribute('width', '120');
  ring.setAttribute('height', '120');
  ring.innerHTML =
    `<circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>` +
    `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${frac >= 0.7 ? 'var(--green)' : frac >= 0.4 ? 'var(--orange)' : 'var(--red)'}" stroke-width="10" ` +
    `stroke-linecap="round" stroke-dasharray="${C * frac} ${C}" transform="rotate(-90 60 60)"/>` +
    `<text x="60" y="58" text-anchor="middle" font-family="var(--font-serif)" font-size="26" font-weight="600" fill="var(--ink)">${right}/${s.questions.length}</text>` +
    `<text x="60" y="78" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--muted)">${pct(frac)}</text>`;

  root.append(
    h('div', { class: 'done', style: 'padding-bottom:20px' },
      ring,
      h('h1', {}, frac === 1 ? 'Perfect score' : frac >= 0.7 ? 'Nicely done' : 'Keep at it'),
      h('p', { class: 'text-2' }, missed.length ? `Review the ${missed.length} you missed below.` : 'You got every question right.'),
      h('div', { class: 'inline', style: 'justify-content:center' },
        missed.length ? h('button', { class: 'btn primary', onclick: () => { start(s.mode, missed); rerender(); } }, icon('refresh', 16), 'Retry missed') : '',
        h('button', { class: 'btn', onclick: () => { start(s.mode); rerender(); } }, 'New quiz'),
        h('button', { class: 'btn ghost', onclick: () => { session = null; rerender(); } }, 'Done'),
      ),
    ),
  );
  if (missed.length) {
    root.append(
      h('h2', { class: 'section-title' }, 'Worth another look'),
      ...missed.map((q) =>
        h('section', { class: 'ref-entry' },
          h('div', { class: 'ref-entry-head' }, h('span', { class: 'chip accent' }, TYPE_LABEL(q)), sourceLabel(q.source)),
          mathBlock(q.type === 'mc' && q.quote ? `Defined: ${q.choices[q.answer]}` : q.prompt, 'math ref-term'),
          mathBlock(q.explain, 'math ref-body'),
        )),
    );
  }
  return () => {};
}
