/**
 * @file A lisp dialect.
 */
import { TokenType } from "./token.mjs";
import { SlopType, SlopVal } from "./types.mjs";
import { Context } from "./context.mjs";
import { tokenize } from "./tokenize.mjs";
import { parse } from "./parse.mjs";
import { interpret, Core, extensions } from "./interpret.mjs";
import { prettyPrint } from "./pretty-print.mjs";
import { utils, math, lists, prng } from "./lib.mjs";

export const SpecialWords = {
  nil: SlopVal.nil(),
  empty: SlopVal.list([]),
  true: SlopVal.bool(true),
  false: SlopVal.bool(false),
  else: SlopVal.bool(true),
};

export const lib = { ...utils, ...math, ...lists, ...prng };

export {
  TokenType,
  SlopType,
  Context,
  tokenize,
  parse,
  interpret,
  prettyPrint,
  extensions,
};

/**
 * Keywords for syntax highlight.
 * @type {string[]}
 */
export const keywords = Object.keys({ ...Core, ...SpecialWords });

/**
 * Read source text and return a tokens array and a syntax tree.
 * @param {string}
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

export function run(source, context) {
  const tokens = tokenize(source);
  try {
    const tree = parse(tokens);
    let result = undefined;

    for (let expression of tree) {
      result = interpret(expression, context);
    }

    return { ok: true, result, tree, tokens };
  } catch (e) {
    return { ok: false, error: e, tokens };
  }
}

export function registerExtension(name, fn) {
  if (!(name in extensions)) {
    extensions[name] = fn;
  }
}
