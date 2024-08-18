import { TokenType, token, SymbolToken } from "./token.mjs";
import { is, Reader } from "./parsing-utils.mjs";

/**
 * Split the code source string into tokens.
 * @param {string} input The source.
 * @param {array<Token>} An array of tokens.
 */
export function tokenize(input) {
  let reader = new Reader(input);
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

  const push = (type, val, str) => {
    tokens.push(
      token(type, val, str, [tokenStart, reader.loc], line, colStart)
    );
  };

  while (!reader.done()) {
    tokenStart = reader.loc;
    colStart = col;
    const char = next();

    if (is.hash(char)) {
      while (!is.linebreak(peek()) && !reader.done()) {
        next();
      }
      const t = token(
        TokenType.COMMENT,
        grab(),
        grab(),
        [tokenStart, reader.loc],
        line,
        colStart
      );
      tokens.push(t);
      continue;
    }

    if (is.leftDelim(char)) {
      parenDepth += 1;
      const type = is.leftParen(char)
        ? TokenType.L_PAREN
        : is.leftBrace(char)
        ? TokenType.L_BRACE
        : TokenType.L_BRACKET;

      const t = token(
        type,
        grab(),
        char,
        [tokenStart, reader.loc],
        line,
        colStart
      );
      t.depth = parenDepth;
      tokens.push(t);
      continue;
    }

    if (is.rightDelim(char)) {
      const type = is.rightParen(char)
        ? TokenType.R_PAREN
        : is.rightBrace(char)
        ? TokenType.R_BRACE
        : TokenType.R_BRACKET;

      const t = token(
        type,
        grab(),
        char,
        [tokenStart, reader.loc],
        line,
        colStart
      );

      t.depth = parenDepth;
      tokens.push(t);
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
      push(TokenType.STR, grab(1), grab());
      continue;
    }

    // if (is.singlequote(char)) {
    //   while (is.word(peek()) && !reader.done()) {
    //     next();
    //   }
    //   push(TokenType.STR, grab().slice(1), grab());
    //   continue;
    // }

    if (is.colon(char)) {
      while (is.word(peek()) && !reader.done()) {
        next();
      }
      push(TokenType.KEY, grab(), grab());
      continue;
    }

    if (is.digit(char)) {
      while (is.number(peek()) && !reader.done()) {
        next();
      }
      push(TokenType.NUM, Number.parseFloat(grab()), grab());
      continue;
    }

    // Handles negative numbers where the '-' touches the next digit.
    // And decimals with a leading '.'
    if (is.dash(char) || is.dot(char)) {
      if (is.digit(peek())) {
        while (is.number(peek()) && !reader.done()) {
          next();
        }
        push(TokenType.NUM, Number.parseFloat(grab()), grab());
        continue;
      }
    }

    while (is.word(peek()) && !reader.done()) {
      next();
    }

    push(TokenType.SYMBOL, grab(), grab());
  }

  tokens.push(
    token(TokenType.EOF, "", "", [reader.loc, reader.loc], line, col)
  );
  return tokens;
}