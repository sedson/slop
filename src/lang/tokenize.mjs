// @ts-check
/**
 * @file Slop tokenizer.
 */

import { SlopToken, Token } from "./token.mjs";
import { is, Reader } from "./parsing-utils.mjs";

const charMap = new Map([
  ["(", SlopToken.enum.L_PAREN],
  ["[", SlopToken.enum.L_BRACKET],
  ["{", SlopToken.enum.L_BRACE],
  [")", SlopToken.enum.R_PAREN],
  ["]", SlopToken.enum.R_BRACKET],
  ["}", SlopToken.enum.R_BRACE],
]);


/**
 * Split the code source string into tokens.
 * @param {string} input The source.
 * @return {Token[]}
 */
export function tokenize(input) {
  
  let reader = new Reader(input);
  
  /** @type {Token[]} */
  let tokens = [];

  let line = 0;
  let col = 0;
  let parenDepth = 0;

  let tokenStart = 0;
  let colStart = 0;

  const peek = () => reader.peek();
  const next = () => {
    col++;
    return reader.next();
  };

  const grab = (offset = 0) => {
    return reader.grab(tokenStart + offset, reader.loc - offset);
  };

  /**
   * @param {import("./token.mjs").TokenType} type The token type.
   * @param {any} val The value of the token.
   * @return {Token}
   */
  const token = (type, val, str = '', depth = -1) => {
    return new Token(type, val, str || grab(), [tokenStart, reader.loc], line, colStart, depth);
  }

  while (!reader.done()) {
    tokenStart = reader.loc;
    colStart = col;
    const char = next();

    if (is.hash(char)) {
      while (!is.linebreak(peek()) && !reader.done()) {
        next();
      }
      tokens.push(token(SlopToken.enum.COMMENT, grab()));
      continue;
    }

    if (is.leftDelim(char)) {
      parenDepth += 1;
      const type = charMap.get(char) ?? SlopToken.enum.L_PAREN;
      tokens.push(token(type, char, char, parenDepth));
      continue;
    }

    if (is.rightDelim(char)) {
      const type = charMap.get(char) ?? SlopToken.enum.R_PAREN;
      tokens.push(token(type, char, char, parenDepth));
      parenDepth -= 1;
      continue;
    }

    if (is.whitespace(char)) {
      if (is.linebreak(char)) {
        col = 0;
        line += 1;
      }
      continue;
    }

    if (is.quote(char)) {
      while (!is.quote(peek()) && !reader.done()) {
        next();
      }
      next();
      tokens.push(token(SlopToken.enum.STR, grab(1)));
      continue;
    }

    if (is.special(char)) {
      while (is.special(peek())) {
        next();
      }
      tokens.push(token(SlopToken.enum.SPECIAL, grab()));
      continue;
    }
    
    if (is.colon(char)) {
      while (is.word(peek()) && !reader.done()) {
        next();
      }
      tokens.push(token(SlopToken.enum.KEY, grab()));
      continue;
    }

    if (is.digit(char)) {
      while (is.number(peek()) && !reader.done()) {
        next();
      }
      const val = Number.parseFloat(grab());
      tokens.push(token(SlopToken.enum.NUM, val));
      continue;
    }

    // Handles negative numbers where the '-' touches the next digit.
    // And decimals with a leading '.'
    if (is.dash(char) || is.dot(char)) {
      if (is.digit(peek())) {
        while (is.number(peek()) && !reader.done()) {
          next();
        }
        const val = Number.parseFloat(grab());
        tokens.push(token(SlopToken.enum.NUM, val));
        continue;
      }
    }

    while (is.word(peek()) && !reader.done()) {
      next();
    }

    tokens.push(token(SlopToken.enum.SYMBOL, grab()));
  }

  const EOF = new Token(SlopToken.enum.EOF, "", "", [reader.loc, reader.loc], line, col, 0);
  tokens.push(EOF);
  return tokens;
}