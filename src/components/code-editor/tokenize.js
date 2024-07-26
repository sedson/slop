/**
 * @file Default 'syntax' tokenizer. Kinda does nothing.
 */

const is = {
  whitespace: (char) => char === ' ' || char === '\n' || char === '\t',
  linebreak: (char) => char === '\n',
  word: (char) => !is.whitespace(char),
};


/**
 * Entity types.
 */
export const types = {
  identifier: 'identifier',
  eof: 'eof',
};

/**
 * String reading helper.
 */
class StringReader {
  constructor(str) {
    this.str = str;
    this.loc = 0;
  }
  peek() { return this.str[this.loc]; }
  next() { return this.str[this.loc++]; }
  grab(start, end) { return this.str.slice(start, end); }
  done() { return this.loc >= this.str.length; }
}


/**
 * Split the code source string into tokens.
 * @param {string} input The source.
 * @param {array<Token>} An array of tokens.
 */
export function tokenize(input) {
  let reader = new StringReader(input);
  let tokens = [];

  let tokenStart = 0;
  let line = 0;

  const peek = () => reader.peek();
  const next = () => {
    return reader.next();
  };
  const grab = () => reader.grab(tokenStart, reader.loc);

  const token = (type, val, str, range, line, col) => {
    return { type, val, str, range, line, col };
  };

  while (!reader.done()) {
    tokenStart = reader.loc;
    const char = next();

    if (is.whitespace(char)) {
      if (is.linebreak(char)) {
        line += 1;
      }
      continue;
    }

    while (is.word(peek()) && !reader.done()) {
      next();
    }
    const t = { type: 'identifier', val: grab(), range: [tokenStart, reader.loc], line };
    tokens.push(t);
  }

  tokens.push(token(types.eof, '', '', [reader.loc, reader.loc]));
  console.log(tokens)
  return tokens;
}