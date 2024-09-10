/**
 * @file Runtime interpreter for Slop.
 */
import {
  SlopType,
  SlopList,
  SlopFn,
  SlopDict,
} from "./types.mjs";

import { prettyPrint, SpecialWords, extensions } from "./index.mjs";
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
  const [first, second] = elements;

  const interpreted = interpret(second, context);

  if (SlopType.isSymbol(first)) {
    return context.set(first, interpreted, isDef, first.subpath);
  }

  if (SlopType.isListLike(first) && SlopType.isListLike(interpreted)) {
    SlopList.forEach(first, (val, i) => {
      setWithDestructure([val, interpreted[i]], context, isDef);
    });
    return interpreted;
  }

  if (SlopType.isDict(first) && SlopType.isDict(interpreted)) {
    for (let [key, sym] of SlopDict.entries(first)) {
      setWithDestructure([sym, interpret[key]], context, isDef);
    }
    return interpreted;
  }

  error("unexpected types in assignment " + prettyPrint(first, interpreted))
}


/**
 * Create a lambda.
 * @param {array} expr The first elements is the list of formal param 
 *     symbols. The remaining elements are the body of the function.
 * @param {Context} context The parent context/scope
 * @param {boolean} The name of the functions (only if not anon) for pretty 
 *     printing.
 * @return {function}
 */
function lambda(expr, context, name = undefined) {
  const [params, body] = SlopList.decap(expr);
  return SlopType.fn((...args) => {
    const localContext = new Context(context.env, params ?? [], args);
    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  }, name);
}


/**
 * Create a macro.
 * @param {array} expr The first elements is the list of formal param 
 *     symbols. The remaining elements are the body of the function.
 * @param {Context} context The parent context/scope
 * @param {boolean} The name of the functions (only if not anon) for pretty 
 *     printing.
 * @return {function}
 */
function macro(expr, context, name = undefined) {
  const [params, body] = SlopList.decap(expr);
  return SlopType.macro((...args) => {
    const localContext = new Context(context.env, params ?? [], args);
    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  }, name);
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
    return lambda([SlopType.symbol("x"), ...expr], context)
  },

  defn: (expr, context) => {
    const [name, rest] = SlopList.decap(expr);
    const func = lambda(rest, context, name);
    return Core.def([name, func], context, true);
  },

  macro: (expr, context) => {
    return macro(expr, context);
  },

  defmacro: (expr, context) => {
    const [name, rest] = SlopList.decap(expr);
    const mac = macro(rest, context, name);
    return Core.def([name, mac], context, true);
  },

  let: (expr, context) => {
    const localContext = new Context(context.env);
    const [definitions, body] = SlopList.decap(expr);

    SlopList.forEach(definitions, (def) => {
      Core.def(def, localContext);
    });

    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  },

  do: (expr, context) => {
    const localContext = new Context(context.env);
    return SlopList.reduce(expr, (_, expr) => interpret(expr, localContext));
  },

  upscope: (expr, context) => {
    return SlopList.reduce(expr, (_, expr) => interpret(expr, context));
  },

  for: (expr, context) => {
    const [[label, control], body] = SlopList.split(expr, 2);
    let [start, end, by] = SlopList.map(control, (n) => interpret(n, context));
    by = by ?? 1;

    if (SlopType.isNil(start) || SlopType.isNil(end) || Math.sign(end - start) !== Math.sign(by)) {
      error(`malformed list control: [let _ = ${start}; _ to ${end}; _ += ${by}`);
    }
    
    let res = SlopType.nil();
    const localContext = new Context(context.env);
    const done = (i) => (end > start ? i < end : i > end);    
     
    for (let i = start; done(i); i += by) {
      localContext.set(label, i);
      for (let expr of body) {
        res = interpret(expr, localContext);
      }
    }
    return res;
  },

  if: (expr, context) => {
    const [predicate, ifBranch, elseBranch] = SlopList.take(expr, 3);
    let condition = interpret(predicate, context);
    if (SlopType.isNil(condition) || condition === false) {
      return interpret(elseBranch, context);
    } else {
      return interpret(ifBranch, context);
    }
  },

  cond: (expr, context) => {
    for (let arm of SlopList.iter(expr)) {
      const [condition, then] = arm;
      if (SlopType.isTruthy(interpret(condition, context))) {
        return interpret(then, context);
      }
    }
  },

  type: (expr, context) => {
    if (expr.length > 1) {
      error("can only type one form");
    }
    return SlopType.getType(interpret(expr[0], context));
  },

  symbol: (expr, context) => {
    if (SlopType.isListLike(expr) && expr.length > 1) {
      error("can only symbol one form");
    }
    return SlopType.symbol(interpret(expr[0], context));
  },

  list: (expr, context) => {
    return SlopType.list(expr.map(e => interpret(e, context)));
  },

  vec: (expr, context) => {
    return SlopType.vec(expr.map(e => interpret(e, context)));
  },

  eval: (expr, context) => {
    return interpret(interpret(expr[0], context), context);
  },

  quote: (expr, context) => {
    if (SlopType.isListLike(expr) && expr.length > 1) {
      error("can only quote one form");
    }
    return expr[0];
  },

  splice: (expr, context) => {
    if (SlopType.isListLike(expr) && expr.length > 1) {
      error("can only splice one form");
    };
    const interpreted = interpret(expr[0], context);
    return SlopType.splice(interpreted);
  },

  quasi: (expr, context, top = true) => {
    if (top) {
      if (expr.length > 1) {
        error("can only quasi one form");
      }
      return Core.quasi(expr[0], context, false);
    }

    if (SlopType.isAtom(expr) || SlopType.isFn(expr)) {
      return expr;
    }
    
    if (SlopType.isListLike(expr)) {
      const [first, rest] = SlopList.decap(expr);
      
      if (first == "unquote") {
        return interpret(rest[0], context);
      }

      if (first == "splice-unquote") {
        const evaluated = interpret(rest[0], context);
        if (!SlopType.isListLike(evaluated)) {
          error("cannot splice non-list value");
        }
        return SlopType.splice(evaluated);
      }

      return SlopList.map(expr, (expr) => Core.quasi(expr, context, false));
    }

    if (SlopType.isDict(expr)) {
      return SlopDict.mapVals(expr, (expr) => Core.quasi(expr, context, false));
    }
  },

  unquote: (expr, context,) => {
    error("unquote only valid inside quasiquote")
  },

  "splice-unquote": (expr, context) => {
    error("splice-unquote only valid inside quasiquote")
  }
};


/**
 * Run the interpreter on an expression.
 * @param {ExpressionNode} expression
 * @param {Context} The context to execute in.
 */
export function interpret(expression, context) {
  // Create a new context if needed.
  if (!context) context = new Context();
  
  const interpInCtx = (expr) => interpret(expr, context);

  if (SlopType.isFn(expression) || SlopType.isMacro(expression)) {
    return expression;
  }

  // Keyword check.
  if (SlopType.isSymbol(expression)) {
    if (expression in SpecialWords) {
      return SpecialWords[expression];
    }
    
    return context.get(expression);
  }

  if (SlopType.isAtom(expression)) return expression;

  if (SlopType.isDict(expression)) {
    return SlopDict.mapVals(expression, interpInCtx);
  }

  if (SlopType.isVec(expression)) {
    console.log('interpVec', (expression));
    return SlopList.map(expression, interpInCtx);
  }

  if (!SlopType.isList(expression)) {
    error(`unnhandled non-list case: ${expression}`);
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

  if (SlopType.isMacro(first)) {
    const expanded = SlopFn.apply(first, rest);
    return interpret(expanded, context);
  }

  if (SlopType.isSymbol(first) && SlopType.isMacro(context.get(first))) {
    const expanded = SlopFn.apply(context.get(first), rest);
    return interpret(expanded, context);
  }
  
  // Interpret each element of the list.
  const evaledExprs = expression.map(interpInCtx);
  [first, rest] = SlopList.decap(evaledExprs);

  // If function, apply to list.
  if (SlopType.isFn(first)) {
    return SlopFn.apply(first, rest);
  }

  // Invoke dict as a function if it has only one arg. With args[1] as a key.
  if (SlopType.isDict(first)) {
    if (SlopList.len(rest) === 1) {
      return SlopDict.get(first, SlopList.first(rest));
    }
  }

  error("first elem not a function: " + prettyPrint(expression));
}