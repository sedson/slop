// @ts-check
/**
 * @file A lisp dialect.
 */
import { SlopToken } from "./token.mjs";
import { SlopType } from "./types.mjs";
import { Context } from "./context.mjs";
import { tokenize } from "./tokenize.mjs";
import { parse } from "./parse.mjs";
import { interpret, Core } from "./interpret.mjs";
import { prettyPrint } from "./pretty-print.mjs";
import { utils, math, lists, prng } from "./lib.mjs";

export const SpecialWords = {
  nil: SlopType.nil(),
  empty: SlopType.list([]),
  true: SlopType.bool(true),
  false: SlopType.bool(false),
  else: SlopType.bool(true),
};

export const lib = { ...utils, ...math, ...lists, ...prng };
for (const [key, val] of Object.entries(lib)) {
  if (val instanceof Function) {
    val.funcName = key;
  }
}

export {
  SlopToken,
  SlopType,
  Context,
  tokenize,
  parse,
  interpret,
  prettyPrint,
};

export const extensions = {};


/**
 * Keywords for syntax highlight.
 * @type {string[]}
 */
export const keywords = Object.keys({ ...Core, ...SpecialWords });

/**
 * Read source text and return a tokens array and a syntax tree.
 * @param {string} source
 */
export function read(source) {
  const tokens = tokenize(source);
  try {
    const tree = parse(tokens);
    return { ok: true, tokens, tree };
  } catch (e) {
    return { ok: false, tokens, error: e };
  }
}

let _time = performance.now();

function time() {
  let now = performance.now();
  let elapsed = now - _time;
  _time = now;
  return elapsed;
}

export function run(source, context) {
  const stats = {};
  time();

  const tokens = tokenize(source);
  stats.tokenize = time();

  try {
    const tree = parse(tokens);
    stats.parse = time();
    let result = undefined;

    for (let expression of tree) {
      result = interpret(expression, context);
    }

    stats.interpret = time();

    return { ok: true, result, tree, tokens, stats };
  } catch (e) {
    return { ok: false, error: e, tokens, stats};
  }
}

export function registerExtension(name, fn) {
  if (!(name in extensions)) {
    extensions[name] = fn;
  }
}
