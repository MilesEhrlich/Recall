// Hand-written practice questions, drawn from the Lecture 1–11 examples.
// Numeric answers are computed from the formulas, not typed in, so they can't drift.

export type Topic = 'ch1' | 'ch2' | 'ch3';

interface Base {
  id: string;
  topic: Topic;
  source: string;
  prompt: string;
  /** Worked explanation shown after answering. */
  explain: string;
}

export interface McQuestion extends Base {
  type: 'mc';
  choices: string[];
  answer: number;
  /** Render the prompt as a quoted block (used for definitions). */
  quote?: boolean;
}

export interface NumericQuestion extends Base {
  type: 'numeric';
  answer: number;
  /** Relative tolerance, e.g. 0.01 = within 1%. */
  tolerance: number;
  unit?: string;
}

export type Question = McQuestion | NumericQuestion;

const r = String.raw;
const ln = Math.log;

export const CONCEPTS: McQuestion[] = [
  {
    id: 'c-separable', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'mc',
    prompt: 'Which equation is NOT separable?',
    choices: [r`$\dfrac{dy}{dt} = -6ty$`, r`$\dfrac{dy}{dt} = t^2 + y^2$`, r`$t + y\dfrac{dy}{dt} = 0$`, r`$\dfrac{dy}{dt} = \dfrac{4-2t}{3y^2-5}$`],
    answer: 1,
    explain: r`$t^2 + y^2$ can't be written as $g(t)k(y)$. The others can: $-6t\cdot y$, $-t\cdot\frac1y$, and $(4-2t)\cdot\frac{1}{3y^2-5}$.`,
  },
  {
    id: 'c-linear', topic: 'ch1', source: 'Lecture 4 · §1.5', type: 'mc',
    prompt: 'Which equation is first order linear?',
    choices: [r`$\dfrac{dy}{dt} = y^2 + t$`, r`$(t^2+1)\dfrac{dy}{dt} + 3ty = 6t$`, r`$y\dfrac{dy}{dt} = t$`, r`$\dfrac{dy}{dt} = \sin y$`],
    answer: 1,
    explain: r`Dividing by $t^2+1$ gives $\frac{dy}{dt} + \frac{3t}{t^2+1}y = \frac{6t}{t^2+1}$, the form $\frac{dy}{dt} + P(t)y = Q(t)$.`,
  },
  {
    id: 'c-autonomous', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'mc',
    prompt: 'Which equation is autonomous?',
    choices: [r`$\dfrac{dy}{dt} = 2yt$`, r`$\dfrac{dT}{dt} = -0.4\left(T - 89 + 12\cos\frac{\pi}{12}(t-4)\right)$`, r`$\dfrac{dP}{dt} = kP(M-P)$`, r`$\dfrac{dy}{dt} = 4t - 3$`],
    answer: 2,
    explain: r`Autonomous means $\frac{dy}{dt} = f(y)$: the right side has no explicit $t$. Only the logistic equation qualifies.`,
  },
  {
    id: 'c-order', topic: 'ch1', source: 'Lecture 1 · §1.1', type: 'mc',
    prompt: r`What is the order of $\dfrac{d^2y}{dt^2} + \dfrac{dy}{dt} - 6 = 0$?`,
    choices: ['1', '2', '3', '6'], answer: 1,
    explain: 'order = order of highest derivative, which is the second derivative.',
  },
  {
    id: 'c-eu', topic: 'ch1', source: 'Lecture 2 · §1.3', type: 'mc',
    prompt: r`The existence & uniqueness theorem for $\frac{dy}{dt} = f(t,y)$, $y(a) = b$ asks for which hypothesis?`,
    choices: [
      r`$f$ is differentiable everywhere`,
      r`$f(t,y)$ and $\frac{\partial}{\partial y}f(t,y)$ are continuous on a rectangle containing $(a,b)$`,
      r`$f$ is separable`,
      r`$f(a,b) = 0$`,
    ],
    answer: 1,
    explain: r`Then there is an interval $I \ni a$ on which the IVP has a unique solution.`,
  },
  {
    id: 'c-lipschitz-mvt', topic: 'ch1', source: 'Lecture 5 · Appendix 1', type: 'mc',
    prompt: r`A quick way to show $f$ satisfies the Lipschitz condition in $y$ on $D$ is to show…`,
    choices: [r`$|f(t,y)| \le k$ on $D$`, r`$\left|\frac{\partial f}{\partial y}(t,y)\right| \le k$ on $D$`, r`$f$ is continuous on $D$`, r`$\frac{\partial f}{\partial t} = 0$`],
    answer: 1,
    explain: r`By the MVT, $|f(t,y_1) - f(t,y_2)| = \left|\frac{\partial f}{\partial y}(t,\xi)\right||y_1 - y_2| \le k|y_1 - y_2|$.`,
  },
  {
    id: 'c-uniform', topic: 'ch1', source: 'Lecture 5 · Appendix 1', type: 'mc',
    prompt: r`If $f_n(t) \rightrightarrows f(t)$ (uniformly), which conclusions follow?`,
    choices: ['Only that f is continuous', 'f is continuous, and integral & limit can be exchanged', 'Only that integral & limit can be exchanged', 'Nothing beyond pointwise convergence'],
    answer: 1,
    explain: r`Thm. If $f_n \rightrightarrows f$ then ① $f$ is continuous ② integral & limit can be exchanged. That's exactly what Picard iteration needs.`,
  },
  {
    id: 'c-picard-y1', topic: 'ch1', source: 'Lecture 5 · Appendix 1', type: 'mc',
    prompt: r`Picard iteration for $y' = y$, $y(0) = 1$: what is $y_2(t)$?`,
    choices: [r`$1 + t$`, r`$1 + t + \frac{t^2}{2}$`, r`$e^t$`, r`$1 + t^2$`],
    answer: 1,
    explain: r`$y_0 = 1$, $y_1 = 1 + \int_0^t 1\,dx = 1 + t$, $y_2 = 1 + \int_0^t (1 + x)\,dx = 1 + t + \frac{t^2}{2}$ — the Taylor polynomials of $e^t$.`,
  },
  {
    id: 'c-switch', topic: 'ch1', source: 'Lecture 5 · Appendix 1', type: 'mc',
    prompt: r`$f_n(t) = t^n$ on $[0,1]$. What is wrong with its pointwise limit?`,
    choices: ['It does not exist', 'It is not continuous (0 on [0,1), 1 at t = 1)', 'It is unbounded', 'Nothing'],
    answer: 1,
    explain: r`$\lim t^n = 0$ for $0 \le t < 1$ but $1^n = 1$, so the limit jumps at $t = 1$: pointwise limits of continuous functions need not be continuous.`,
  },
  {
    id: 'c-stability', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'mc',
    prompt: r`For $\dfrac{dP}{dt} = P(4-P)(P-1)$, which critical points are stable?`,
    choices: ['0 and 1', '1 only', '0 and 4', '1 and 4'], answer: 2,
    explain: r`Sign of $f$: negative on $(0,1)$, positive on $(1,4)$, negative above 4. Arrows point toward 0 and 4, away from 1.`,
  },
  {
    id: 'c-allee', topic: 'ch2', source: 'Lecture 6 · §2.1', type: 'mc',
    prompt: r`In the Allee model $\dfrac{dP}{dt} = k(M-P)P(P-a)$ with $0 < a < M$, what happens if $0 < P_0 < a$?`,
    choices: [r`$P \to M$`, r`$P \to a$`, r`$P \to 0$ (extinction)`, r`$P \to \infty$`], answer: 2,
    explain: r`For $0 < P < a$ the right side is negative, so $P$ decreases to the stable equilibrium 0: if the initial population is small, the population becomes extinct.`,
  },
  {
    id: 'c-doomsday', topic: 'ch2', source: 'Lecture 6 · §2.1', type: 'mc',
    prompt: r`Doomsday model $\dfrac{dP}{dt} = kP(P - M)$: what happens if $P_0 > M$?`,
    choices: [r`$P \to M$`, r`$P \to 0$`, r`$P$ blows up to $\infty$ in finite time`, r`$P$ oscillates`], answer: 2,
    explain: r`Above $M$ the growth rate is positive and grows like $P^2$; the explicit solution's denominator hits zero at a finite time.`,
  },
  {
    id: 'c-fishing-4', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'mc',
    prompt: r`Fishing model $\dfrac{dP}{dt} = P(4-P) - h$. What happens when $h > 4$?`,
    choices: ['Two equilibria, one stable', 'One equilibrium c = 2', 'No critical value; P decreases to −∞ (collapse)', 'P → 4'], answer: 2,
    explain: r`$P^2 - 4P + h = 0$ has no real roots when $h > 4$, so $P' < 0$ always.`,
  },
  {
    id: 'c-superposition', topic: 'ch3', source: 'Lecture 8 · §3.1', type: 'mc',
    prompt: r`If $y_1, y_2$ solve the homogeneous equation $y'' + p(t)y' + q(t)y = 0$, which is also a solution?`,
    choices: [r`$y_1y_2$`, r`$C_1y_1 + C_2y_2$ for any constants`, r`$y_1 + 1$`, r`$y_1^2$`], answer: 1,
    explain: r`Thm 1: plug in and use linearity, $C_1(y_1'' + py_1' + qy_1) + C_2(\dots) = 0$.`,
  },
  {
    id: 'c-dimension', topic: 'ch3', source: 'Lecture 9 · §3.1, 3.3', type: 'mc',
    prompt: 'The dimension of the space of solutions of a homogeneous 2nd order linear ODE is…',
    choices: ['1', '2', '3', 'infinite'], answer: 1,
    explain: r`Thm'. The dimension is two: any solution is $y = C_1y_1 + C_2y_2$.`,
  },
  {
    id: 'c-repeated', topic: 'ch3', source: 'Lecture 9 · §3.1, 3.3', type: 'mc',
    prompt: r`General solution of $y'' - 4y' + 4y = 0$?`,
    choices: [r`$c_1e^{2t} + c_2e^{-2t}$`, r`$c_1e^{2t} + c_2te^{2t}$`, r`$c_1\cos 2t + c_2\sin 2t$`, r`$(c_1 + c_2)e^{2t}$`], answer: 1,
    explain: r`$(r-2)^2 = 0$ is a multiple root, so the second solution is $te^{2t}$.`,
  },
  {
    id: 'c-complex', topic: 'ch3', source: 'Lecture 9 · §3.1, 3.3', type: 'mc',
    prompt: r`General solution of $y'' + 2y' + 4y = 0$?`,
    choices: [
      r`$c_1e^{t}\cos\sqrt3t + c_2e^{t}\sin\sqrt3t$`,
      r`$c_1e^{-t}\cos\sqrt3t + c_2e^{-t}\sin\sqrt3t$`,
      r`$c_1e^{-t} + c_2e^{-3t}$`,
      r`$c_1\cos 2t + c_2\sin 2t$`,
    ],
    answer: 1,
    explain: r`$r = \frac{-2 \pm\sqrt{4-16}}{2} = -1 \pm\sqrt3 i$, so $a = -1$, $b = \sqrt3$.`,
  },
  {
    id: 'c-damping', topic: 'ch3', source: 'Lecture 10 · §3.4', type: 'mc',
    prompt: r`$y'' + 2py' + \omega_0^2y = 0$ with $m = 1$, $c = 4$, $k = 4$. Which regime?`,
    choices: ['Overdamping', 'Critical damping', 'Underdamping', 'Undamped'], answer: 1,
    explain: r`$p = \frac{c}{2m} = 2$ and $\omega_0 = \sqrt{k/m} = 2$, so $p = \omega_0$.`,
  },
  {
    id: 'c-guess', topic: 'ch3', source: 'Lecture 10 · §3.5', type: 'mc',
    prompt: r`Clever guess: for $y'' + 4y = \cos 3t$, which family should $y_p$ come from?`,
    choices: [r`$At^2 + Bt + C$`, r`$A\cos 3t + B\sin 3t$`, r`$Ae^{3t}$`, r`$A\ln t$`], answer: 1,
    explain: r`If $f(t) = \cos kt$, check $\cos kt, \sin kt, t\cos kt, t\sin kt, \dots$ ($\cos 3t$ doesn't solve the homogeneous equation, so no $t$ factor is needed.)`,
  },
  {
    id: 'c-nonhomog', topic: 'ch3', source: 'Lecture 10 · §3.5', type: 'mc',
    prompt: r`If $y_p$ is one solution of $ay'' + by' + cy = f(t)$, every solution has the form…`,
    choices: [r`$y_p$ only`, r`$y_h + y_p$ with $y_h$ solving the homogeneous equation`, r`$y_h \cdot y_p$`, r`$y_h - y_p$ with $y_h$ any function`], answer: 1,
    explain: r`Thm ②: if $y_g$ is another solution, $y_g = y_h + y_p$ for some solution $y_h$ of the homogeneous equation.`,
  },
  {
    id: 'c-bvp', topic: 'ch3', source: 'Lecture 11 · §3.8', type: 'mc',
    prompt: r`How many solutions does $y'' + 4y = 0$, $y(0) = 0$, $y(\pi) = 0$ have?`,
    choices: ['None', 'Exactly one (y = 0)', 'Infinitely many', 'Exactly two'], answer: 2,
    explain: r`$y = c_1\cos 2t + c_2\sin 2t$; $y(0) = 0$ gives $c_1 = 0$ and $y(\pi) = c_2\sin 2\pi = 0$ for every $c_2$.`,
  },
  {
    id: 'c-bvp-3', topic: 'ch3', source: 'Lecture 11 · §3.8', type: 'mc',
    prompt: r`How many solutions does $y'' + 3y = 0$, $y(0) = 0$, $y(\pi) = 0$ have?`,
    choices: ['None', 'Exactly one (y = 0)', 'Infinitely many', 'Exactly two'], answer: 1,
    explain: r`$c_1 = 0$ and $c_2\sin\sqrt3\pi = 0$ forces $c_2 = 0$, since $\sqrt3\pi$ is not a multiple of $\pi$.`,
  },
  {
    id: 'c-eigen-neg', topic: 'ch3', source: 'Lecture 11 · §3.8', type: 'mc',
    prompt: r`For $y'' + \lambda y = 0$, $y(0) = y(L) = 0$, which $\lambda$ give nonzero solutions?`,
    choices: [r`all $\lambda < 0$`, r`$\lambda = 0$`, r`$\lambda = \frac{n^2\pi^2}{L^2}$, $n \in \mathbb{N}$`, r`every $\lambda > 0$`], answer: 2,
    explain: r`$\lambda < 0$ and $\lambda = 0$ give only $y = 0$; for $\lambda = \alpha^2 > 0$ we need $\sin\alpha L = 0$, so $\alpha L = n\pi$.`,
  },
  {
    id: 'c-cosh', topic: 'ch3', source: 'Lecture 11 · §3.8', type: 'mc',
    prompt: r`Which identity is true?`,
    choices: [r`$\cosh^2x + \sinh^2x = 1$`, r`$\cosh^2x - \sinh^2x = 1$`, r`$\cosh' x = -\sinh x$`, r`$\sinh(-x) = \sinh x$`], answer: 1,
    explain: r`From $\cosh x = \frac{e^x + e^{-x}}{2}$, $\sinh x = \frac{e^x - e^{-x}}{2}$: $\cosh^2 - \sinh^2 = \frac{4}{4} = 1$.`,
  },
];

export const PROBLEMS: NumericQuestion[] = [
  {
    id: 'p-ivp', topic: 'ch1', source: 'Lecture 2 · §1.2', type: 'numeric',
    prompt: r`Solve $\dfrac{dy}{dt} = 4t - 3$, $y(1) = 10$. What is $y(2)$?`,
    answer: 2 * 4 - 3 * 2 + 11, tolerance: 0.001,
    explain: r`$y = 2t^2 - 3t + 11$, so $y(2) = 8 - 6 + 11 = 13$.`,
  },
  {
    id: 'p-ball', topic: 'ch1', source: 'Lecture 2 · §1.2', type: 'numeric',
    prompt: 'A ball is thrown upward at 24 ft/s from a 700 ft cliff (a = −32 ft/s²). When does it hit the ground?',
    answer: (24 + Math.sqrt(24 ** 2 + 4 * 16 * 700)) / 32, tolerance: 0.005, unit: 's',
    explain: r`$s(t) = -16t^2 + 24t + 700 = 0$ ⇒ $t = \frac{24 + \sqrt{45376}}{32} \approx 7.407$ sec.`,
  },
  {
    id: 'p-lunar', topic: 'ch1', source: 'Lecture 2 · §1.2', type: 'numeric',
    prompt: 'A lunar module falls at 450 m/s; its engine decelerates it at 2.5 m/s². At what height must the engine fire to land softly?',
    answer: 450 * (450 / 2.5) - 1.25 * (450 / 2.5) ** 2, tolerance: 0.005, unit: 'm',
    explain: r`$v(t_0) = -450 + 2.5t_0 = 0$ ⇒ $t_0 = 180$; $y(180) = -450\cdot180 + 1.25\cdot180^2 + C = 0$ ⇒ $C = 40{,}500$ m.`,
  },
  {
    id: 'p-sep-ivp', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'numeric',
    prompt: r`Solve $\dfrac{dy}{dt} = -6ty$, $y(0) = 2$. What is $y(1)$? (4 significant digits)`,
    answer: 2 * Math.exp(-3), tolerance: 0.01,
    explain: r`$y = 2e^{-3t^2}$, so $y(1) = 2e^{-3} \approx 0.0996$.`,
  },
  {
    id: 'p-domain', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'numeric',
    prompt: r`$\dfrac{dy}{dt} = -2t(1+y)^2$, $y(0) = -5$ has solution on an interval $(-b, b)$. What is $b$?`,
    answer: 0.5, tolerance: 0.001,
    explain: r`$y = \frac{1}{t^2 - C} - 1$ with $C = \frac14$; it blows up at $t^2 = \frac14$, so the domain is $(-\frac12, \frac12)$.`,
  },
  {
    id: 'p-bacteria', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'numeric',
    prompt: 'A bacteria culture starts at 60 and is 42,500 after 6 hours. When does it reach 1,000,000?',
    answer: ln(1e6 / 60) / (ln(42500 / 60) / 6), tolerance: 0.005, unit: 'hours',
    explain: r`$k = \frac16\ln\frac{42500}{60} \approx 1.09382$; $t = \frac1k\ln\frac{10^6}{60} \approx 8.887$ hrs.`,
  },
  {
    id: 'p-carbon', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'numeric',
    prompt: 'A tree killed in an eruption has 44.5% of the ¹⁴C of living matter (half-life 5730 years). How many years ago was the eruption?',
    answer: (-5730 * ln(0.445)) / Math.LN2, tolerance: 0.005, unit: 'years',
    explain: r`$t = -5730\,\frac{\ln 0.445}{\ln 2} \approx 6693$ years.`,
  },
  {
    id: 'p-halflife', topic: 'ch1', source: 'Lecture 3 · §1.4', type: 'numeric',
    prompt: r`A substance decays by $\dfrac{dm}{dt} = -0.1m$ ($t$ in days). What is its half-life?`,
    answer: Math.LN2 / 0.1, tolerance: 0.005, unit: 'days',
    explain: r`$\frac12 = e^{-0.1t}$ ⇒ $t = \frac{\ln 2}{0.1} \approx 6.93$ days.`,
  },
  {
    id: 'p-cooling', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'numeric',
    prompt: r`A body at 100° sits in a 20° room with $\dfrac{dT}{dt} = -0.1(T - 20)$ ($t$ in minutes). What is $T(10)$?`,
    answer: 20 + 80 * Math.exp(-1), tolerance: 0.005, unit: '°',
    explain: r`$T(t) = A + (T_0 - A)e^{-kt} = 20 + 80e^{-1} \approx 49.43$°.`,
  },
  {
    id: 'p-integrating', topic: 'ch1', source: 'Lecture 4 · §1.5', type: 'numeric',
    prompt: r`Solve $\dfrac{dy}{dt} - 2y = 3e^{2t}$ with $y(0) = 1$. What is $y(1)$?`,
    answer: Math.exp(2) * (3 + 1), tolerance: 0.005,
    explain: r`$y = e^{2t}(3t + C)$ and $y(0) = C = 1$, so $y(1) = 4e^2 \approx 29.56$.`,
  },
  {
    id: 'p-logistic', topic: 'ch2', source: 'Lecture 6 · §2.1', type: 'numeric',
    prompt: r`$\dfrac{dP}{dt} = 0.6P(4-P)$, $P(0) = 1$. What is $P(1)$?`,
    answer: 4 / (1 + 3 * Math.exp(-2.4)), tolerance: 0.005,
    explain: r`$P = \frac{4P_0}{P_0 + (4 - P_0)e^{-2.4t}} = \frac{4}{1 + 3e^{-2.4}} \approx 3.144$.`,
  },
  {
    id: 'p-doomsday', topic: 'ch2', source: 'Lecture 6 · §2.1', type: 'numeric',
    prompt: r`$\dfrac{dP}{dt} = 0.6P(P-4)$, $P(0) = 5$. At what time does $P$ blow up?`,
    answer: ln(5 / (5 - 4)) / 2.4, tolerance: 0.005,
    explain: r`The denominator of $P = \frac{4P_0}{P_0 - (P_0-4)e^{2.4t}}$ vanishes at $t = \frac{1}{2.4}\ln\frac{P_0}{P_0 - 4} = \frac{\ln 5}{2.4} \approx 0.671$.`,
  },
  {
    id: 'p-fishing', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'numeric',
    prompt: r`Fishing model $\dfrac{dP}{dt} = P(4-P) - 3$. What population does the lake settle to if $P_0$ is large?`,
    answer: 2 + Math.sqrt(4 - 3), tolerance: 0.001,
    explain: r`Critical points $2 \pm\sqrt{4-h} = 1, 3$. $C_1 = 3$ is stable.`,
  },
  {
    id: 'p-fishing-max', topic: 'ch2', source: 'Lecture 7 · §2.2', type: 'numeric',
    prompt: r`For $\dfrac{dP}{dt} = P(4-P) - h$, what is the largest harvest $h$ that still has an equilibrium?`,
    answer: 4, tolerance: 0.001,
    explain: r`Equilibria need $4 - h \ge 0$; the bifurcation happens at $h = 4$.`,
  },
  {
    id: 'p-lipschitz', topic: 'ch1', source: 'Lecture 5 · Appendix 1', type: 'numeric',
    prompt: r`Find a Lipschitz constant $k$ for $f(t,y) = t\sin(ty)$ on $0 \le t \le 2$ (the bound from lecture).`,
    answer: 4, tolerance: 0.001,
    explain: r`$|\partial f/\partial y| = |t^2\cos(ty)| \le t^2 \le 4$.`,
  },
  {
    id: 'p-ivp2', topic: 'ch3', source: 'Lecture 8 · §3.1', type: 'numeric',
    prompt: r`Solve $y'' + y = 0$, $y(0) = 3$, $y'(0) = 2$. What is $y(\pi/2)$?`,
    answer: 2, tolerance: 0.001,
    explain: r`$y = 2\sin t + 3\cos t$, so $y(\pi/2) = 2$.`,
  },
  {
    id: 'p-roots', topic: 'ch3', source: 'Lecture 9 · §3.1, 3.3', type: 'numeric',
    prompt: r`$y'' - 5y' + 6y = 0$, $y(0) = 0$, $y'(0) = 1$. What is $y(1)$?`,
    answer: Math.exp(3) - Math.exp(2), tolerance: 0.005,
    explain: r`$y = c_1e^{2t} + c_2e^{3t}$ with $c_1 + c_2 = 0$, $2c_1 + 3c_2 = 1$ ⇒ $c_2 = 1$, $c_1 = -1$. $y(1) = e^3 - e^2 \approx 12.70$.`,
  },
  {
    id: 'p-period', topic: 'ch3', source: 'Lecture 10 · §3.4', type: 'numeric',
    prompt: 'A spring with k = 50 N/m holds a 0.5 kg mass. What is the period of oscillation?',
    answer: (2 * Math.PI) / Math.sqrt(50 / 0.5), tolerance: 0.005, unit: 's',
    explain: r`$\omega_0 = \sqrt{k/m} = 10$; period $= \frac{2\pi}{\omega_0} = \frac{2\pi}{10} \approx 0.628$ s.`,
  },
  {
    id: 'p-amplitude', topic: 'ch3', source: 'Lecture 10 · §3.4', type: 'numeric',
    prompt: r`Same spring ($y'' + 100y = 0$) with $y(0) = 1$, $y'(0) = -5$. What is the amplitude?`,
    answer: Math.sqrt(1 + 0.25), tolerance: 0.005, unit: 'm',
    explain: r`$y = \cos 10t - \frac12\sin 10t$, $C = \sqrt{1 + \frac14} = \frac{\sqrt5}{2} \approx 1.118$.`,
  },
  {
    id: 'p-frequency', topic: 'ch3', source: 'Lecture 10 · §3.4', type: 'numeric',
    prompt: r`What is the frequency of $y'' + 100y = 0$ (cycles per second)?`,
    answer: 10 / (2 * Math.PI), tolerance: 0.005, unit: 'Hz',
    explain: r`frequency $= \frac{\omega_0}{2\pi} = \frac{10}{2\pi} \approx 1.592$.`,
  },
  {
    id: 'p-under', topic: 'ch3', source: 'Lecture 10 · §3.4', type: 'numeric',
    prompt: r`$y'' + 2y' + 5y = 0$ is underdamped. What is the damped angular frequency $\omega_1$?`,
    answer: Math.sqrt(5 - 1), tolerance: 0.001,
    explain: r`$p = 1$, $\omega_0^2 = 5$, so $\omega_1 = \sqrt{\omega_0^2 - p^2} = 2$.`,
  },
  {
    id: 'p-particular', topic: 'ch3', source: 'Lecture 10 · §3.5', type: 'numeric',
    prompt: r`For $y'' + 4y = t^2 + 1$, the particular solution is $y_p = At^2 + Bt + C$. What is $C$?`,
    answer: 1 / 8, tolerance: 0.001,
    explain: r`$4A = 1$, $4B = 0$, $2A + 4C = 1$ ⇒ $C = \frac18$.`,
  },
  {
    id: 'p-eigen', topic: 'ch3', source: 'Lecture 11 · §3.8', type: 'numeric',
    prompt: r`For $y'' + \lambda y = 0$, $y(0) = y(\pi) = 0$, what is the third eigenvalue $\lambda_3$?`,
    answer: 9, tolerance: 0.001,
    explain: r`$\lambda_n = \frac{n^2\pi^2}{L^2}$ with $L = \pi$ gives $\lambda_3 = 9$, eigenfunction $\sin 3t$.`,
  },
];
