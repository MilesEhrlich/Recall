// Course content for Differential Equations, Lectures 1–11.
// Definitions keep the exact wording of the lecture notes; `extra` holds the
// surrounding examples/formulas shown under the definition on the card back.
// LaTeX: $...$ inline, $$...$$ display. String.raw keeps backslashes intact.

import type { CardKind } from '../model/types';
import { VARIANTS, type Variant } from './variants';

const r = String.raw;

export interface CourseCard {
  /** Stable id so content updates can be merged into saved progress. */
  id: string;
  kind: CardKind;
  source: string;
  /** The question shown on the front of the card. */
  front: string;
  back: string;
  /** Short name of the card (e.g. "Separable equation"), used as a heading in Reference. */
  title: string;
  /** Worked examples: 5 interchangeable versions (the lecture's original first). One is picked per review. */
  variants?: Variant[];
  /** Definitions only: the term, its verbatim definition, and words to hide in quiz prompts. */
  term?: string;
  definition?: string;
  mask?: string[];
}

export interface CourseDeck {
  id: string;
  name: string;
  description: string;
  cards: CourseCard[];
}

function def(id: string, source: string, term: string, definition: string, extra?: string, mask?: string[]): CourseCard {
  return {
    id, kind: 'definition', source, front: term, title: term,
    back: extra ? `${definition}\n\n${extra}` : definition,
    term, definition, mask: mask ?? [term],
  };
}

function card(kind: CardKind, id: string, source: string, front: string, back: string): CourseCard {
  return { id, kind, source, front, back, title: front };
}

const L1 = 'Lecture 1 · §1.1';
const L2a = 'Lecture 2 · §1.2';
const L2b = 'Lecture 2 · §1.3';
const L3 = 'Lecture 3 · §1.4';
const L4 = 'Lecture 4 · §1.5';
const L5 = 'Lecture 5 · Appendix 1';
const L6 = 'Lecture 6 · §2.1';
const L7 = 'Lecture 7 · §2.2';
const L8 = 'Lecture 8 · §3.1';
const L9 = 'Lecture 9 · §3.1, 3.3';
const L10a = 'Lecture 10 · §3.4';
const L10b = 'Lecture 10 · §3.5';
const L11 = 'Lecture 11 · §3.8';

// ───────────────────────── Chapter 1 ─────────────────────────

const CH1: CourseCard[] = [
  // Lecture 1 · §1.1 Differential equations
  def('l1-ode', L1, 'Ordinary differential equation (ODE)',
    'An ordinary differential equation (ODE) is an equation relating unknown function and its derivatives.',
    r`Ex) $\dfrac{dy}{dt} = 2y\cdot t$.  Ex) $\dfrac{d^2y}{dt^2} + \dfrac{dy}{dt} - 6 = 0$.`,
    ['ordinary differential equation (ODE)', 'ordinary differential equation']),
  def('l1-solution', L1, 'Solution of an ODE',
    r`A solution of an ODE is a function $y(t)$ satisfying the equation.`,
    r`Ex) $y(t) = Ce^{t^2}$ solves $\dfrac{dy}{dt} = 2yt$, because $\dfrac{dy}{dt} = Ce^{t^2}\cdot 2t = 2yt$.`,
    ['solution']),
  def('l1-order', L1, 'Order of an ODE',
    'order = order of highest derivative.',
    r`An ODE can be written $F(t, y, y', \dots, y^{(n)}) = 0$.  Ex) $2yt - y' = 0$ has order 1.`,
    ['order']),
  card('remark', 'l1-why', L1, 'Why study differential equations?',
    r`A. All scientific laws are described as a differential equation.

Ex) Newton's law of motion: $F = ma$. Reality: $-G\dfrac{Mm\,\vec X(t)}{|\vec X(t)|^3} = m\vec X''(t)$. Solving it ⇒ getting $\vec X(t)$ & understand the motion.`),
  card('method', 'l1-growth', L1, r`Population growth: $\dfrac{dP}{dt} = kP$`,
    r`Assumption: birth & death are proportional to population ⇒ $\dfrac{dP}{dt} = kP$.
Solve ⇒ $P(t) = Ce^{kt}$, and $P(0) = C$ ⇒ $$P(t) = P(0)e^{kt}.$$
lesson: If we know initial condition & $k$ we can predict $P(t)$!`),

  // Lecture 2 · §1.2 Integrals as solutions
  def('l2-first-order', L2a, 'First order equation',
    r`We focus on the first order equation $\dfrac{dy}{dt} = f(t,y)$. (or $\dfrac{dy}{dx} = f(x,y)$)`,
    r`Simplest case: $\dfrac{dy}{dt} = f(t)$ ⇒ $y = \int f(t)\,dt + C$.`,
    ['first order equation']),
  card('example', 'l2-ex-ivp', L2a, r`Solve the IVP $\dfrac{dy}{dt} = 4t - 3$, $y(1) = 10$.`,
    r`$y = \int 4t - 3\,dt = 2t^2 - 3t + C$.
$10 = y(1) = 2 - 3 + C = C - 1$ ⇒ $C = 11$.
$$\therefore\ y(t) = 2t^2 - 3t + 11.$$`),
  card('example', 'l2-ex-ball', L2a, 'A ball is thrown upward with initial velocity 24 ft/s, at a cliff of 700 ft. When does it hit the ground?',
    r`$s(0) = 700$, $v(0) = 24$, $a(t) = -32$ (gravity).
$v(t) = \int -32\,dt = -32t + 24$.
$s(t) = \int -32t + 24\,dt = -16t^2 + 24t + 700$.
$s(t) = 0$ ⇒ $$t = \frac{24 + \sqrt{45376}}{32} \approx 7.407\text{ sec}.$$`),
  card('example', 'l2-ex-lunar', L2a, 'A lunar module is falling at a speed of 450 m/s. Its engine, when fired, provide decelleration of 2.5 m/s². To land softly, at what height should the engine be activated?',
    r`$y'(t) = v(t) = -450 + 2.5t$, so $y(t) = -450t + 1.25t^2 + C$ where $C = y(0)$ = height when the engine is activated.
landing softly ⇔ $y(t_0) = 0$, $v(t_0) = 0$.
$v(t_0) = 0$ ⇒ $t_0 = 180$. $y(180) = 0$ ⇒ $C = 40{,}500$.
∴ need to activate at 40,500 m.`),

  // Lecture 2 · §1.3 Slope field
  def('l2-slope-field', L2b, 'Slope field',
    r`We may approach geometrically. (draw slope field)
$f(t,y) = \dfrac{dy}{dt}$ = slope at $(t,y)$.
Strategy: draw the slope at every point $(t,y)$. ($= \dfrac{dy}{dt} = f(t,y)$)`,
    r`Why: we may not use the same approach for $\dfrac{dy}{dt} = f(t,y)$, because $y(t) = \int f(t, y(t))\,dt$ contains the unknown $y(t)$.`,
    ['slope field', 'slope']),
  def('l2-solution-curve', L2b, 'Solution curve',
    r`For a point $(t_0, y(t_0))$. One may draw a curve whose slope is the drawn slope. (= solution curve)`,
    r`One may observe some properties of solutions from the slope field.`,
    ['solution curve']),
  card('example', 'l2-ex-slope', L2b, r`Slope field of $\dfrac{dy}{dt} = -y(y-2)$: what happens to solutions?`,
    r`Slopes: at $(1,1)$: $1$; at $(1,2)$: $0$; at $(-1,3)$: $-3$; at $(1,0)$: $0$; at $(0,\tfrac12)$: $\tfrac34$.
• If $y(t_0) > 0$ at some $t_0$, $\lim_{t\to\infty} y(t) = 2$.
• If $y(t_0) < 0$ at some $t_0$, as $t\nearrow$, $y(t)\searrow -\infty$.
Indeed, if $y(0) = -1$, $y(t) = \dfrac{2}{1 - 3e^{-2t}}$, which exists only for $t < \tfrac12\ln 3$.`),
  card('remark', 'l2-nonexist', L2b, 'Must an IVP have a solution defined for all t?',
    r`Rmk. For an IVP, a solution may not exist.
Ex) $y' = \frac1t$, $y(0) = 0$: $y(t) = \ln|t| + C$ ⇒ $y(0) = \ln 0 + C$ does not exist.

Rmk. A solution may not exist for all $t \in \mathbb{R}$ (⇔ The domain of $y(t)$ may be smaller than $\mathbb{R}$).`),
  card('theorem', 'l2-eu', L2b, 'Existence & uniqueness theorem (first order IVP)',
    r`Thm. Suppose $f(t,y)$ and $\dfrac{\partial}{\partial y}f(t,y)$ are continuous on some rectangle $R$ containing $(a,b)$. Then $\exists$ interval $I \ni a$ such that the IVP $\dfrac{dy}{dt} = f(t,y)$, $y(a) = b$ has a unique solution $y(t)$ defined on $I$.`),

  // Lecture 3 · §1.4 Separable equations
  def('l3-separable', L3, 'Separable equation',
    r`If $f(t,y)$ can be written $g(t)k(y)$, then the ODE is called separable.`,
    r`Ex) $\dfrac{dy}{dt} = -6ty$ … separable.  Ex) $\dfrac{dy}{dt} = t^2 + y^2$ … not separable.
Ex) $t + y\dfrac{dy}{dt} = 0$ ⇒ $\dfrac{dy}{dt} = -t\cdot\dfrac1y$ … separable.`,
    ['separable']),
  card('method', 'l3-separable-method', L3, 'How to solve a separable equation',
    r`$\dfrac{dy}{dt} = g(t)k(y)$ ⇒ $\dfrac{1}{k(y)}\dfrac{dy}{dt} = g(t)$ & integral (substitution):
$$\int \frac{1}{k(y)}\,dy = \int \frac{1}{k(y)}\frac{dy}{dt}\,dt = \int g(t)\,dt.$$
Ex) $\dfrac{dy}{dt} = -6ty$: $\ln|y| = -3t^2 + C$ ⇒ $y = \pm e^{C}e^{-3t^2} = Ae^{-3t^2}$.`),
  card('example', 'l3-ex-ivp', L3, r`Solve the IVP $\dfrac{dy}{dt} = -6ty$, $y(0) = 2$.`,
    r`$y(t) = Ae^{-3t^2}$ ⇒ $2 = y(0) = A$. $$y(t) = 2e^{-3t^2}.$$`),
  card('example', 'l3-ex-domain', L3, r`Solve $\dfrac{dy}{dt} = -2t(1+y)^2$, $y(0) = -5$. What is the domain?`,
    r`$-\dfrac{1}{1+y} = -t^2 + C$ ⇒ $y = \dfrac{1}{t^2 - C} - 1$.
Rmk. The domain of the solution depends on $C$: $C<0$: $(-\infty,\infty)$; $C=0$: $(-\infty,0)$ or $(0,\infty)$; $C>0$: $(-\infty,-\sqrt C)$, $(-\sqrt C,\sqrt C)$ or $(\sqrt C,\infty)$.
$-5 = \dfrac{1}{0 - C} - 1$ ⇒ $C = \tfrac14$, so $y(t) = \dfrac{1}{t^2 - \frac14} - 1$ with domain $(-\tfrac12, \tfrac12)$.`),
  def('l3-implicit', L3, 'Implicit solution',
    r`$y^3 - 5y - 4t + t^2 = C$ ← difficult to solve. … implicit solution.`,
    r`The solution is only given implicitly: an equation relating $y$ and $t$ that is difficult to solve for $y$.
From Ex) $\dfrac{dy}{dt} = \dfrac{4-2t}{3y^2-5}$: $\int 3y^2 - 5\,dy = \int 4 - 2t\,dt$ ⇒ $y^3 - 5y = 4t - t^2 + C$.`,
    ['implicit solution']),
  card('example', 'l3-ex-bacteria', L3, 'A bacteria culture grows. Initially it was 60. After 6 hours, it is 42500. When will the population reach 1,000,000?',
    r`$P(t) = 60e^{kt}$. $42500 = 60e^{6k}$ ⇒ $k = \tfrac16\ln\tfrac{42500}{60} \approx 1.09382$.
$10^6 = 60e^{1.09382t}$ ⇒ $$t = \frac{1}{1.09382}\ln\frac{10^6}{60} \approx 8.887\text{ hrs}.$$`),
  def('l3-half-life', L3, 'Half-life',
    'half-life = time required for the half of the quantity decay.',
    r`Radioactive decay: $\dfrac{dm}{dt} = -km$ ⇒ $m(t) = Ae^{-kt}$, $A = m(0)$ = initial mass.
$\tfrac12 A = Ae^{-k\,t_{1/2}}$ ⇒ $k = \dfrac{\ln 2}{t_{1/2}}$.`,
    ['half-life']),
  card('example', 'l3-ex-carbon', L3, 'A tree is killed in a volcanic eruption. It contains 44.5% of ¹⁴C that can be found in a living matters. When was the eruption? (half-life of ¹⁴C = 5730 years)',
    r`$m(t) = Ae^{-kt}$ with $k = \dfrac{\ln 2}{5730}$. Want $m(t) = 0.445A$:
$0.445 = e^{-kt}$ ⇒ $$t = -\frac1k\ln 0.445 = -5730\,\frac{\ln 0.445}{\ln 2} \approx 6693\text{ years}.$$
(Method developed by William Libby (1949), won Nobel prize.)`),

  // Lecture 4 · §1.5 First order linear equation
  def('l4-linear', L4, 'First order linear equation',
    r`A first order linear equation is an ODE of the form $\dfrac{dy}{dt} + P(t)y = Q(t)$. ($\Leftrightarrow \dfrac{dy}{dt} = -P(t)y + Q(t)$)`,
    undefined,
    ['first order linear equation']),
  def('l4-integrating-factor', L4, 'Integrating factor',
    r`Goal. Find $\rho(t)$ such that $\rho(t)\left(\dfrac{dy}{dt} + P(t)y\right) = \dfrac{d}{dt}F(t,y)$.
$\Rightarrow \rho(t) = e^{\int P(t)\,dt}$.
Strategy. Multiply $e^{\int P(t)\,dt}$ and solve it. $F(t,y) = \rho(t)y$.`,
    r`Derivation: $\dfrac{\partial F}{\partial y} = \rho(t)$, $\dfrac{\partial F}{\partial t} = \rho(t)P(t)y$ ⇒ $F = \rho(t)y$ ⇒ $\rho'(t) = \rho(t)P(t)$ ⇒ $\ln\rho(t) = \int P(t)\,dt$.`,
    ['integrating factor']),
  card('example', 'l4-ex-1', L4, r`Solve $\dfrac{dy}{dt} - 2y = 3e^{2t}$.`,
    r`$P(t) = -2$, $Q(t) = 3e^{2t}$, $\rho(t) = e^{\int -2\,dt} = e^{-2t}$.
$\dfrac{d}{dt}\left(e^{-2t}y\right) = e^{-2t}\cdot 3e^{2t} = 3$ ⇒ $e^{-2t}y = 3t + C$.
$$y = e^{2t}(3t + C).$$`),
  card('example', 'l4-ex-2', L4, r`Solve $(t^2+1)\dfrac{dy}{dt} + 3ty = 6t$.`,
    r`$\dfrac{dy}{dt} + \dfrac{3t}{t^2+1}y = \dfrac{6t}{t^2+1}$. $\int P\,dt = \tfrac32\ln(t^2+1)$ ⇒ $\rho(t) = (t^2+1)^{3/2}$.
$(t^2+1)^{3/2}y = \int (t^2+1)^{1/2}\,6t\,dt = 2(t^2+1)^{3/2} + C$.
$$y = 2 + C(t^2+1)^{-3/2}.$$`),
  def('l4-cooling', L4, "Newton's law of cooling",
    "Newton's law of cooling: The rate of the heat loss is proportional to the difference in temperatures between the body and the environment.",
    r`$$\frac{dT}{dt} = -k(T - A)\quad (k > 0\text{: const … insulation})$$
$T(t)$: temperature of a body. $A(t)$: temperature of the environment.`,
    ["Newton's law of cooling"]),
  card('example', 'l4-ex-tucson', L4, r`On a typical July in Tucson, AZ, the outside temperature is $A(t) = 89 - 12\cos\frac{\pi}{12}(t-4)$ ($t$: hrs from midnight). At midnight the inside temperature was $T(0) = 80$°F. What is the max. temperature of the house, roughly? ($k = 0.4$)`,
    r`$\dfrac{dT}{dt} + 0.4T = 35.6 - 4.8\cos\frac{\pi}{12}(t-4)$, $\rho = e^{0.4t}$.
$T \approx -10.025\sin 0.262t + 0.561\cos 0.262t + 89 + Ce^{-0.4t} \lesssim 99$°F.`),

  // Lecture 5 · Appendix 1 Picard iteration
  card('remark', 'l5-multiple', L5, 'Does an IVP always have exactly one solution?',
    r`Rmk. An IVP may have multiple solutions or no solution. That's why we need conditions that guarantee existence and uniqueness (the Lipschitz condition, below).`),
  card('theorem', 'l5-picard-thm', L5, 'Existence & uniqueness under the Lipschitz condition',
    r`Thm. $I :=$ open interval containing $a$. Suppose $f(t,y)$ is continuous and satisfies the Lipschitz condition in $y$ on $D = \{(t,y) \mid t \in I,\ y \in \mathbb{R}\}$. Then the IVP $\dfrac{dy}{dt} = f(t,y)$, $y(a) = b$ has a unique solution on $I$.`),
  def('l5-lipschitz', L5, 'Lipschitz condition (LC)',
    r`$f(t,y)$ satisfies the Lipschitz condition (LC) in $y$ on $D = \{(t,y) \mid t \in I,\ y \in \mathbb{R}\}$ if $\exists k > 0$ such that $|f(t,y_1) - f(t,y_2)| \le k|y_1 - y_2|$ $\forall t, y_1, y_2$.`,
    r`Ex) $f(t,y) = t\sin(ty)$ on $0 \le t \le 2$: by the MVT, $|f(t,y_1) - f(t,y_2)| = |t|^2|\cos(t\xi)||y_1 - y_2| \le 4|y_1 - y_2|$. ∴ $f$ satisfies the LC on $D$.`,
    ['Lipschitz condition (LC)', 'Lipschitz condition', 'LC']),
  card('remark', 'l5-mvt', L5, 'A quick test for the Lipschitz condition',
    r`Rmk. By the MVT, if $\left|\dfrac{\partial f}{\partial y}(t,y)\right| \le k$ on $D$, $f$ satisfies LC on $D$.`),
  card('method', 'l5-picard', L5, 'Picard iteration',
    r`A solution of IVP * satisfies $y(t) = b + \int_a^t f(x, y(x))\,dx$. Let's construct successive iterations.
$$y_0(t) := b,\qquad y_{n+1}(t) := b + \int_a^t f(x, y_n(x))\,dx$$
→ $\{y_n(t)\}$ … sequence of functions. Let $y(t) := \lim_{n\to\infty} y_n(t)$. Need to justify: does it exist, and can we switch the order of integral and limit?`),
  card('remark', 'l5-switch', L5, 'Can we always switch the order of integral and limit?',
    r`Not always!
Ex) $f_n(t) := t^n$ on $[0,1]$: $f(t) = 0$ for $0 \le t < 1$ and $f(1) = 1$ ⇒ $f(t)$ is not continuous.
Ex) $f_n$ = a spike of height $2n$ on $[0, \tfrac1n]$: $\int_0^1 f_n\,dt = 1$ for every $n$, but $\int_0^1 \lim f_n\,dt = \int_0^1 0\,dt = 0$.`),
  def('l5-uniform', L5, 'Uniform convergence',
    r`$f_n(t) \to f(t)$ uniformly if $\forall \varepsilon > 0$, $\exists n_0$ for all $t$, if $n \ge n_0$, $|f_n(t) - f(t)| < \varepsilon$. ($f_n(t) \rightrightarrows f(t)$)`,
    r`Compare: $\lim_{n\to\infty} f_n(t) = f(t) \Leftrightarrow \forall\varepsilon > 0$, $\exists n_0$ for each $t$, if $n \ge n_0$, $|f_n(t) - f(t)| < \varepsilon$.`,
    ['uniformly', 'uniform convergence']),
  card('theorem', 'l5-uniform-thm', L5, 'What does uniform convergence give you?',
    r`Thm. If $f_n(t) \rightrightarrows f(t)$ then
① $f(t)$ is continuous.
② integral & limit can be exchanged.`),
  card('method', 'l5-bound', L5, 'Why Picard iterates converge (the bound)',
    r`Upshot. For $y_{n+1}(t) = b + \int_a^t f(x, y_n(x))\,dx$, $y_n(t) \rightrightarrows y(t)$ over $[0,T]$.
$M := \max\{|f(t,b)|\}$. Using LC:
$|y_1 - y_0| \le MT$, $|y_2 - y_1| \le kM\dfrac{T^2}{2}$, $|y_3 - y_2| \le k^2M\dfrac{T^3}{3!}$, …`),
];

// ───────────────────────── Chapter 2 ─────────────────────────

const CH2: CourseCard[] = [
  // Lecture 6 · §2.1 Population models
  def('l6-malthus', L6, 'Malthus model',
    r`Assumption in Malthus model: $\beta, \delta$ are constant. $\dfrac{dP}{dt} = kP$. ($P(t) = P_0e^{kt}$)`,
    r`$\beta(t)$: number of births per unit population per unit time. $\delta(t)$: number of deaths per unit population per unit time.
$\Delta P = \beta(t)P(t)\Delta t - \delta(t)P(t)\Delta t$ ⇒ $\dfrac{dP}{dt} = (\beta - \delta)P$.`,
    ['Malthus model', 'Malthus']),
  def('l6-logistic', L6, 'Logistic model',
    r`Assumption: resource is limited ⇒ $\beta(t)\searrow$ if $P(t)\nearrow$.
$$\frac{dP}{dt} = kP(M - P)\ \dots\ \text{logistic model.}$$`,
    r`$\beta = \beta_0 - \beta_1P$ ($\beta_0, \beta_1 > 0$): $\dfrac{dP}{dt} = (\beta_0 - \beta_1P - \delta)P = aP - bP^2 = kP(M-P)$ with $k = b$, $M = \dfrac ab$.
Rmk. Logistic equations can be derived in many different ways.`,
    ['logistic model', 'logistic']),
  def('l6-carrying', L6, 'Carrying capacity',
    r`$M$: carrying capacity.`,
    r`For $\dfrac{dP}{dt} = kP(M-P)$ with $P_0 > 0$: $\lim_{t\to\infty} P(t) = M$.`,
    ['carrying capacity']),
  card('example', 'l6-ex-logistic', L6, r`Solve $\dfrac{dP}{dt} = 0.6P(4 - P)$.`,
    r`Partial fractions: $\dfrac{1}{P(4-P)} = \dfrac14\cdot\dfrac1P + \dfrac14\cdot\dfrac{1}{4-P}$ ⇒ $\tfrac14\ln\left|\dfrac{P}{4-P}\right| = 0.6t + C$.
$\dfrac{P}{4-P} = \dfrac{P_0}{4-P_0}e^{2.4t}$ ⇒ $$P = \frac{4P_0}{P_0 + (4 - P_0)e^{-2.4t}},\qquad \lim_{t\to\infty}P(t) = 4.$$`),
  card('example', 'l6-cannibalism', L6, 'Cannibalism model',
    r`Assumption. $\beta$: constant, $\delta = \alpha P$.
$$\frac{dP}{dt} = (\beta - \alpha P)P = \alpha P\left(\frac{\beta}{\alpha} - P\right).$$`),
  def('l6-disease', L6, 'Contagious disease model',
    r`Assumption. $P(t)$: number of infected people. $M$: total population. A disease is spread if an infected person and a non-infected person meet. ⇒ $\dfrac{dP}{dt} = kP(M - P)$.`,
    undefined,
    ['disease']),
  def('l6-allee', L6, 'Allee effect',
    r`In reality, if the initial population is small, the population becomes extinct. $\dfrac{dP}{dt} = k(M - P)P(P - a)$. ($0 < a < M$)`,
    undefined,
    ['Allee effect']),
  def('l6-doomsday', L6, 'Doomsday model',
    r`Assumption. They reproduce males ($\frac P2$) and females ($\frac P2$) meet. ⇒ $\beta P = kP^2$ ⇒ $\beta = kP$ ⇒ $\dfrac{dP}{dt} = (\beta - \delta)P = (kP - \delta)P = kP(P - M)$.`,
    undefined,
    ['doomsday', 'Doomsday']),
  card('example', 'l6-ex-doomsday', L6, r`Solve $\dfrac{dP}{dt} = 0.6P(P - 4)$. What happens for $P_0 < 4$ and $P_0 > 4$?`,
    r`$\dfrac{P}{P-4} = \dfrac{P_0}{P_0-4}e^{-2.4t}$ ⇒ $$P = \frac{4P_0}{P_0 - (P_0 - 4)e^{2.4t}}.$$
If $P_0 < 4$: $t\to\infty$ ⇒ denom → ∞ ⇒ $P \to 0$ … extinction.
If $P_0 > 4$: the denominator hits 0 at $t = \frac{1}{2.4}\ln\frac{P_0}{P_0-4}$, and as $t\nearrow$, $P\nearrow\infty$ … doomsday.`),

  // Lecture 7 · §2.2 Equilibrium and stability
  card('remark', 'l7-qualitative', L7, 'Why look at equilibria and stability?',
    r`In many cases, we are interested in qualitative behavior of solutions, not a precise analytic formula.
Q1. What happens to $y(t)$ if $t\to\infty$?
Q2. When do we have a constant solution?`),
  card('example', 'l7-ex-cooling', L7, 'Law of cooling with constant surrounding temperature: what does the slope field show?',
    r`$\dfrac{dT}{dt} = -k(T - A)$ ⇝ $T(t) = A + (T_0 - A)e^{-kt}$.
① For any $T_0$, $T(t)$ approaches $A$.
② If $T_0 = A$, $T(t) = T_0 = A$ … constant. $T(t) = A$ is the unique equilibrium.`),
  def('l7-autonomous', L7, 'Autonomous equation',
    r`A first order ODE is autonomous if $\dfrac{dy}{dt} = f(y)$. (hence separable)`,
    r`Ex) (logistic equation) $\dfrac{dP}{dt} = kP(M - P)$.`,
    ['autonomous']),
  def('l7-equilibrium', L7, 'Equilibrium solution',
    r`An equilibrium solution is a constant solution $y(t) = c$.`,
    undefined,
    ['equilibrium solution', 'equilibrium']),
  def('l7-critical', L7, 'Critical point',
    r`For an autonomous equation $\dfrac{dy}{dt} = f(y)$. $y(t) = c$ is a solution $\Leftrightarrow 0 = \dfrac{dy}{dt} \Leftrightarrow f(y) = 0$. ($c$: critical points)`,
    r`Ex) (logistic) $kP(M-P) = 0 \Leftrightarrow P = 0$ or $P = M$ … two critical points, two equilibria.
Rmk. $P(t) = \dfrac{MP_0}{P_0 + (M - P_0)e^{-kMt}}$, but we don't need it to find critical points.`,
    ['critical points', 'critical point']),
  card('example', 'l7-ex-logistic', L7, r`For the logistic equation $\dfrac{dP}{dt} = kP(M-P)$, how does $P(t)$ behave?`,
    r`① if $P_0 > M$, $P(t) \searrow M$.
② if $0 < P_0 < M$, $P(t) \nearrow M$.
③ if $P_0 < 0$, $P(t) \searrow -\infty$ (no meaning as a population).
∴ If $P_0 > 0$, $\lim_{t\to\infty} P(t) = M$.
Even if $P_0$ is close to $0$, $P(t)$ is not.`),
  def('l7-stable', L7, 'Stable / unstable critical point',
    r`We say a critical point $c$ is stable if $P_0$ is close to $c$, $P(t)$ is close to $c$. Otherwise $c$ is unstable.`,
    undefined,
    ['stable', 'unstable']),
  card('example', 'l7-ex-stability', L7, r`$\dfrac{dP}{dt} = P(4 - P)(P - 1)$: critical points, stability, limits?`,
    r`Q1. $P(4-P)(P-1) = 0 \Leftrightarrow P = 0, 1, 4$.
Q2. $P_0 > 4 ⇒ P\searrow 4$; $1 < P_0 < 4 ⇒ P\nearrow 4$; $0 < P_0 < 1 ⇒ P\searrow 0$; $P_0 < 0 ⇒ P\nearrow 0$.
∴ 0, 4 are stable. 1 is unstable.
Q3. $P(t) \to 4$ if $P_0 > 1$; $P(t) = 1$ if $P_0 = 1$; $P(t) \to 0$ if $P_0 < 1$.`),
  card('example', 'l7-ex-fishing', L7, r`Fish in a lake: $\dfrac{dP}{dt} = P(4 - P) - h$ ($h$: amount of fish removed by fishing/year). What happens as $h$ changes?`,
    r`Critical points: $P^2 - 4P + h = 0 \Leftrightarrow P = 2 \pm\sqrt{4-h}$. Let $C_1 := 2 + \sqrt{4-h}$, $C_2 := 2 - \sqrt{4-h}$ ($0 \le h < 4$).
$P_0 > C_1 ⇒ P\searrow C_1$; $C_2 < P_0 < C_1 ⇒ P\nearrow C_1$; $P_0 < C_2 ⇒ P\searrow -\infty$.
$h = 4$: one critical value $c = 2$, unstable. $h > 4$: no critical value, $P(t)\searrow -\infty$.`),
  def('l7-bifurcation', L7, 'Bifurcation diagram',
    r`We may draw a diagram (bifurcation diagram) of $(c, h)$.`,
    r`It plots the critical points $c$ against the parameter $h$, showing where equilibria appear, merge or disappear.
For the fishing model: $c = 2 \pm\sqrt{4-h} \Leftrightarrow (c-2)^2 = 4 - h$, a parabola with its tip at $(h, c) = (4, 2)$.`,
    ['bifurcation diagram', 'bifurcation']),
];

// ───────────────────────── Chapter 3 ─────────────────────────

const CH3: CourseCard[] = [
  // Lecture 8 · §3.1 Linear equations of 2nd order
  def('l8-higher-linear', L8, 'Higher order linear ODE',
    r`A higher order linear ODE is of the form $P_0(t)y^{(n)} + P_1(t)y^{(n-1)} + P_2(t)y^{(n-2)} + \dots + P_{n-1}(t)y' + P_n(t)y = F(t)$.`,
    r`We will focus on the 2nd order linear equations only. $A(t)y'' + B(t)y' + C(t)y = F(t)$. (or $y'' + p(t)y' + q(t)y = f(t)$)
*Any result for 2nd order linear equations can be extended to higher order.
We also assume $p(t), q(t), f(t)$ are all continuous on $I$.  ex) $y'' + e^ty' + t^2y = \cos t$.`,
    ['higher order linear ODE']),
  def('l8-homogeneous', L8, 'Homogeneous linear ODE',
    r`We say a linear ODE is homogeneous if $f(t) = 0$. so $y'' + p(t)y' + q(t)y = 0$. (*)`,
    undefined,
    ['homogeneous']),
  def('l8-hooke', L8, "Hooke's law",
    r`Hook's law: the force given by the spring is proportional to the displacement. ($F_{sp} = -ky$)`,
    r`Newton's law says $F_{sp} = ma = my''$ ⇒ $my'' = -ky$ or $$my'' + ky = 0.$$
If the ground provides some friction, $F_{fr} = -\mu y'$ ⇒ $my'' + \mu y' + ky = 0$.`,
    ["Hook's law", "Hooke's law"]),
  card('theorem', 'l8-thm1', L8, 'Thm 1 (superposition)',
    r`Thm 1. Suppose $y_1, y_2$ are two solutions of a homogeneous equation (*) on an interval $I$. Then for any constants $C_1$ and $C_2$, $y := C_1y_1 + C_2y_2$ is also a solution of (*).`),
  card('theorem', 'l8-thm1p', L8, "Thm 1' (solution space)",
    r`Thm 1'. The set of solutions of a homogeneous equation (*) is a vector space.

proof'. Define $L: C^\infty(I) \to C^\infty(I)$, $L(y) = y'' + py' + qy$. $y$ is a solution of (*) $\Leftrightarrow L(y) = 0 \Leftrightarrow y \in \ker L$.`),
  def('l8-cinf', L8, r`$C^\infty(I)$`,
    r`$C^\infty(I)$ := set of differentiable functions on $I$.`,
    undefined,
    []),
  card('theorem', 'l8-thm2', L8, 'Thm 2 (existence & uniqueness, 2nd order)',
    r`Thm 2. Suppose $p, q, f$ are continuous on $I \ni a$. For any $b_0, b_1 \in \mathbb{R}$, the IVP $y'' + py' + qy = f$, $y(a) = b_0$, $y'(a) = b_1$ has a unique solution.`),
  card('example', 'l8-ex-ivp', L8, r`Solve the IVP $y'' + y = 0$, $y(0) = 3$, $y'(0) = 2$.`,
    r`$\sin t$ and $\cos t$ are two solutions. Set $y = C_1\sin t + C_2\cos t$.
$3 = y(0) = C_2$; $y' = C_1\cos t - C_2\sin t$ ⇒ $2 = y'(0) = C_1$.
$$\therefore\ y = 2\sin t + 3\cos t.$$`),
  def('l8-indep', L8, 'Linearly independent (two functions)',
    r`Two functions $f_1, f_2$ are linearly independent if one is not a scalar multiple of the other. ($f_1 \ne cf_2$, $f_2 \ne cf_1$)`,
    undefined,
    ['linearly independent']),
  card('theorem', 'l8-two-solutions', L8, 'How many independent solutions does (*) have? (Lecture 8)',
    r`Thm. A homogeneous equation (*) has two linearly independent solutions.
Thm'. The dimension of the space of solutions of (*) is at least 2.

proof. Let $y_1$ solve (*) with $y(a) = 1, y'(a) = 0$ and $y_2$ with $y(a) = 0, y'(a) = 1$. If $y_1 = cy_2$ ⇒ $1 = y_1(a) = c\cdot y_2(a) = 0$ ⇒⇐.`),
  card('example', 'l8-ex-tet', L8, r`Find two linearly independent solutions of $y'' - 2y' + y = 0$.`,
    r`$y_1(t) = e^t$, $y_2(t) = te^t$.
Check: $y_2' = e^t + te^t$, $y_2'' = 2e^t + te^t$ ⇒ $y_2'' - 2y_2' + y_2 = 2e^t + te^t - 2(e^t + te^t) + te^t = 0$.`),

  // Lecture 9 · §3.1, 3.3
  card('theorem', 'l9-general', L9, 'General solution of a homogeneous 2nd order linear ODE',
    r`Thm. Any solution of (*) is of the form $y = C_1y_1 + C_2y_2$.
Thm'. The dimension of the space of solutions of (*) is two.

Key step: the system $y_1(a)C_1 + y_2(a)C_2 = y(a)$, $y_1'(a)C_1 + y_2'(a)C_2 = y'(a)$ has a unique solution because $y_1(a)y_2'(a) - y_2(a)y_1'(a) \ne 0$; then uniqueness of the IVP gives $z := C_1y_1 + C_2y_2 = y$.`),
  def('l9-characteristic', L9, 'Characteristic equation',
    r`Guess: $y(t) = e^{rt}$. $y' = re^{rt}$, $y'' = r^2e^{rt}$ ⇒ $ar^2e^{rt} + bre^{rt} + ce^{rt} = 0$ ⇒ $(ar^2 + br + c)e^{rt} = 0$ ⇒ $ar^2 + br + c = 0$.`,
    r`Constant coefficients: $ay'' + by' + cy = 0$, $a, b, c \in \mathbb{R}$.`,
    ['characteristic equation']),
  card('theorem', 'l9-distinct', L9, 'Two distinct real roots',
    r`Thm. If $r_1, r_2$ are two roots of $ar^2 + br + c = 0$, $$y = c_1e^{r_1t} + c_2e^{r_2t}.$$
Ex) $y'' - 5y' + 6y = 0$: $r^2 - 5r + 6 = (r-2)(r-3) = 0$ ⇒ $y = c_1e^{2t} + c_2e^{3t}$.`),
  card('theorem', 'l9-repeated', L9, 'Repeated (multiple) root',
    r`Thm. If $r$ is a multiple root of $ar^2 + br + c = 0$, $$y = c_1e^{rt} + c_2te^{rt}.$$
Ex) $y'' - 4y' + 4y = 0$: $(r-2)^2 = 0$ ⇒ $y = c_1e^{2t} + c_2te^{2t}$.`),
  card('theorem', 'l9-euler', L9, "Euler's formula",
    r`(Euler) $$e^{ix} = \cos x + i\sin x$$
From $e^{ix} = \sum\frac{(ix)^n}{n!} = \left(1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \cdots\right) + i\left(x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots\right)$.
Ex) $e^{i\pi} = \cos\pi + i\sin\pi = -1$ ⇒ $e^{i\pi} + 1 = 0$.`),
  card('theorem', 'l9-complex', L9, 'Complex roots a ± bi',
    r`Thm. If $r = a \pm bi$ are roots of $ar^2 + br + c = 0$, $$y = c_1e^{at}\cos bt + c_2e^{at}\sin bt.$$
Why: $e^{r_1t} + e^{r_2t} = 2e^{at}\cos bt$ and $e^{r_1t} - e^{r_2t} = 2ie^{at}\sin bt$ (two solutions).`),
  card('example', 'l9-ex-complex', L9, r`Solve $y'' + 2y' + 4y = 0$.`,
    r`$r^2 + 2r + 4 = 0$ ⇒ $r = \dfrac{-2 \pm\sqrt{4 - 16}}{2} = -1 \pm\sqrt3\,i$.
Two solutions: $e^{-t}\cos\sqrt3t$, $e^{-t}\sin\sqrt3t$.
$$y = c_1e^{-t}\cos\sqrt3t + c_2e^{-t}\sin\sqrt3t.$$`),

  // Lecture 10 · §3.4 Mechanical vibrations
  card('method', 'l10-spring', L10a, r`Undamped spring $my'' + ky = 0$`,
    r`Set $\omega_0 = \sqrt{k/m}$ ⇒ $y'' + \omega_0^2y = 0$. $r^2 + \omega_0^2 = 0$ ⇒ $r = \pm i\omega_0$ ⇒ $y = A\cos\omega_0t + B\sin\omega_0t$.
$C := \sqrt{A^2 + B^2}$, $\exists\alpha$, $\cos\alpha = \frac AC$, $\sin\alpha = \frac BC$:
$$y = C\cos(\omega_0t - \alpha).$$`),
  def('l10-amplitude', L10a, 'Amplitude',
    r`$C = \sqrt{A^2 + B^2}$ … amplitude`,
    r`for $y = A\cos\omega_0t + B\sin\omega_0t = C\cos(\omega_0t - \alpha)$.`,
    ['amplitude']),
  def('l10-period', L10a, 'Period',
    r`$\dfrac{2\pi}{\omega_0}$ … period (time for one oscillation)`,
    undefined,
    ['period']),
  def('l10-frequency', L10a, 'Frequency',
    r`$\dfrac{\omega_0}{2\pi}$ … frequency (number of cycles per second).`,
    undefined,
    ['frequency']),
  card('example', 'l10-ex-spring', L10a, r`A spring with $k = 50$ N/m, $m = 0.5$ kg, $y(0) = 1$ m, $y'(0) = -5$ m/s. Find $y(t)$.`,
    r`$0.5y'' + 50y = 0$ ⇒ $y'' + 100y = 0$ ⇒ $y = A\cos 10t + B\sin 10t$.
$A = 1$; $-5 = y'(0) = 10B$ ⇒ $B = -\tfrac12$. $y(t) = \cos 10t - \tfrac12\sin 10t$.
$C = \sqrt{1 + \frac14} = \frac{\sqrt5}{2}$ ⇒ $y(t) = \frac{\sqrt5}{2}\cos(10t - \alpha)$, $\cos\alpha = \frac{2}{\sqrt5}$, $\sin\alpha = -\frac{1}{\sqrt5}$. period: $\frac{2\pi}{10}$.`),
  card('method', 'l10-damped', L10a, r`Damped spring $my'' + cy' + ky = 0$`,
    r`$y'' + \frac cm y' + \frac km y = 0$ ⇒ $y'' + 2py' + \omega_0^2y = 0$ ($p = \frac{c}{2m}$).
Characteristic equation $r^2 + 2pr + \omega_0^2 = 0$: $$r = -p \pm\sqrt{p^2 - \omega_0^2}.$$`),
  def('l10-over', L10a, 'Overdamping',
    r`Overdamping. ($p > \omega_0$) Two real roots $r_1, r_2$ ($r_1, r_2 < 0$). $y(t) = c_1e^{r_1t} + c_2e^{r_2t}$.`,
    undefined,
    ['Overdamping', 'overdamping']),
  def('l10-critical', L10a, 'Critical damping',
    r`Critical damping. ($p = \omega_0$) One real root $r = -p$. $y(t) = c_1e^{-pt} + c_2te^{-pt}$.`,
    r`Converges faster than overdamping.`,
    ['Critical damping', 'critical damping']),
  def('l10-under', L10a, 'Underdamping',
    r`Underdamping ($p < \omega_0$). $y(t) = e^{-pt}(c_1\cos\omega_1t + c_2\sin\omega_1t)$. $\omega_1 = \sqrt{\omega_0^2 - p^2}$`,
    undefined,
    ['Underdamping', 'underdamping']),

  // Lecture 10 · §3.5 Nonhomogeneous equations
  card('theorem', 'l10-nonhomog', L10b, 'Structure of nonhomogeneous solutions',
    r`$ay'' + by' + cy = f(t)$ (*), $ay'' + by' + cy = 0$ (**).
Thm. Suppose $y_p$ is a solution of (*).
① For any solution $y_h$ of (**), $y_h + y_p$ is a solution of (*).
② If $y_g$ is another solution of (*), $y_g = y_h + y_p$ for some solution $y_h$ of (**).`),
  card('method', 'l10-guess', L10b, 'How can we find one solution of a nonhomogeneous equation?',
    r`A. Clever guess. If $f(t)$ is in a collection of functions closed under derivatives, we may find $y_p$ from the same class.
Rmk. ① If $f(t) = e^{kt}$, check $e^{kt}, te^{kt}, t^2e^{kt}, \dots$
② If $f(t) = \cos kt$, check $\cos kt, \sin kt, t\cos kt, t\sin kt, \dots$`),
  card('example', 'l10-ex-guess', L10b, r`Solve $y'' + 4y = t^2 + 1$.`,
    r`Set $y = At^2 + Bt + C$: $4At^2 + 4Bt + (2A + 4C) = t^2 + 1$ ⇒ $A = \tfrac14$, $B = 0$, $C = \tfrac18$. $y_p = \tfrac14t^2 + \tfrac18$.
$y'' + 4y = 0$ has $y_h = c_1\cos 2t + c_2\sin 2t$.
$$y = c_1\cos 2t + c_2\sin 2t + \tfrac14t^2 + \tfrac18.$$`),

  // Lecture 11 · §3.8 Boundary value problems
  card('remark', 'l11-bvp', L11, 'IVP vs. boundary value problem: is there always a unique solution?',
    r`Recall. The IVP $y'' + p(t)y' + q(t)y = 0$, $y(a) = 0$, $y'(a) = 0$ has a unique solution.
Q. How about $y'' + p(t)y' + q(t)y = 0$, $y(a) = 0$, $y(b) = 0$? A. It depends.
Ex) $y'' + 3y = 0$, $y(0) = y(\pi) = 0$ ⇒ only $y = 0$.
Ex) $y'' + 4y = 0$, $y(0) = y(\pi) = 0$ ⇒ $y = C_2\sin 2t$ (∴ ∞ solutions).`),
  card('example', 'l11-ex-rod', L11, 'Why do we care about boundary value problems?',
    r`Ex) $T(x)$ = steady temperature of a rod at position $x$ ($t\to\infty$), surrounding temperature $T_s$ (const): $kT'' = h(T - T_s)$, $T(0) = a$, $T(L) = b$. Set $y := T - T_s$ ⇒ $y'' - \frac hk y = 0$.
Ex) Strike a guitar string ⇒ make a vibration. $y(x)$ = vertical displacement: $y'' + \lambda y = 0$ for some $\lambda \in \mathbb{R}$.`),
  def('l11-eigen', L11, 'Eigenvalue problem (and eigenfunction)',
    r`Finding $\lambda$ such that $y'' + p(t)y' + \lambda y = 0$, $y(a) = 0$, $y(b) = 0$ is called an eigenvalue problem. (solution: eigenfunction)`,
    undefined,
    ['eigenvalue problem', 'eigenfunction']),
  card('example', 'l11-ex-eigen', L11, r`Determine the eigenvalues for $y'' + \lambda y = 0$, $y(0) = 0$, $y(L) = 0$.`,
    r`① $\lambda > 0$: $\lambda = \alpha^2$, $y = c_1\cos\alpha t + c_2\sin\alpha t$ ⇒ $c_1 = 0$, $c_2\sin\alpha L = 0$ ⇒ $\alpha L = n\pi$.
② $\lambda < 0$: $y = d_1\cosh\sqrt{-\lambda}t + d_2\sinh\sqrt{-\lambda}t$ ⇒ $d_1 = d_2 = 0$. No eigenvalue.
③ $\lambda = 0$: $y = c_1 + c_2t$ ⇒ $c_1 = c_2 = 0$. No eigenvalue.
Summary: eigenvalues: $\dfrac{n^2\pi^2}{L^2}$, $n \in \mathbb{N}$. eigenfunctions: $\sin\dfrac{n\pi t}{L}$.`),
  def('l11-hyperbolic', L11, 'Hyperbolic cosine and sine',
    r`$\cosh x := \dfrac{e^x + e^{-x}}{2}$, $\sinh x := \dfrac{e^x - e^{-x}}{2}$.`,
    r`properties: $e^x = \cosh x + \sinh x$, $e^{-x} = \cosh x - \sinh x$; $\cosh 0 = 1$, $\sinh 0 = 0$, $\sinh x$: increasing function; $\cosh(-x) = \cosh x$, $\sinh(-x) = -\sinh x$; $\cosh' x = \sinh x$, $\sinh' x = \cosh x$; $\cosh^2x - \sinh^2x = 1$.`,
    ['cosh', 'sinh', 'hyperbolic']),
  card('remark', 'l11-linear-algebra', L11, 'Eigenvalue problems in linear algebra terms',
    r`Define linear maps $D: C^\infty(\mathbb{R}) \to C^\infty(\mathbb{R})$, $D(f) = f''$ and $B: C^\infty(\mathbb{R}) \to \mathbb{R}^2$, $B(f) = (f(0), f(L))$.
$y$ is a solution of $y'' + \lambda y = 0$ ⇔ $D(y) = -\lambda y$ ⇔ $-\lambda$ is an eigenvalue of $D$, $y$ is an eigenvector.
$y$ satisfies the boundary condition ⇔ $B(y) = (0,0)$ ⇔ $y \in \ker B$.
$y$ is a solution ⇔ $y$ is an eigenvector of $D$ & $y \in \ker B$.`),
];

/** The question on the front of each card (titles stay as the short names). */
const QUESTIONS: Record<string, string> = {
  'l1-ode': String.raw`What is an ordinary differential equation (ODE)?`,
  'l1-solution': String.raw`What is a solution of an ODE?`,
  'l1-order': String.raw`What is the order of an ODE?`,
  'l1-growth': String.raw`If births and deaths are proportional to the population, what ODE models $P(t)$, and what is its solution?`,
  'l2-first-order': String.raw`What is the general form of a first order equation?`,
  'l2-ex-ivp': String.raw`What is the solution of the IVP $\dfrac{dy}{dt} = 4t - 3$, $y(1) = 10$?`,
  'l2-slope-field': String.raw`What is a slope field, and how do you draw one?`,
  'l2-solution-curve': String.raw`What is a solution curve in a slope field?`,
  'l2-ex-slope': String.raw`For $\dfrac{dy}{dt} = -y(y-2)$, what does the slope field tell you about the solutions?`,
  'l2-nonexist': String.raw`Must an IVP have a solution, and must it be defined for all $t$?`,
  'l2-eu': String.raw`What does the existence & uniqueness theorem say about the IVP $\dfrac{dy}{dt} = f(t,y)$, $y(a) = b$?`,
  'l3-separable': String.raw`When is a first order ODE called separable?`,
  'l3-separable-method': String.raw`How do you solve a separable equation?`,
  'l3-ex-ivp': String.raw`What is the solution of the IVP $\dfrac{dy}{dt} = -6ty$, $y(0) = 2$?`,
  'l3-ex-domain': String.raw`What is the solution of $\dfrac{dy}{dt} = -2t(1+y)^2$, $y(0) = -5$, and on what domain does it exist?`,
  'l3-implicit': String.raw`What is an implicit solution?`,
  'l3-half-life': String.raw`What is the half-life of a decaying quantity?`,
  'l4-linear': String.raw`What is a first order linear equation?`,
  'l4-integrating-factor': String.raw`What is the integrating factor for $\dfrac{dy}{dt} + P(t)y = Q(t)$, and how do you use it?`,
  'l4-ex-1': String.raw`What is the general solution of $\dfrac{dy}{dt} - 2y = 3e^{2t}$?`,
  'l4-ex-2': String.raw`What is the general solution of $(t^2+1)\dfrac{dy}{dt} + 3ty = 6t$?`,
  'l4-cooling': String.raw`What does Newton's law of cooling say?`,
  'l5-picard-thm': String.raw`Under what conditions does the IVP $\dfrac{dy}{dt} = f(t,y)$, $y(a) = b$ have a unique solution on an open interval $I$ (Lipschitz version)?`,
  'l5-lipschitz': String.raw`What does it mean for $f(t,y)$ to satisfy the Lipschitz condition in $y$?`,
  'l5-mvt': String.raw`What is a quick way to check that $f$ satisfies the Lipschitz condition?`,
  'l5-picard': String.raw`What is Picard iteration?`,
  'l5-uniform': String.raw`What does it mean for $f_n(t)$ to converge to $f(t)$ uniformly?`,
  'l5-bound': String.raw`Why do the Picard iterates converge, and what bound do you get?`,
  'l6-malthus': String.raw`What is the Malthus model of population growth?`,
  'l6-logistic': String.raw`What is the logistic model?`,
  'l6-carrying': String.raw`In the logistic model $\dfrac{dP}{dt} = kP(M - P)$, what is $M$ called?`,
  'l6-ex-logistic': String.raw`What is the solution of $\dfrac{dP}{dt} = 0.6P(4 - P)$, and what is its long-term limit?`,
  'l6-cannibalism': String.raw`What ODE does the cannibalism model give?`,
  'l6-disease': String.raw`How is the spread of a contagious disease modeled?`,
  'l6-allee': String.raw`What is the Allee effect, and what equation models it?`,
  'l6-doomsday': String.raw`What is the doomsday model, and where does it come from?`,
  'l6-ex-doomsday': String.raw`What is the solution of $\dfrac{dP}{dt} = 0.6P(P - 4)$, and what happens for $P_0 < 4$ and $P_0 > 4$?`,
  'l7-ex-cooling': String.raw`For the law of cooling with constant surrounding temperature $A$, what does the slope field show?`,
  'l7-autonomous': String.raw`When is a first order ODE autonomous?`,
  'l7-equilibrium': String.raw`What is an equilibrium solution?`,
  'l7-critical': String.raw`What are the critical points of an autonomous equation $\dfrac{dy}{dt} = f(y)$?`,
  'l7-stable': String.raw`When is a critical point stable, and when is it unstable?`,
  'l7-ex-stability': String.raw`For $\dfrac{dP}{dt} = P(4 - P)(P - 1)$, what are the critical points, which are stable, and what is the limit behavior?`,
  'l7-bifurcation': String.raw`What is a bifurcation diagram?`,
  'l8-higher-linear': String.raw`What is the form of a higher order linear ODE?`,
  'l8-homogeneous': String.raw`When is a linear ODE homogeneous?`,
  'l8-hooke': String.raw`What does Hooke's law say, and what ODE does it give for a mass on a spring?`,
  'l8-thm1': String.raw`If $y_1$ and $y_2$ solve a homogeneous equation (*), what else is a solution? (Thm 1)`,
  'l8-thm1p': String.raw`What kind of set is the set of solutions of a homogeneous equation (*)? (Thm 1')`,
  'l8-cinf': String.raw`What is $C^\infty(I)$?`,
  'l8-thm2': String.raw`What does Thm 2 say about the IVP $y'' + py' + qy = f$, $y(a) = b_0$, $y'(a) = b_1$?`,
  'l8-ex-ivp': String.raw`What is the solution of the IVP $y'' + y = 0$, $y(0) = 3$, $y'(0) = 2$?`,
  'l8-indep': String.raw`When are two functions linearly independent?`,
  'l8-two-solutions': String.raw`How many linearly independent solutions does a homogeneous equation (*) have?`,
  'l8-ex-tet': String.raw`What are two linearly independent solutions of $y'' - 2y' + y = 0$?`,
  'l9-general': String.raw`What does every solution of a homogeneous 2nd order linear ODE look like?`,
  'l9-characteristic': String.raw`What is the characteristic equation of $ay'' + by' + cy = 0$, and where does it come from?`,
  'l9-distinct': String.raw`If the characteristic equation has two distinct real roots $r_1, r_2$, what is the general solution?`,
  'l9-repeated': String.raw`If $r$ is a repeated (multiple) root of the characteristic equation, what is the general solution?`,
  'l9-euler': String.raw`What is Euler's formula?`,
  'l9-complex': String.raw`If the characteristic roots are $r = a \pm bi$, what is the general solution?`,
  'l9-ex-complex': String.raw`What is the general solution of $y'' + 2y' + 4y = 0$?`,
  'l10-spring': String.raw`How do you solve the undamped spring equation $my'' + ky = 0$?`,
  'l10-amplitude': String.raw`For $y = A\cos\omega_0t + B\sin\omega_0t$, what is the amplitude?`,
  'l10-period': String.raw`What is the period of $y = C\cos(\omega_0t - \alpha)$?`,
  'l10-frequency': String.raw`What is the frequency of $y = C\cos(\omega_0t - \alpha)$?`,
  'l10-ex-spring': String.raw`A spring with $k = 50$ N/m holds $m = 0.5$ kg, with $y(0) = 1$ m and $y'(0) = -5$ m/s. What is $y(t)$?`,
  'l10-damped': String.raw`How do you analyze the damped spring $my'' + cy' + ky = 0$?`,
  'l10-over': String.raw`What is overdamping, and what does the solution look like?`,
  'l10-critical': String.raw`What is critical damping, and what does the solution look like?`,
  'l10-under': String.raw`What is underdamping, and what does the solution look like?`,
  'l10-nonhomog': String.raw`How are the solutions of $ay'' + by' + cy = f(t)$ related to those of the homogeneous equation?`,
  'l10-ex-guess': String.raw`What is the general solution of $y'' + 4y = t^2 + 1$?`,
  'l11-bvp': String.raw`Does a boundary value problem always have a unique solution, like an IVP does?`,
  'l11-eigen': String.raw`What is an eigenvalue problem (and an eigenfunction)?`,
  'l11-ex-eigen': String.raw`What are the eigenvalues and eigenfunctions of $y'' + \lambda y = 0$, $y(0) = 0$, $y(L) = 0$?`,
  'l11-hyperbolic': String.raw`How are $\cosh x$ and $\sinh x$ defined?`,
  'l11-linear-algebra': String.raw`How can an eigenvalue problem be described in linear algebra terms?`,
};

for (const c of [...CH1, ...CH2, ...CH3]) {
  const q = QUESTIONS[c.id];
  if (q) c.front = q;
  const extra = VARIANTS[c.id];
  if (extra) c.variants = [{ front: c.front, back: c.back }, ...extra];
}

/** Course cards by id, for looking up variants from saved cards. */
export const COURSE_CARDS: Map<string, CourseCard> = new Map();

export const COURSE: CourseDeck[] = [
  {
    id: 'ch1',
    name: 'Ch. 1 · First-Order Equations',
    description: 'Lectures 1–5 · ODEs, slope fields, separable and linear equations, Picard iteration',
    cards: CH1,
  },
  {
    id: 'ch2',
    name: 'Ch. 2 · Population Models & Stability',
    description: 'Lectures 6–7 · Malthus, logistic, Allee, doomsday; equilibria, stability, bifurcation',
    cards: CH2,
  },
  {
    id: 'ch3',
    name: 'Ch. 3 · Second-Order Linear Equations',
    description: 'Lectures 8–11 · solution spaces, characteristic equation, vibrations, nonhomogeneous, BVPs',
    cards: CH3,
  },
];

for (const d of COURSE) for (const c of d.cards) COURSE_CARDS.set(c.id, c);

/** Every definition in the course, in lecture order. */
export const DEFINITIONS: CourseCard[] = COURSE.flatMap((d) => d.cards.filter((c) => c.kind === 'definition'));
