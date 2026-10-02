import { COURSE, type CourseCard } from '../data/course';
import { CONCEPTS, PROBLEMS, type McQuestion, type Question, type Topic } from './bank';
import { evaluate } from './expr';

export type Mode = 'definitions' | 'concepts' | 'problems' | 'mixed';

/** Small seeded PRNG (mulberry32) so quizzes are reproducible in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Hide the defined term(s) in a definition, leaving LaTeX ($…$) untouched. */
export function maskDefinition(text: string, masks: string[]): string {
  const sorted = masks.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!sorted.length) return text;
  const pattern = new RegExp(sorted.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  return text
    .split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(pattern, '_____')))
    .join('');
}

const DEFS: { card: CourseCard; topic: Topic }[] = COURSE.flatMap((d) =>
  d.cards.filter((c) => c.kind === 'definition').map((card) => ({ card, topic: d.id as Topic })));

function pickDistractors<T>(pool: T[], same: (x: T) => boolean, n: number, rand: () => number): T[] {
  const near = shuffle(pool.filter(same), rand);
  const far = shuffle(pool.filter((x) => !same(x)), rand);
  return [...near, ...far].slice(0, n);
}

/** One multiple-choice question per definition, alternating direction at random. */
export function definitionQuestions(topics: Topic[], rand: () => number): McQuestion[] {
  const pool = DEFS.filter((d) => topics.includes(d.topic));
  return pool.map(({ card, topic }) => {
    const others = DEFS.filter((d) => d.card.id !== card.id && d.card.term !== card.term);
    const distractors = pickDistractors(others, (d) => d.topic === topic, 3, rand);
    const askTerm = (card.mask?.length ?? 0) > 0 && rand() < 0.6;
    const options = shuffle([{ d: card, correct: true }, ...distractors.map((x) => ({ d: x.card, correct: false }))], rand);
    const answer = options.findIndex((o) => o.correct);
    if (askTerm) {
      return {
        id: `def-term-${card.id}`, topic, source: card.source, type: 'mc', quote: true,
        prompt: maskDefinition(card.definition!, card.mask ?? []),
        choices: options.map((o) => o.d.term!),
        answer,
        explain: card.definition!,
      };
    }
    return {
      id: `def-def-${card.id}`, topic, source: card.source, type: 'mc',
      prompt: `Which is the definition of “${card.term}”?`,
      choices: options.map((o) => maskDefinition(o.d.definition!, o.d.mask ?? [])),
      answer,
      explain: card.definition!,
    };
  });
}

export function buildQuiz(mode: Mode, topics: Topic[], count: number, rand: () => number): Question[] {
  const inTopic = <Q extends Question>(qs: Q[]) => qs.filter((q) => topics.includes(q.topic));
  let pool: Question[];
  if (mode === 'definitions') pool = definitionQuestions(topics, rand);
  else if (mode === 'concepts') pool = inTopic(CONCEPTS);
  else if (mode === 'problems') pool = inTopic(PROBLEMS);
  else {
    // Mixed: a balanced blend of all three kinds.
    const third = Math.ceil(count / 3);
    pool = [
      ...shuffle(definitionQuestions(topics, rand), rand).slice(0, third),
      ...shuffle(inTopic(CONCEPTS), rand).slice(0, third),
      ...shuffle(inTopic(PROBLEMS), rand).slice(0, third),
    ];
  }
  return shuffle(pool, rand).slice(0, count);
}

/** Grade a response: choice index for multiple choice, text expression for numeric. */
export function grade(q: Question, response: number | string): boolean {
  if (q.type === 'mc') return response === q.answer;
  const v = typeof response === 'number' ? response : evaluate(response);
  if (!Number.isFinite(v)) return false;
  return Math.abs(v - q.answer) <= Math.max(q.tolerance * Math.abs(q.answer), 1e-9);
}

export function poolSize(mode: Mode, topics: Topic[]): number {
  const defs = DEFS.filter((d) => topics.includes(d.topic)).length;
  const c = CONCEPTS.filter((q) => topics.includes(q.topic)).length;
  const p = PROBLEMS.filter((q) => topics.includes(q.topic)).length;
  return mode === 'definitions' ? defs : mode === 'concepts' ? c : mode === 'problems' ? p : defs + c + p;
}
