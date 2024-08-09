import { TokenType } from "./token.mjs";
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
import { SpecialWords } from "./index.mjs";
import { Context } from "./context.mjs";

function error(message) {
  throw new Error(`interpret - ${message}`);
}

/**
 * The core functions.
 */
export const core = {
  def: _def,
  var: _var,
  fn: _fn,
  fx: _fx,
  defn: _defn,
  if: _if,
  cond: _cond,
  for: _for,
  set: _set,
  quote: _quote,
  eval: _eval,
  type: _type,
  retype: _retype,
  let: _let,
  list: _list,
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

  if (!SlopPred.isList(expression)) {
    console.log("PROBLEM", expression);
    error("Unhandled non-list case");
  }

  if (!SlopList.len(expression)) {
    return expression;
  }

  // Now we are in a list.
  let [first, rest] = SlopList.decap(expression);

  // Check for core functions.
  if (first in core) {
    return core[first](rest, context);
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

/**
 * Define a static variable.
 */
function _def(elements, context) {
  return _contextSet(elements, context, true);
}

/**
 * Define a dynamic variable.
 */
function _var(elements, context) {
  return _contextSet(elements, context, false);
}

function _set(elements, context) {
  return _contextSet(elements, context, false);
}

function _contextSet(elements, context, isDef) {
  const interpInCtx = (expr) => interpret(expr, context);
  const [first, second] = SlopList.take(elements, 2);

  if (SlopPred.isList(first) && SlopPred.isList(second)) {
    const interpreted = SlopList.map(second, interpInCtx);

    SlopList.forEach(first, (val, i) => {
      context.set(val, SlopList.at(interpreted, i), isDef, val.subpath);
    });

    return interpreted;
  }

  return context.set(first, interpInCtx(second), isDef, first.subpath);
}

/**
 * Create a lambda.
 * @return {function}
 */
function _fn(elements, context, name = undefined) {
  const [params, body] = SlopList.decap(elements);

  return SlopVal.fn((...args) => {
    const localContext = new Context(context.env, params, args);
    return SlopList.reduce(body, (_, expr) => interpret(expr, localContext));
  }, name);
}

/**
 * Create a simplified lamba that does not have its own local scope or params.
 * @return {function}
 */
function _fnBasic(elements, context) {
  return SlopVal.fn(() =>
    SlopList.reduce(elements, (_, expr) => interpret(expr, context))
  );
}

function _fx(elements, context) {
  return SlopVal.fn((x) => {
    const localContext = new Context(context.env, [{ val: "x" }], [x]);
    console.log(localContext);
    return SlopList.reduce(elements, (_, expr) =>
      interpret(expr, localContext)
    );
  });
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

/**
 * Define a function.
 */
function _defn(elements, context) {
  const [name, body] = SlopList.decap(elements);
  const func = _fn(body, context, name);
  return context.set(name, func);
}

function _if(elements, context) {
  const [predicate, ifBranch, elseBranch] = SlopList.take(elements, 3);

  let condition = interpret(predicate, context);
  if (
    (SlopPred.isBool(condition) && SlopBool.isFalse(condition)) ||
    SlopPred.isNil(condition)
  ) {
    return interpret(elseBranch, context);
  } else {
    return interpret(ifBranch, context);
  }
}

function _for(elements, context) {
  const [[label, controlValues], body] = SlopList.split(2);

  const localContext = new Context(context.env);

  let [start, end, by] = SlopList.map(controlValues, (n) =>
    interpret(n, context)
  );
  by = by ?? 1;

  if (
    SlopPred.isNil(start) ||
    SlopPred.isNil(end) ||
    Math.sign(end - start) !== Math.sign(by)
  ) {
    error(`Malformed list control: [let _ = ${start}; _ to ${end}; _ += ${by}`);
  }

  const fn = _fnBasic(body, localContext);
  let res = null;

  const done = (i) => (end > start ? i < end : i > end);
  for (let i = start; done(i); i += by) {
    localContext.set(label, i);
    res = fn();
  }

  return res;
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
  // const expr = interpret(SlopList.first(elements), context);
  // return interpret(expr, context);
}

function _let(elements, context) {
  const [bindings, body] = SlopList.decap(elements);

  const localContext = new Context(context.env);

  for (let binding of SlopList.iter(bindings)) {
    _def(binding, localContext);
  }

  let res = undefined;
  for (let elem of SlopList.iter(body)) {
    res = interpret(elem, localContext);
  }

  return res;
}

function _list(elements, context) {
  return SlopVal.list(elements.map((e) => interpret(e, context)));
}
