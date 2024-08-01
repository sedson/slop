/**
 * @file A lisp dialect.
 */
import { Type } from './types.mjs';
import { Context } from './context.mjs';
import { tokenize } from './tokenize.mjs';
import { parse } from './parse.mjs';
import { interpret, core, extensions } from './interpret.mjs';
import { prettyPrint } from './pretty-print.mjs';
import { utils, math, lists, prng } from './lib.mjs';

export const SpecialWords = {
  nil: undefined,
  null: null,
  empty: [],
  true: true,
  false: false,
  else: true
};

export const lib = { ...utils, ...math, ...lists, ...prng };

export { Type, Context, tokenize, parse, interpret, prettyPrint, extensions };

/**
 * Keywords for syntax highlight.
 * @type {string[]}
 */ 
export const keywords = Object.keys({ ...core, ...SpecialWords });

/**
 * Read source text and return a tokens array and a syntax tree.
 * @param {string}
 */ 
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


export function registerExtension(name, fn) {
  if (!(name in extensions)) {
    extensions[name] = fn;
  }
}