import {
  isAtom,
  SlopType,
  SlopVal,
  SlopPred,
  SlopList,
  SlopFn,
  SlopDict,
  SlopBool,
} from "./types.mjs";
import { prettyPrint, SpecialWords } from "./index.mjs";
import { Context } from "./context.mjs";


function error(message) {
  throw new Error(`interpret - ${message}`);
}


/**
 * Bind a symbol in context. Handles destructuring. Used for the core functions 
 * 'def', 'var', and 'set'.
 * @param {array} elements A two-element array/list. The simplest example would 
 *     be something like [a : Symbol, 400] - bind the value 400 to the symbol a.
 * @param {Context} context The parent context/scope
 * @param {boolean} isDef Flag for whether we are looking at a def call or
 *     not. The Context handles these differently.
 * @return {Atom|Form} The interpreted result of right hand arm of the 
 *     assignment.
 */ 
function setWithDestructure(elements, context, isDef) {
  const [ first, second ] = elements

  const interpreted = interpret(second, context);

  if (SlopPred.isSymbol(first)) {
    return context.set(first, interpreted, isDef, first.subpath);
  }

  if (SlopPred.isListLike(first) && SlopPred.isListLike(interpreted)) {
    SlopList.forEach(first, (val, i) => {
      setWithDestructure([val, second[i]], context, isDef);
    });
    return interpreted;
  }

  if (SlopPred.isDict(first) && SlopPred.isDict(second)) {
    for (let [key, sym] of SlopDict.entries(first)){
      setWithDestructure([sym, second[key]], context, isDef);
    }
    return interpreted;
  }

  error("unexpected types in assignment " + prettyPrint(first, second))
}



/**
 * Create a lambda.
 * @param {array} elements The first elements is the list of formal param 
 *     symbols. The remaining elements are the body of the function.
 * @param {Context} context The parent context/scope
 * @param {boolean} The name of the functions (only if not anon) for pretty 
 *     printing.
 * @return {function}
 */
function lambda(elements, context, name = undefined) {
  const [params, body] = SlopList.decap(elements);
  return SlopVal.fn((...args) => {
    const localContext = new Context(context.env, params ?? [], args);
    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  }, name);
}

/**
 * Create a up-scoped, headless lambda. This runs without its own local 
 * context and 
 * @param {array} elements The first elements is the list of formal param 
 *     symbols. The remaining elements are the body of the function.
 * @param {Context} context The parent context/scope
 * @param {boolean} The name of the functions (only if not anon) for pretty 
 *     printing.
 * @return {function}
 */
function lambdaUpscope(elements, context) {
  const [params, body] = SlopList.decap(elements);
  return SlopVal.fn(() => {
    return SlopList.reduce(body, (_, expr) => interpret(expr, context));
  });
}



/**
 * The core functions.
 */
export const Core = {
  def: (expr, context) => {
    return setWithDestructure(expr, context, true);
  },

  var: (expr, context) => {
    return setWithDestructure(expr, context, false);
  },

  set: (expr, context) => {
    return setWithDestructure(expr, context, false);
  },

  fn: (expr, context) => {
    return lambda(expr, context);
  },

  fx: (expr, context) => {
    return lambda([SlopVal.symbol("x"), ...expr], context)
  },

  defn: (expr, context) => {
    const [name, rest] = SlopList.decap(expr);
    const func = lambda(rest, context, name);
    return Core.def([name, func], context, true);
  },

  list: (expr, context) => {
    return SlopVal.list(expr.map(e => interpret(e, context)));
  },

  let: (expr, context) => {
    const localContext = new Context(context.env);
    const [definitions, body] = SlopList.decap(expr);

    SlopList.forEach(definitions, (def) => {
      Core.def(def, localContext);
    });

    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  },

  for: (expr, context) => {
    const localContext = new Context(context.env);
    const [ [ label, control ], body ] = SlopList.split(expr, 2);
    let [start, end, by] = SlopList.map(control, (n) => interpret(n, context));
    by = by ?? 1;

    if ( SlopPred.isNil(start) || SlopPred.isNil(end) || Math.sign(end - start) !== Math.sign(by)) {
      error(`malformed list control: [let _ = ${start}; _ to ${end}; _ += ${by}`);
    }

    const func = lambdaUpscope([SlopVal.list([label]), ...body], localContext);
    let res = SlopVal.nil();

    const done = (i) => (end > start ? i < end : i > end);    
    for (let i = start; done(i); i += by) {
      localContext.set(label, i);
      res = func();
    }
    return res;
  },

  if: (expr, context) => {
    const [predicate, ifBranch, elseBranch] = SlopList.take(expr, 3);
    let condition = interpret(predicate, context);
    if (SlopPred.isNil(condition) || condition === false) {
      return interpret(elseBranch, context);
    } else {
      return interpret(ifBranch, context);
    }
  },




  defmacro: _defmacro,
  cond: _cond,
  quote: _quote,
  unquote: _unquote,
  quasiquote: _quasiquote,
  eval: _eval,
  type: _type,
  retype: _retype,
};

/**
 * Extensions functions.
 * TODO : if macros good, don't really need this.
 */
export const extensions = {};

/**
 * Run the interpreter on an expression.
 * @param {ExpressionNode} expression
 * @param {Context} The context to execute in.
 */
export function interpret(expression, context) {
  // Create a new context if needed.
  if (!context) context = new Context();
  
  const interpInCtx = (expr) => interpret(expr, context);

  if (SlopPred.isFn(expression)) {
    return expression;
  }

  // Keyword check.
  if (SlopPred.isSymbol(expression) && expression in SpecialWords)
    return SpecialWords[expression];

  // Get the value from context.
  if (SlopPred.isSymbol(expression)) {
    return context.get(expression, expression.subpath);
  }

  if (isAtom(expression)) return expression;

  if (SlopPred.isDict(expression)) {
    return SlopDict.mapVals(expression, interpInCtx);
  }

  if (SlopPred.isVec(expression)) {
    return SlopList.map(expression, interpInCtx);
  }

  if (!SlopPred.isList(expression)) {
    error(`unnhandled non-list case: ${expression}` );
  }

  if (!SlopList.len(expression)) {
    return expression;
  }

  let [first, rest] = SlopList.decap(expression);

  // Check for core functions.
  if (first in Core) {
    return Core[first](rest, context);
  }

  // Check for extensions.
  if (first in extensions) {
    return extensions[first](rest, context);
  }
  
  // Interpret each element of the list.
  const evaledExprs = expression.map(interpInCtx);
  [first, rest] = SlopList.decap(evaledExprs);

  // If function, apply to list.
  if (SlopPred.isFn(first)) {
    return SlopFn.apply(first, rest);
  }

  // Invoke dict as a function if it has only one arg. With args[1] as a key.
  if (SlopPred.isDict(first)) {
    if (SlopList.len(rest) === 1) {
      return SlopDict.get(first, SlopList.first(rest));
    }
  }

  error("first elem not a function: " + evaledExprs[0]);
}




function _type(elements, context, initial = true) {
  if (SlopPred.isList(elements) && initial) {
    return _type(interpret(SlopList.first(elements), context), context, false);
  }

  const val = elements;

  if (SlopPred.isNum(val)) return SlopType.NUM;

  if (SlopPred.isString(val)) return SlopType.STR;

  if (SlopPred.isFn(val)) return SlopType.FUNC;

  if (SlopPred.isNil(val)) return SlopType.NIL;

  if (SlopPred.isSymbol(val)) return SlopType.SYMBOL;

  if (SlopPred.isList(val)) return SlopType.LIST;

  if (SlopPred.isDict(val)) return SlopType.DICT;

  if (SlopPred.isKey(val)) return SlopType.KEY;

  error(`Unknown runtime type for value ${val}`);
}



function _cond(elements, context) {
  for (let arm of SlopList.iter(elements)) {
    const [condition, then] = SlopList.take(arm, 2);
    if (SlopBool.isTrue(interpret(condition, context))) {
      return interpret(then, context);
    }
  }
}

function _quote(elements) {
  if (elements.length !== 1) {
    error("may only quote one form");
  }
  return elements[0];
}

/**
 * Its like quote this shit, but look for the special form unqoute x and instead
 * call interpret on that x in the current context.
 */ 
function _quasiquote(element, context) {
}


function _unquote () {
  
}


function _retype(element, context) {
  if (SlopPred.isList(element)) {
    return _retype(SlopList.first(element), context);
  }

  if (SlopPred.isString(element)) {
    return `"${element}"`;
  }

  // What is this supposed to do?
  if (element.val !== undefined) {
    return element.val;
  }

  if (SlopPred.isList(element)) {
    return (
      "(" + SlopList.map(element, (x) => _retype(x, context)).join(" ") + ")"
    );
  }

  if (SlopPred.isDict(element)) {
    const entries = SlopList.map(
      SlopDict.entries(element),
      ([key, val]) => `${key} ${_retype(val, context)}`
    );
    return `{${entries.join(" ")}}`;
  }
}

/**
 * TODO Tests!
 */
function _eval(elements, context) {
  return interpret(interpret(SlopList.first(elements), context), context);
}

function _list(elements, context) {
  return SlopVal.list(elements.map((e) => interpret(e, context)));
}


function _macro(elements, context) {
  const params = elements[0];
  const body = elements.slice(1);

  return (...args) => {
    console.log('MACRO INVOKED')
    console.log({ params, args, body });

    const localContext = new Context(context.env, params.elements, args);
    return body.reduce((result, expr) => {
      result = interpret(expr, localContext);
      return result;
    }, undefined);
  };
}


function _defmacro(elements, context) {
  const label = elements[0].val;
  const func = _macro(elements.slice(1), context);
  func.isMacro = true;
  func.funcName = label;
  return context.set(label, func);
}
