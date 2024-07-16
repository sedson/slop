/**
 * @file Implementation of a tiny lisp dialect.
 */
const is = {
  leftParen: (char) => char === '(',
  rightParen: (char) => char === ')',
  digit: (char) => char >= '0' && char <= '9',
  whitespace: (char) => char === ' ' || char === '\n' || char === '\t',
  linebreak: (char) => char === '\n',
  hash: (char) => char === '#',
  semicolon: (char) => char === ';',
  dot: (char) => char === '.',
  number: (char) => is.digit(char) || is.dot(char),
  quote: (char) => char === `"`,
  underscore: (char) => char === '_',
  dollar: (char) => char === '$',
  tilde: (char) => char === '~',
  colon: (char) => char === ':',
  dash: (char) => char === '-',
  letter: (char) => (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z'),
  word: (char) => !is.whitespace(char) &&
    !is.leftParen(char) &&
    !is.rightParen(char),
};

export const types = {
  lparen: 'lparen',
  rparen: 'rparen',
  num: 'num',
  str: 'str',
  identifier: 'identifier',
  unknown: 'unknown',
  literal: 'literal',
  comment: 'comment',
  eof: 'eof',
};

export const reservedValues = {
  null: null,
  nil: null,
  else: true,
  false: false,
  true: true,
  empty: [],
};

export const core = {
  if: 'if',
  fn: 'fn',
  def: 'def',
  defn: 'defn',
  cond: 'cond',
  for: 'for',
  let: 'let',
  set: 'set',
};

// Export the keywords.
export const keywords = Object.keys({ ...core, ...reservedValues });

export class StringReader {
  constructor(str) {
    this.str = str;
    this.loc = 0;
  }
  peek() { return this.str[this.loc]; }
  next() { return this.str[this.loc++]; }
  grab(start, end) { return this.str.slice(start, end); }
  done() { return this.loc >= this.str.length; }
}


/**
 * Split the code source string into tokens.
 * @param {string} input The source.
 * @param {array<Token>} An array of tokens.
 */
export function tokenize(input) {
  let reader = new StringReader(input);
  let tokens = [];

  let line = 0;
  let col = 0;
  let parenDepth = 0;

  let tokenStart = 0;
  let colStart = 0;

  const peek = () => reader.peek();
  const next = () => {
    col++;
    return reader.next();
  };
  const grab = (offset = 0) => {
    return reader.grab(tokenStart + offset, reader.loc - offset);
  };

  const token = (type, val, str, range, line, col) => {
    return { type, val, str, range, line, col };
  };

  const push = (type, val, str) => {
    tokens.push(token(type, val, str, [tokenStart, reader.loc], line, colStart));
  };

  while (!reader.done()) {
    tokenStart = reader.loc;
    colStart = col;
    const char = next();

    if (is.semicolon(char)) {
      while (!is.linebreak(peek()) && !reader.done()) {
        next();
      }
      const t = token(types.comment, grab(), grab(), [tokenStart, reader.loc], line, colStart);
      tokens.push(t);
      continue;
    }

    if (is.leftParen(char)) {
      parenDepth += 1;
      const t = token(types.lparen, grab(), '(', [tokenStart, reader.loc], line, colStart);
      t.depth = parenDepth;
      tokens.push(t);
      continue;
    }

    if (is.rightParen(char)) {
      const t = token(types.rparen, grab(), '(', [tokenStart, reader.loc], line, colStart);
      t.depth = parenDepth;
      tokens.push(t);
      parenDepth -= 1;
      continue;
    }

    if (is.whitespace(char)) {
      if (is.linebreak(char)) {
        col = 0;
        line += 1;
      }
      continue;
    }

    if (is.quote(char)) {
      while (!is.quote(peek()) && !reader.done()) {
        next();
      }
      next();
      push(types.str, grab(1), grab());
      continue;
    }

    if (is.digit(char)) {
      while (is.number(peek()) && !reader.done()) {
        next();
      }
      push(types.num, Number.parseFloat(grab()), grab());
      continue;
    }

    // Handles negative numbers where the '-' touches the next digit.
    // And decimals with a leading '.'
    if (is.dash(char) || is.dot(char)) {
      if (is.digit(peek())) {
        while (is.number(peek()) && !reader.done()) {
          next();
        }
        push(types.num, Number.parseFloat(grab()), grab());
        continue;
      }
    }

    while (is.word(peek()) && !reader.done()) {
      next();
    }

    const t = { ..._identifier(grab()), range: [tokenStart, reader.loc], line, col };
    tokens.push(t);
  }

  tokens.push(token(types.eof, '', '', [reader.loc], line));
  return tokens;
}


/**
 * Some extra logic for parsing identifiers.
 */ 
export function _identifier(str) {
  const reader = new StringReader(str);
  let useParts = is.tilde(reader.peek());

  if (!useParts) {
    return {
      type: types.identifier,
      val: str,
      str: str,
    };
  }

  let parts = [];
  let start = 0, loc = 0;
  while (!reader.done()) {
    loc = reader.loc;
    let char = reader.next();
    if (is.dot(char)) {
      parts.push(reader.grab(start, loc));
      start = loc + 1;
    }
  }
  parts.push(reader.grab(start, loc + 1));

  return {
    type: types.identifier,
    val: parts[0].slice(1),
    subpath: parts.slice(1),
    str: str,
  }
}


/**
 * Tokens -> abstract syntax tree.
 * @param {array<Token>} tokens.
 * @return {object} suntax tree.
 */
export function ast(tokens) {
  let loc = 0;
  const expressions = [];
  const peek = () => tokens[loc];
  const next = () => tokens[loc++];
  const done = () => peek().type === types.eof;

  const match = type => {
    if (peek().type === type) {
      next();
      return true;
    }
    return false;
  };

  const list = () => {
    const elems = [];
    while (!match(types.rparen)) {
      let expr = expression();
      if (expr) elems.push(expr);
    }
    return elems;
  };

  const atom = () => {
    const token = next();
    switch (token.type) {
    case types.identifier:
      return { type: types.identifier, val: token.val, subpath: token.subpath };
    case types.num:
    case types.str:
      return { type: types.literal, val: token.val };
    case types.comment:
      return false;
    default:
      throw new Error(`AST Error: unexpected type: ${token.type}, line: ${token.line}, col: ${token.col}`);
    }
  };

  const expression = () => {
    if (match(types.lparen)) {
      if (match(types.rparen)) {
        return { type: types.literal, val: null };
      }
      return list();
    }
    return atom();
  };

  while (!done()) {
    let exp = expression();
    if (exp) expressions.push(exp);
  }
  return expressions;
}


export function parse(source) {
  try {
    const tokens = tokenize(source);
    const tree = ast(tokens);
    return { ok: true, tokens, tree }
  } catch (e) {
    return { ok: false, error: e };
  }
}


export function run(source, context) {
  try {
    const { tree, tokens } = parse(source);

    let result = null;

    for (let expression of tree) {
      result = interpret(expression, context);
    }

    return { ok: true, result, tree, tokens };

  } catch (e) {

    return { ok: false, error: e };
  }
}

export function _nested (outer, path) {
  return path.reduce((obj, next) => {
    if (obj && obj[next]) return obj[next];
    return undefined;
  }, outer);
}



export class Context {
  constructor(scope = {}, params = [], args = []) {
    this.env = Object.setPrototypeOf({}, scope);
    for (let i = 0; i < params.length; i++) {
      this.env[params[i].val] = args[i];
    }
  }

  get(id, subpath) {
    if (id in this.env) {
      if (subpath && subpath.length >= 1) {
        let nestedVal = _nested(this.env[id], subpath);
        if (nestedVal !== undefined) {
          if (nestedVal instanceof Function) {
            return nestedVal.bind(this.env[id])
          }
          return nestedVal;
        } else {
          throw new Error('Subpath error for key: ' + id + ' and path: ' + subpath.join('.'));
        }
      }
      return this.env[id];
    } else {
      throw new Error('No value found for key: ' + id);
    }
  }

  set(id, val) {
    this.env[id] = val;
    return val;
  }
}

/** 
 * Run the interpreter on an expression.
 * @param {AST} expression 
 * @param {Context} The context to execute in.
 */
export function interpret(expression, context) {

  // Raw literal.
  if (typeof expression === 'number' || typeof expression === 'string') {
    return expression;
  }

  // Parsed literal.
  if (expression.type === types.literal)
    return expression.val;

  // Keyword check.
  if (expression.val in reservedValues)
    return reservedValues[expression.val];

  // Get the value from context.
  if (expression.type === types.identifier)
    return context.get(expression.val, expression.subpath);

  if (expression === undefined)
    return null;

  if (!Array.isArray(expression))
    throw new Error('Unhandled non-list case');

  // Create a new context if needed.
  if (!context) context = new Context();

  // Now we are in a list.
  let first = expression[0].val;

  // Check for core functions.
  if (first in core) {
    switch (core[first]) {

    case core.def:
      return _def(expression[1].val, expression[2], context);

    case core.if:
      return _if(expression[1], expression[2], expression[3], context);

    case core.fn:
      return _fn(expression[1], expression.slice(2), context);

    case core.defn:
      return _defn(expression[1].val, expression[2], expression.slice(3), context)

    case core.cond:
      return _cond(expression.slice(1), context);

    case core.for:
      return _for(expression[1], expression[2], expression.slice(3), context);

    case core.let:
      return _let(expression[1], expression.slice(2), context);
    }
  }

  // Interpret each element of the list.
  const list = expression.map(n => interpret(n, context));

  const [f, ...args] = list;

  // If function, apply to list.
  if (f instanceof Function) {

    return f(...args);
  }
  return list;
}

/**
 * Create a lambda
 * @param {List} params
 * @param {array<Expression>} body
 * @param {Context} context
 * @return {function}
 */
function _fn(params, body, context) {
  return (...args) => {
    const localContext = new Context(context.env, params, args);
    return body.reduce((result, expr) => {
      result = interpret(expr, localContext);
      return result;
    }, null);
  };
}

/**
 * Create a simplified lamba that does not have its own local scope or params.
 * @param {array<Expression>} body
 * @param {Context} context
 * @return {function}
 */
function _fn$(body, context) {
  return () => {
    let res = null;
    for (let expr of body) {
      res = interpret(expr, context);
    }
    return res;
  };
}

function _if(predicate, ifBranch, elseBranch, context) {
  let condition = interpret(predicate, context);
  if (condition === null || condition === false) {
    return (elseBranch === undefined) ? null : interpret(elseBranch, context);
  } else {
    return interpret(ifBranch, context);
  }
}

function _for(label, controlValues, body, context) {
  const localContext = new Context(context.env);
  let [start, end, by] = controlValues.map(n => interpret(n, context));
  by = by ?? 1;

  if (start === undefined || end === undefined || Math.sign(end - start) !== Math.sign(by)) {
    throw new Error(`Malformed list control: [let _ = ${start}; _ to ${end}; _ += ${by}`);
  }

  const fn = _fn$(body, localContext);
  let res = null;

  const done = (i) => end > start ? i < end : i > end;
  for (let i = start; done(i); i += by) {
    localContext.set(label.val, i);
    res = fn();
  }

  return res;
}


function _cond(expressions, context) {
  for (let condition of expressions) {
    if (interpret(condition[0], context)) {
      return interpret(condition[1], context);
    }
  }
  return null;
}

function _def(label, val, context) {
  return context.set(label, interpret(val, context));
}

function _defn(label, params, body, context) {
  const func = _fn(params, body, context);
  func.funcName = label;
  return context.set(label, func);
}

function _let(definitions, body, context) {

}

function _set(label, val, context) {

}