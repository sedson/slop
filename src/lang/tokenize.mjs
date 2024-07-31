import { Type } from './types.mjs';
import { is, Reader } from './parsing-utils.mjs';


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

  const token = (type, val, str, range, line, col) => {
    return { type, val, str, range, line, col };
  };

  const push = (type, val, str) => {
    tokens.push(token(type, val, str, [tokenStart, reader.loc], line, colStart));
  };

  while (!reader.done()) {
    tokenStart = reader.loc;
    colStart = col;
    const char = next();

    if (is.hash(char)) {
      while (!is.linebreak(peek()) && !reader.done()) {
        next();
      }
      const t = token(Type.COMMENT, grab(), grab(), [tokenStart, reader.loc], line, colStart);
      tokens.push(t);
      continue;
    }

    if (is.leftDelim(char)) {
      parenDepth += 1;
      const type = is.leftParen(char) ? Type.L_PAREN : 
        (is.leftBrace(char) ? Type.L_BRACE : Type.L_BRACKET);

      const t = token(type, grab(), char, [tokenStart, reader.loc], line, colStart);
      t.depth = parenDepth;
      tokens.push(t);
      continue;
    }

    if (is.rightDelim(char)) {
      const type = is.rightParen(char) ? Type.R_PAREN : 
        (is.rightBrace(char) ? Type.R_BRACE : Type.R_BRACKET);

      const t = token(type, grab(), char, [tokenStart, reader.loc], line, colStart);
      
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
      push(Type.STR, grab(1), grab());
      continue;
    }

    if (is.singlequote(char)) {
      while(is.word(peek()) && !reader.done()){
        next();
      }
      push(Type.STR, grab().slice(1), grab());
      continue;
    }

    if (is.colon(char)) {
      while(is.word(peek()) && !reader.done()) {
        next(); 
      }
      push(Type.KEY, grab(), grab());
      continue;
    }

    if (is.digit(char)) {
      while (is.number(peek()) && !reader.done()) {
        next();
      }
      push(Type.NUM, Number.parseFloat(grab()), grab());
      continue;
    }

    // Handles negative numbers where the '-' touches the next digit.
    // And decimals with a leading '.'
    if (is.dash(char) || is.dot(char)) {
      if (is.digit(peek())) {
        while (is.number(peek()) && !reader.done()) {
          next();
        }
        push(Type.NUM, Number.parseFloat(grab()), grab());
        continue;
      }
    }

    while (is.word(peek()) && !reader.done()) {
      next();
    }

    const t = { ..._identifier(grab()), range: [tokenStart, reader.loc], line, col };
    tokens.push(t);
  }

  tokens.push(token(Type.EOF, '', '', [reader.loc, reader.loc], line, col));
  return tokens;
}


/**
 * Some extra logic for parsing identifiers.
 */ 
function _identifier(str) {
  if (str.indexOf('.') === -1) {
    return {
      type: Type.IDENTIFIER,
      val: str,
      str: str,
    };
  }

  const reader = new Reader(str);

  let parts = [];
  let start = 0, loc = 0;
  while (!reader.done()) {
    loc = reader.loc;
    let char = reader.next();  
    if (is.dot(char)) {
      parts.push(reader.grab(start, loc));
      start = loc + 1;
    }
  }
  parts.push(reader.grab(start, loc + 1));

  return {
    type: Type.IDENTIFIER,
    val: parts[0],
    subpath: parts.slice(1),
    str: str,
  }
}