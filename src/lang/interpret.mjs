import { Type } from './types.mjs';
import { SpecialWords } from './index.mjs';
import { Context } from './context.mjs';


function error (message) {
  throw new Error( `interpret – ${message}`);
}

function isNumber (val) {
  return typeof val === 'number';
}

function isString (val) {
  return typeof val === 'string';
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

  if (expression === null || expression === undefined)
    return undefined;

  // Raw literal.
  if (isNumber(expression) || isString(expression)) {
    return expression;
  }

  // Parsed literal.
  if (expression.type === Type.NUM || expression.type === Type.STR)
    return expression.val;

  // Self-evaluating key word.
  if (expression.type === Type.KEY)
    return expression.val;

  // Keyword check.
  if (expression.val in SpecialWords)
    return SpecialWords[expression.val];

  // Get the value from context.
  if (expression.type === Type.IDENTIFIER)
    return context.get(expression.val, expression.subpath);


  if (expression.type === Type.DICT) {
    const newMap = {};
    for (let key in expression.dict) {
      newMap[key] = interpret(expression.dict[key], context);
    }
    return newMap;
  }

  if (expression.type === Type.VEC) {
    return expression.elements.map(n => interpret(n, context));
  }

  if (expression.type !== Type.LIST) {
    console.log('PROBLEM', expression);
    error('Unhandled non-list case');
  }

  // Create a new context if needed.
  if (!context) context = new Context();

  const elements = expression.elements;

  if (!elements.length) {
    return elements;
  }

  // Now we are in a list.
  let first = elements[0].val;

  // Check for core functions.
  if (first in core) {
    return core[first](elements.slice(1), context);
  }

  // Check for extensions.
  if (first in extensions) {
    return extensions[first](elements.slice(1), context);
  }

  // Interpret each element of the list.
  const list = elements.map(n => interpret(n, context));

  // If function, apply to list.
  if (list[0] instanceof Function) {
    return list[0](...list.slice(1));
  }

  // Invoke dict as a function if it has only one arg. With args[1] as a key.
  if (typeof list[0] === 'object') {
    if (list.length === 2) {
      return list[0][list[1]];
    }
  }

  console.log(list)
  error('first elem not a function: ' + list[0]);
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
  
  if (elements[0].type === Type.VEC && elements[1].type === Type.VEC) {
    
    const interpreted = elements[1].elements.map(x => interpret(x, context));
    for (let i = 0; i < elements[0].elements.length; i++) {
      const label = elements[0].elements[i].val;
      context.set(label, interpreted[i], isDef,  elements[0].elements[i].subpath);
    }
    return interpreted;
  }

  const label = elements[0].val;
  const value = elements[1];
  return context.set(label, interpret(value, context), isDef, elements[0].subpath);
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
    }, undefined);
  };
}


/**
 * Create a simplified lamba that does not have its own local scope or params.
 * @return {function}
 */
function _fnBasic(elements, context) {
  return () => {
    let res = undefined;
    for (let expr of elements) {
      res = interpret(expr, context);
    }
    return res;
  };
}

function _fx(elements, context) {
  return (x) => {
    const localContext = new Context(context.env, [{val: 'x'}], [x]);
    console.log(localContext);
    return elements.reduce((result, expr) => {
      result = interpret(expr, localContext);
      return result;
    }, undefined);
  }
}

function _type(elements, context) {
  if (Array.isArray(elements)) {
    return _type(elements[0], context);
  }

  const e = elements;
  // console.log('TYPE', e);

  if (isNumber(e)) return Type.NUM;
  if (isString(e)) return Type.STR;
  
  if (e instanceof Function) return Type.FUNC;
  
  if (e === undefined || e === null) return Type.NIL;

  if (e.type === Type.IDENTIFIER) {
    return _type(interpret(e, context), context);
  }
  if (e.type === Type.LIST) {
    // console.log('type of list', e)
    return _type(interpret(e, context), context);
  }

  return e.type;
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


/**
 * TODO Tests!
 */ 
function _cond(elements, context) {
  for (let condition of elements) {
    if (interpret(condition.elements[0], context)) {
      return interpret(condition.elements[1], context);
    }
  }
  return null;
}


/**
 * TODO Tests!
 */ 
function _quote(element) {
  if (Array.isArray(element)) {
    return _quote(element[0]);
  }

  if (isNumber(element) || isString(element)) {
    return element;
  }

  if (element.val !== undefined) {
    return element;
  }

  if (element.type === Type.LIST) {
    return {
      type: Type.LIST,
      elements: element.elements.map(_quote),
    };
  }
  
  if (element.type === Type.DICT) {
    return {
      type: Type.DICT,
      dict: Object.keys(element.dict).reduce((dict , key) => {
        dict[key] = _quote(element.dict[key]);
        return dict;
      }, {})
    }
  }

  return element;
}


function _retype(element, context) {
  if (Array.isArray(element)) {
    return _retype(element[0], context);
  }

  if (element.type === Type.STR) {
    return `"${element.val}"`;
  }

  if (element.val !== undefined) {
    return element.val;
  }

  if (element.type === Type.LIST) {
    return '(' + element.elements.map(x => _retype(x, context)).join(' ') + ')';
  }

   if (element.type === Type.VEC) {
    return '[' + element.elements.map(x => _retype(x, context)).join(' ') + ']';
  }

  if (element.type === Type.DICT) {
    const entries = Object.entries(element.dict).reduce((arr, entry) => {
      arr.push(entry[0] + ' ' + _retype(entry[1], context));
      return arr;
    }, []);

    return `{${entries.join(' ')}}`;
  }
}


/**
 * TODO Tests!
 */ 
function _eval(elements, context) {
  const expr = interpret(elements[0], context);
  return interpret(expr, context);
}


function _let(elements, context) {
  const bindings = elements[0];
  const body = elements.slice(1);

  const localContext = new Context(context.env);
  for (let binding of bindings.elements) {
    console.log({binding})
    _def(binding.elements, localContext);
  }

  let res = undefined;
  for (let elem of body) {
    res = interpret(elem, localContext);
  }

  return res;
}
