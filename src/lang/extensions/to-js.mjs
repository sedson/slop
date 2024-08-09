/**
 * @file To js "compile" extensnsion.
 */

import { registerExtension, Type } from '../index.mjs';

registerExtension('fnjs', _fnjs);
registerExtension('defnjs', _defnjs);

const binaryOps = ['**', '>', '<', '>=', '<='];
const multiOps = ['*', '+', '-', '/'];

export function toJS(expression, context = null, useReturn = false) {

  const format = (str) => useReturn ? `return ${str}` : str;
  const _js = (arg) => toJS(arg, context);

  if (typeof expression === 'number') 
      return format(expression);
  
  if (typeof expression === 'string') 
      return format(`"${expression}"`);

  if (expression.type === Type.STR) 
      return format(`"${expression.val}"`);
  
  if (expression.type === Type.NUM) 
    return toJS(expression.val, context);


  if (expression.type === Type.IDENTIFIER) {

    try {
      let val = context.get(expression.val);
      return _js(val);
    } catch {
      return format(expression.val);
    }    
  }

  if (expression.type === Type.VEC) {
    const vec = expression.elements.map(x => _js(x)).join(', ');
    return format(`[${vec}]`);
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

function _fnjs(elements, context) {
  const params = elements[0];
  const body = elements.slice(1);
  console.log({body})
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


function _defnjs(elements, context) {
  const label = elements[0].val;
  const func = _fnjs(elements.slice(1), context);
  func.funcName = label;
  return context.set(label, func);
}

