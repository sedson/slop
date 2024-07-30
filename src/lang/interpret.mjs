import { Type } from './types.mjs';
import { SpecialWords } from './tiny-lisp.mjs';
import { Context } from './context.mjs';

function error (message) {
  throw new Error( `interpret – ${message}`);
}


/**
 * The core functions.
 */
export const core = {
  def: _def,
  var: _var,
  fn: _fn,
  defn: _defn,
  if: _if,
  cond: _cond,
  for: _for,
  let: _let,
  set: _set,
};


/** 
 * Run the interpreter on an expression.
 * @param {ExpressionNode} expression 
 * @param {Context} The context to execute in.
 */
export function interpret(expression, context) {

  // Raw literal.
  if (typeof expression === 'number' || typeof expression === 'string') {
    return expression;
  }

  // Parsed literal.
  if (expression.type === Type.LITERAL)
    return expression.val;

  // Keyword check.
  if (expression.val in SpecialWords)
    return SpecialWords[expression.val];

  // Get the value from context.
  if (expression.type === Type.IDENTIFIER)
    return context.get(expression.val, expression.subpath);

  if (expression === undefined)
    return null;

  if (expression.type === Type.DICT) {
    const newMap = {};
    for (let key in expression.dict) {
      newMap[key] = interpret(expression.dict[key], context);
    }
    return newMap;
  }

  if (expression.type !== Type.LIST)
    error('Unhandled non-list case');

  // Create a new context if needed.
  if (!context) context = new Context();

  const elements = expression.elements;

  // Now we are in a list.
  let first = elements[0].val;

  // Check for core functions.
  if (first in core) {
    return core[first](elements.slice(1), context);
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


/**
 * Define a static variable.
 */
function _def(elements, context) {
  const label = elements[0].val;
  const value = elements[1];
  return context.set(label, interpret(value, context), true);
}


/**
 * Define a dynamic variable.
 */
function _var(elements, context) {
  const label = elements[0].val;
  const value = elements[1];
  return context.set(label, interpret(value, context), true);
}


/**
 * Create a lambda.
 * @return {function}
 */
function _fn(elements, context) {
  const params = elements[0];
  const body = elements.slice(1);

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
 * @return {function}
 */
function _fnBasic(elements, context) {
  return () => {
    let res = null;
    for (let expr of elements) {
      res = interpret(expr, context);
    }
    return res;
  };
}



/**
 * Define a function.
 */ 
function _defn(elements, context) {
  const label = elements[0].val;

  const func = _fn(elements.slice(1), context);
  func.funcName = label;
  return context.set(label, func);
}


function _if(elements, context) {
  const predicate = elements[0];
  const ifBranch = elements[1];
  const elseBranch = elements[2];

  let condition = interpret(predicate, context);
  if (condition === null || condition === false) {
    return (elseBranch === undefined) ? null : interpret(elseBranch, context);
  } else {
    return interpret(ifBranch, context);
  }
}


function _for(elements, context) {
  const label = elements[0].val;
  const controlValues = elements[1];
  const body = elements.slice(2);

  console.log(label, controlValues, body)

  const localContext = new Context(context.env);
  
  let [start, end, by] = controlValues.elements.map(n => interpret(n, context));
  by = by ?? 1;

  if (start === undefined || end === undefined || Math.sign(end - start) !== Math.sign(by)) {
    error(`Malformed list control: [let _ = ${start}; _ to ${end}; _ += ${by}`);
  }

  const fn = _fnBasic(body, localContext);
  let res = null;

  const done = (i) => end > start ? i < end : i > end;
  for (let i = start; done(i); i += by) {
    localContext.set(label, i);
    res = fn();
  }

  return res;
}



function _cond(elements, context) {
  for (let condition of elements) {
    if (interpret(condition[0], context)) {
      return interpret(condition[1], context);
    }
  }
  return null;
}



function _let(elements, context) {}
function _set(elements, context) {}