// @ts-check
/**
 * @file Readtime token info
 *  
 * @typedef {typeof TokenTypeEnum[keyof typeof TokenTypeEnum]} TokenType
 */

/**
 * Tokens we encounter during reading.
 */
export const TokenTypeEnum = {
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
  UNKNOWN: Symbol("UNKNOWN"),
};

const symbolToString = new Map(Object.entries(TokenTypeEnum).map(([k, v]) => [v, k]));

Object.freeze(TokenTypeEnum);


/**
 * Slop token namesspace.
 */ 
export class SlopToken {
  /**
   * @param {symbol} symbol
   * @return {string}
   */
  static getString(symbol) {
    // @ts-ignore
    return symbolToString.has(symbol) ?
      symbolToString.get(symbol) :
      symbolToString.get(TokenTypeEnum.UNKNOWN);
  }

  static enum = TokenTypeEnum;

  /**
   * Check if a symbol is a valid SlopType.
   * @param {symbol} symbol
   * @return {boolean}
   */
  static valid(symbol) {
    return symbolToString.has(symbol);
  }
}


/**
 * A single token.
 */ 
export class Token {
  /** @type {TokenType} */
  type = TokenTypeEnum.UNKNOWN;

  /** @type {any} */
  val;

  /** @type {string} */
  str = '';
  
  /** @type {[number, number]} */
  range = [0, 0];

  /** @type {number} */
  line = 0;

  /** @type {number} */
  col = 0;

  /** @type {number | undefined} */
  depth;

  /**
   * @param {TokenType} type
   * @param {any} val
   * @param {string} str
   * @param {[number, number]} range
   * @param {number} line
   * @param {number} col
   * @param {number} depth
   */
  constructor(type, val, str, range, line, col, depth) {
    this.type = type;
    this.val = val;
    this.str = str;
    this.range = range;
    this.line = line;    
    this.col = col;
    this.depth = depth;
  }
}