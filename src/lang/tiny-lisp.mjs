/**
 * @file Implementation of a tiny lisp dialect.
 */

/** 
 * Make a bunch of simple character testers. I prefer this to regex.
 */ 
const is = {
  leftParen: (char) => char === '(',
  rightParen: (char) => char === ')',
  leftBrace: (char) => char === '{',
  rightBrace: (char) => char === '}',
  leftBracket: (char) => char === '[',
  rightBracket: (char) => char === ']',
  leftDelim: (char) => is.leftParen(char) || is.leftBrace(char) || is.leftBracket(char),
  rightDelim: (char) => is.rightParen(char) || is.rightBrace(char) || is.rightBracket(char),
  digit: (char) => char >= '0' && char <= '9',
  whitespace: (char) => char === ' ' || char === '\n' || char === '\t',
  linebreak: (char) => char === '\n',
  hash: (char) => char === '#',
  semicolon: (char) => char === ';',
  dot: (char) => char === '.',
  number: (char) => is.digit(char) || is.dot(char),
  quote: (char) => char === `"`,
  singlequote: (char) => char === `'`,
  underscore: (char) => char === '_',
  dollar: (char) => char === '$',
  at: (char) => char === '@',
  tilde: (char) => char === '~',
  colon: (char) => char === ':',
  dash: (char) => char === '-',
  letter: (char) => (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z'),
  word: (char) => !is.whitespace(char) &&
    !is.leftDelim(char) &&
    !is.rightDelim(char),
};


/**
 * Entity types.
 */ 
export const types = {
  lparen: 'lparen',
  rparen: 'rparen',
  lbrace: 'lbrace',
  rbrace: 'rbrace',
  lbracket: 'lbracket',
  rbracket: 'rbracket',
  
  num: 'num',
  str: 'str',
  literal: 'literal',
  comment: 'comment',
  identifier: 'identifier',
  list: 'list',
  hashmap: 'hashmap',
  
  unknown: 'unknown',
  eof: 'eof',
};


/**
 * Reserved words in the lang.
 */ 
export const reservedValues = {
  null: null,
  nil: null,
  else: true,
  false: false,
  true: true,
  empty: [],
};


/**
 * The core functions.
 */ 
export const core = {
  if: 'if',
  fn: 'fn',
  def: 'def',
  defn: 'defn',
  fnjs: 'fnjs',
  cond: 'cond',
  for: 'for',
  let: 'let',
  set: 'set',
};


// Export the keywords.
export const keywords = Object.keys({ ...core, ...reservedValues });


/**
 * String reading helper.
 */ 
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

    if (is.leftDelim(char)) {
      parenDepth += 1;
      const type = is.leftParen(char) ? types.lparen : 
        (is.leftBrace(char) ? types.lbrace : types.lbracket);

      const t = token(type, grab(), char, [tokenStart, reader.loc], line, colStart);
      t.depth = parenDepth;
      tokens.push(t);
      continue;
    }

    if (is.rightDelim(char)) {
      const type = is.rightParen(char) ? types.rparen : 
        (is.rightBrace(char) ? types.rbrace : types.lbracket);

      const t = token(type, grab(), char, [tokenStart, reader.loc], line, colStart);
      
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

    if (is.singlequote(char)) {
      while(is.word(peek()) && !reader.done()){
        next();
      }
      push(types.str, grab().slice(1), grab());
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

  tokens.push(token(types.eof, '', '', [reader.loc, reader.loc], line));
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
  const prev = () => tokens[Math.max(loc - 1, 0)];
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
    const start = prev().range[0];
    
    const elems = [];

    while (!match(types.rparen)) {
      let expr = expression();
      if (expr) elems.push(expr);
    }
    
    const end = prev().range[1];
    
    return {
      type: types.list, elements: elems, range: [start, end]
    }
  };

  const hashmap = () => {
    const dict = {};
    let isKey = true;
    let key = null;

    while (!match(types.rbrace)) {
      if (isKey) {
        key = expression();
      } else {
        dict[key.val] = expression();
      }
      isKey = !isKey;
    }

    return { type: types.hashmap, hashmap: dict };
  }


  const atom = () => {
    const token = next();
    switch (token.type) {
    
    case types.identifier:
      return { 
        type: types.identifier, 
        val: token.val, 
        subpath: token.subpath, 
        range: token.range
      };
    
    case types.num:
    case types.str:
      return { 
        type: types.literal, 
        val: token.val,
        range: token.range
      };

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

    if (match(types.lbrace)) {
      if (match(types.rbrace)) {
        return  { _hashmap: true };
      }
      return hashmap();
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
  const tokens = tokenize(source);
  try {
    const tree = ast(tokens);
    return { ok: true, tokens, tree }
  } catch (e) {
    return { ok: false, tokens, error: e };
  }
}


export function run(source, context) {
  const tokens = tokenize(source);
  try {
    const tree = ast(tokens);
    
    let result = null;
    
    for (let expression of tree) {
      result = interpret(expression, context);
    }

    return { ok: true, result, tree, tokens };

  } catch (e) {

    return { ok: false, error: e, tokens};
  }
}


/**
 * Search for a nested path in the object outer.
 * @param {object} outer The context to search in.
 * @param {string[]} path The array of strings to search with.
 * @return {[any, object]} A tuple where the first element is the asked for
 *     value or undefined. The second element is the direct parent which is 
 *     helpful for binding 'this' if the value is a function.
 */ 
export function _nested (outer, path) {
  let parent = outer;
  for (let i = 0; i < path.length - 1; i++) {
    const target = path[i];
    if (parent && parent[target] !== undefined) {
      parent = parent[target];
    }
  }
  return [parent[path[path.length - 1]], parent];
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
        let [ nestedVal, parent ] = _nested(this.env[id], subpath);
        if (nestedVal !== undefined) {
          if (nestedVal instanceof Function) {
            return nestedVal.bind(parent)
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

  if (expression.type === types.hashmap) {
    const newMap = {};
    for (let key in expression.hashmap) {
      if (is.underscore(key[0])) continue;
      newMap[key] = interpret(expression.hashmap[key], context);
    }
    return newMap;
  }

  if (expression.type !== types.list)
    throw new Error('Unhandled non-list case');

  // Create a new context if needed.
  if (!context) context = new Context();

  const elements = expression.elements;

  // Now we are in a list.
  let first = elements[0].val;

  // Check for core functions.
  if (first in core) {
    switch (core[first]) {

    case core.def:
      return _def(elements[1].val, elements[2], context);

    case core.if:
      return _if(elements[1], elements[2], elements[3], context);

    case core.fn:
      return _fn(elements[1], elements.slice(2), context);

    case core.fnjs:
      return _fnjs(elements[1], elements.slice(2), context);

    case core.defn:
      return _defn(elements[1].val, elements[2], elements.slice(3), context)

    case core.cond:
      return _cond(elements.slice(1), context);

    case core.for:
      return _for(elements[1], elements[2], elements.slice(3), context);

    case core.let:
      return _let(elements[1], elements.slice(2), context);
    }
  }

  // Interpret each element of the list.
  const list = elements.map(n => interpret(n, context));

  // If function, apply to list.
  if (list[0] instanceof Function) {
    return list[0](...list.slice(1));
  }

  // Else just return list.
  return list;
}

 
const binaryOps = ['**', '>', '<', '>=', '<='];
const multiOps = ['*', '+', '-', '/'];


export function toJS(expression, context = null, useReturn = false) {

  const format = (str) => useReturn ? `return ${str}` : str;
  const _js = (arg) => toJS(arg, context);

  if (typeof expression === 'number') 
      return format(expression);
  
  if (typeof expression === 'string') 
      return format(`"${expression}"`);
  
  if (expression.type === types.literal) 
    return toJS(expression.val, context);

  if (expression.type === types.identifier) {

    try {
      let val = context.get(expression.val);
      return _js(val);
    } catch {
      return format(expression.val);
    }    
  }

  if (expression.type !== types.list) {
    throw new Error('toJs error!')
  }
  
  const fn = expression.elements[0];
  const args = expression.elements.slice(1);
  
  if (binaryOps.includes(fn.val)) {
    return format(`(${_js(args[0])} ${fn.val} ${_js(args[1])})`);
  }

  if (multiOps.includes(fn.val)) {
    const joined = args.map(x => _js(x)).join(` ${fn.val} `);
    return format(`(${joined})`);
  }

  if (fn.val === '=') {
    return format(`(${_js(args[0])} === ${_js(args[1])})`);
  }

  if (fn.val === 'if') {
    return format(`(${_js(args[0])} ? ${_js(args[1])} : ${_js(args[2])})`);
  }

  if (Math[fn.val] !== undefined) {
    const interpretedArgs = args.map(x => _js(x)).join(', ');
    return format(`Math.${fn.val}(${interpretedArgs})`);
  }

  if (fn.val === 'nth') {
    const arr = _js(args[0]);
    const ndx = _js(args[1]);
    return format(`${arr}[${ndx}]`);
  }

  if (fn.val === 'def') {
    if (useReturn) {
      const id = toJS(args[0]);
      return `let ${id} = ${_js(args[1])}; id`; 
    }
    return `let ${_js(args[0])} = ${_js(args[1])}`;
  }

  const list = expression.elements.map(x => _js(x)).join(', ');
  return format(`[${list}]`);
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
    const localContext = new Context(context.env, params.elements, args);
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

function _fnjs(params, body, context) {
  const bodyExprs = [];
  console.log(JSON.stringify(context))

  for (let i = 0; i < body.length; i++) {
    if (i === body.length - 1) {
      bodyExprs.push(toJS(body[i], context, true));
    } else {
      bodyExprs.push(toJS(body[i], context));
    }
  }
  const paramsJS = toJS(params, context).slice(1, -1);
  const fnString = `(${paramsJS}) => {\n  ${bodyExprs.join('\n  ')}\n}`;
  console.log(fnString);
  return eval(fnString);
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
  let [start, end, by] = controlValues.elements.map(n => interpret(n, context));
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