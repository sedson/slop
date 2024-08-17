/**
 * @file Helpers for string parsing.
 */ 

/**
 * String or array reader.
 */ 
export class Reader {
  /** 
   * @param {string|array} data 
   */ 
  constructor(data) {
    this.data = data;
    this.loc = 0;
  }
   
  peek() { return this.data[this.loc]; }
  next() { return this.data[this.loc++]; }
  done() { return this.loc >= this.data.length; }
  prev() { return this.data[Math.max(this.loc - 1, 0)]; }

  /** 
   * @param {number} start
   * @param {number} end 
   */
  grab(start, end) { return this.data.slice(start, end); }
}


export const is = {
  leftParen: (char) => char === '(',
  rightParen: (char) => char === ')',
  leftBrace: (char) => char === '{',
  rightBrace: (char) => char === '}',
  leftBracket: (char) => char === '[',
  rightBracket: (char) => char === ']',
  leftDelim: (char) => is.leftParen(char) || is.leftBrace(char) || is.leftBracket(char),
  rightDelim: (char) => is.rightParen(char) || is.rightBrace(char) || is.rightBracket(char),
  digit: (char) => char >= '0' && char <= '9',
  whitespace: (char) => char === ' ' || char === '\n' || char === '\t',
  linebreak: (char) => char === '\n',
  hash: (char) => char === '#',
  semicolon: (char) => char === ';',
  colon: (char) => char === ':',
  comma: (char) => char === ',',
  dot: (char) => char === '.',
  number: (char) => is.digit(char) || is.dot(char),
  quote: (char) => char === `"`,
  singlequote: (char) => char === `'`,
  underscore: (char) => char === '_',
  dollar: (char) => char === '$',
  at: (char) => char === '@',
  tilde: (char) => char === '~',
  colon: (char) => char === ':',
  dash: (char) => char === '-',
  letter: (char) => (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z'),
  word: (char) => !is.whitespace(char) &&
    !is.leftDelim(char) &&
    !is.rightDelim(char),
};