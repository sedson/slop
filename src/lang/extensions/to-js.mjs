/**
 * @file To js "compile" extensnsion.
 */

import { registerExtension } from "../index.mjs";
import { SlopList, SlopType } from "../types.mjs";

registerExtension("fnjs", _fnjs);
registerExtension("defnjs", _defnjs);

function isBinaryOp(op) {
  return ["**", ">", "<", ">=", "<="].some(
    (expectedOp) => op.valueOf() === expectedOp
  );
}
function isMultiOp(op) {
  return ["*", "+", "-", "/"].some((expectedOp) => op.valueOf() === expectedOp);
}

export function toJS(expression, context = null, useReturn = false) {
  const format = (str) => (useReturn ? `return ${str}` : str);
  const _js = (arg) => toJS(arg, context);

  if (SlopType.isNum(expression)) return format(expression);

  if (SlopType.isString(expression)) return format(`"${expression}"`);

  if (SlopType.isSymbol(expression)) {
    try {
      let val = context.get(expression);
      return _js(val);
    } catch {
      return format(expression);
    }
  }

  if (!SlopType.isList(expression)) {
    throw new Error("toJs error!");
  }

  const [first, rest] = SlopList.decap(expression);

  if (isBinaryOp(first)) {
    const [second, third] = SlopList.take(rest, 2);
    return format(`(${_js(second)} ${first} ${_js(third)})`);
  }

  if (isMultiOp(first)) {
    const joined = rest.map((x) => _js(x)).join(` ${first} `);
    return format(`(${joined})`);
  }

  if (first.valueOf() === "=") {
    const [second, third] = SlopList.take(rest, 2);
    return format(`(${_js(second)} === ${_js(third)})`);
  }

  if (first.valueOf() === "if") {
    const [cnd, thn, els] = SlopList.take(rest, 3);
    return format(`(${_js(cnd)} ? ${_js(thn)} : ${_js(els)})`);
  }

  if (Math[first] !== undefined) {
    const interpretedArgs = rest.map((x) => _js(x)).join(", ");
    return format(`Math.${first}(${interpretedArgs})`);
  }

  if (first === "nth") {
    const [arr, ndx] = SlopList.take(rest, 2);
    return format(`${arr}[${ndx}]`);
  }

  if (first === "def") {
    const [name, val] = SlopList.take(rest, 2);
    if (useReturn) {
      const id = toJS(name);
      return `let ${id} = ${_js(val)}; id`;
    }
    return `let ${_js(name)} = ${_js(val)}`;
  }

  const list = expression.map((x) => _js(x)).join(", ");
  return format(`[${list}]`);
}

function _fnjs(elements, context) {
  const [params, body] = SlopList.decap(elements);
  const bodyExprs = [];
  SlopList.forEach(body, (cur, i) => {
    if (i === SlopList.len(body) - 1) {
      bodyExprs.push(toJS(cur, context, true));
    } else {
      bodyExprs.push(toJS(cur, context));
    }
  });

  const paramsJS = toJS(params, context).slice(1, -1);
  const fnString = `(${paramsJS}) => {\n  ${bodyExprs.join("\n  ")}\n}`;
  console.log(fnString);
  return eval(fnString);
}

function _defnjs(elements, context) {
  const [label, rest] = SlopList.decap(elements);
  const func = _fnjs(rest, context);
  func.funcName = label;
  return context.set(label, func);
}
