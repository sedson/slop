/**
 * @file Implementation of a tiny lisp dialect.
 */
import { Type } from './types.mjs';
import { Context } from './context.mjs';
import { tokenize } from './tokenize.mjs';
import { parse } from './parse.mjs';
import { interpret, core } from './interpret.mjs';
export { tokenize, parse, Context, interpret};

export const SpecialWords = {
  nil: null,
  null: null,
  empty: [],
  true: true,
  false: false,
  else: true
};


// Export the keywords.
export const keywords = Object.keys({ ...core, ...SpecialWords });

export function read(source) {
  const tokens = tokenize(source);
  try {
    const tree = parse(tokens);
    return { ok: true, tokens, tree }
  } catch (e) {
    return { ok: false, tokens, error: e };
  }
}


export function run(source, context) {
  const tokens = tokenize(source);
  try {
    const tree = parse(tokens);

    console.log(tree, tokens)
    
    let result = null;
    
    for (let expression of tree) {
      result = interpret(expression, context);
    }

    return { ok: true, result, tree, tokens };

  } catch (e) {

    return { ok: false, error: e, tokens};
  }
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
  
  if (expression.type === Type.LITERAL) 
    return toJS(expression.val, context);

  if (expression.type === Type.IDENTIFIER) {

    try {
      let val = context.get(expression.val);
      return _js(val);
    } catch {
      return format(expression.val);
    }    
  }

  if (expression.type !== Type.LIST) {
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




function _fnjs(params, body, context) {
  const bodyExprs = [];

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