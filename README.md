# Recall Rate

A study app for Differential Equations (Lectures 1–11), built on a forgetting-curve model:
each card's predicted recall obeys dR/dt = −R/S, so R(t) = e^(−t/S).


Data is stored in the browser's `localStorage` (key `recall-rate/v1`). Export a deck to back it up.

## What's inside

- **Today** — one session a day: everything due this study day (days roll over at 4 am), lowest predicted recall
  first, plus up to 15 new cards in lecture order. Gaps are never shorter than 1 day; missed cards get a second look
  at the end of the session (not logged, doesn't change scheduling). Cards that come due overnight just wait.
- **Exam dates** — set from Today or a deck page. New cards are paced so every card is introduced before the final
  2-day window, gaps are capped at 20% of the time left (floored at 1 day), every card comes up again in the final
  window, and Insights shows readiness (predicted recall on exam day).
- **Problem versions** — each worked-example card ("solve this IVP", "find the eigenvalues"…) has 5 versions:
  the lecture's original plus 4 with different numbers (`src/data/variants.ts`). Reviews pick a random version,
  never the one shown last time, so you practice the method instead of memorizing one answer. The scheduler tracks
  the problem type. Every version's answer is generated from its parameters and checked numerically in the tests.
- **Decks / Reference** — three chapter decks with every definition from the notes word for word, plus theorems,
  remarks, methods and worked examples. Reference is a searchable glossary of all of it, grouped by lecture.
- **Practice** — quizzes: definitions (generated from the verbatim definitions), concepts, and numeric problems
  from the lecture examples. Numeric answers accept expressions like `2π/10` or `√5/2`.
- **Labs** — slope fields & solution curves, harvesting & bifurcation, Picard iteration, spring–mass vibrations,
  eigenvalues by shooting.
- **Insights** — fitted half-life per deck (least squares on ln R = −t/S), power-law comparison, practice accuracy,
  and **The Math**: an interactive walkthrough of the ODE, stability updates, exam cap and both fits.

## Layout

- `src/config.ts` — all tunable constants
- `src/model/` — forgetting curve, stability updates, scheduler, exam rules, daily queue
- `src/fit/` — exponential and power-law least-squares fits
- `src/data/course.ts` — course content; `src/data/sync.ts` merges it into saved progress by stable id
- `src/practice/` — question bank, quiz engine, safe expression parser
- `src/labs/numerics.ts` — RK4, equilibria, Picard iterates, spring closed forms, shooting
- `src/ui/` — screens, SVG plotting, KaTeX rendering
- `tests/` — Vitest (model, scheduler, fits, content/KaTeX validity, quiz, numerics, import/export)

## Notes on the content

Definitions are verbatim. In three worked examples the lecture notes contain a slip, and the cards use the corrected math:

- §1.3: for dy/dt = −y(y−2), y(0) = −1, the solution is y = 2/(1 − 3e^(−2t)), which exists for t < ½ ln 3.
- §2.1: for dP/dt = 0.6P(P−4), the exponent is 2.4t (= 0.6·4), not 0.24t.
- §3.3: r² + 2r + 4 = 0 has roots r = −1 ± √3 i, so y = e^(−t)(c₁cos√3t + c₂sin√3t).

In the eigenvalue-problem definition (§3.8) the notes write p(t)y; the card uses p(t)y′, matching the
2nd-order linear form used everywhere else.
