// A tiny, safe arithmetic parser for numeric answers: numbers, + - * / ^, parentheses,
// pi/π, e, and sqrt/√, ln, log, exp, sin, cos. Implicit multiplication like "2pi" or "3√5".
// Returns NaN for anything it can't parse. No eval.

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(src: string): Tok[] | null {
  const s = src.replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (num && !(num[2] && /^e[a-z]/i.test(s.slice(i + num[1].length)))) {
      out.push({ t: 'num', v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[a-z]+/i.exec(s.slice(i));
    if (id) { out.push({ t: 'id', v: id[0].toLowerCase() }); i += id[0].length; continue; }
    if ('+-*/^()'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
    return null;
  }
  return out;
}

export function evaluate(src: string): number {
  const parsed = tokenize(src);
  if (!parsed || !parsed.length) return NaN;
  const toks: Tok[] = parsed;
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;

  // expr := term (('+'|'-') term)*
  function expr(): number {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[pos++].v;
      v = op === '+' ? v + term() : v - term();
    }
    return v;
  }
  // term := unary (('*'|'/') unary | implicit unary)*
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp('*')) { pos++; v *= unary(); }
      else if (isOp('/')) { pos++; v /= unary(); }
      else if (peek() && (peek()!.t === 'num' || peek()!.t === 'id' || isOp('('))) v *= unary();
      else return v;
    }
  }
  // unary := '-' unary | power
  function unary(): number {
    if (isOp('-')) { pos++; return -unary(); }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  }
  // power := atom ('^' unary)?
  function power(): number {
    const base = atom();
    if (isOp('^')) { pos++; return Math.pow(base, unary()); }
    return base;
  }
  function atom(): number {
    const tk = toks[pos++];
    if (!tk) throw new Error('end');
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'op' && tk.v === '(') {
      const v = expr();
      if (!isOp(')')) throw new Error('paren');
      pos++;
      return v;
    }
    if (tk.t === 'id') {
      if (tk.v in CONSTS) return CONSTS[tk.v];
      if (tk.v in FUNCS) return FUNCS[tk.v](power());
    }
    throw new Error('bad token');
  }

  try {
    const v = expr();
    return pos === toks.length ? v : NaN;
  } catch {
    return NaN;
  }
}
