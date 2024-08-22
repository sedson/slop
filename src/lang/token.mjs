/**
 * Tokens we encounter during reading.
 */
export const TokenType = {
  L_PAREN: Symbol("L_PAREN"),
  R_PAREN: Symbol("R_PAREN"),
  L_BRACE: Symbol("L_BRACE"),
  R_BRACE: Symbol("R_BRACE"),
  L_BRACKET: Symbol("L_BRACKET"),
  R_BRACKET: Symbol("R_BRACKET"),
  COMMENT: Symbol("COMMENT"),
  NUM: Symbol("NUM"),
  STR: Symbol("STR"),
  KEY: Symbol("KEY"),
  SYMBOL: Symbol("SYMBOL"),
  SPECIAL: Symbol("SPECIAL"),
  EOF: Symbol("EOF"),
};

const _symbolToString = new Map(
  Object.entries(TokenType).map(([k, v]) => [v, k])
);

TokenType.getString = function (symbol) {
  return _symbolToString.get(symbol);
};

TokenType.valid = function (symbol) {
  return _symbolToString.has(symbol);
};

Object.freeze(TokenType);

export class Token {
  constructor(type, val, str, range, line, col) {
    this.type = type;
    this.val = val;
    this.str = str;
    this.range = range;
    this.line = line;
    this.col = col;
  }
}

/**
 * Token constructor
 */
export const token = (...args) => new Token(...args);
