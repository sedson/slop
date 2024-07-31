import { Type } from "./types.mjs";
import { Reader } from "./parsing-utils.mjs";

function error(message, token) {
  const location = token ? ` [ line ${token.line}, col ${token.col} ]` : '';
  throw new Error(`parse – ${message + location}`);
}

/**
 * Match the current reader token with a desired type.
 * @param {Reader} reader
 * @param {Type} type
 */
function match(reader, type) {
  if (reader.done()) { error('unexpected EOF', reader.prev()); }
  if (reader.peek().type === type) {
    reader.next();
    return true;
  }
  return false;
}


/**
 * Parse an expression.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function expression(reader) {
  if (match(reader, Type.L_PAREN)) {
    if (match(reader, Type.R_PAREN)) {
      return { type: Type.literal, val: null };
    }
    return list(reader);
  }

  if (match(reader, Type.L_BRACE)) {
    if (match(reader, Type.R_BRACE)) {
      return { type: Type.DICT, val: {} };
    }
    return dict(reader);
  }

  return atom(reader);
}


/**
 * Parse a list.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function list(reader) {
  const start = reader.prev().range[0];
  const elements = [];

  while (!match(reader, Type.R_PAREN)) {
    let expr = expression(reader);
    if (expr) elements.push(expr);
  }

  const end = reader.prev().range[1];

  return {
    type: Type.LIST,
    elements,
    range: [start, end]
  };
}


/**
 * Parse an atom.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function atom(reader) {
  const token = reader.next();
  switch (token.type) {

  case Type.IDENTIFIER:
    return {
      type: Type.IDENTIFIER,
      val: token.val,
      subpath: token.subpath,
      range: token.range
    };

  case Type.KEY:
    return {
      type: Type.KEY,
      val: token.val,
      range: token.range,
    }

  case Type.NUM:
  case Type.STR:
    return {
      type: Type.LITERAL,
      val: token.val,
      range: token.range
    };

  case Type.COMMENT:
    return false;

  case Type.EOF:
    return false;

  default:
    const typeStr = Type.getString(token.type);
    error(`unexpected type: ${typeStr}, line: ${token.line}, col: ${token.col}`);
  }
}


/**
 * Parse an atom.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function dict(reader) {
  const data = {};
  let isKey = true;
  let key = null;
  while (!match(reader, Type.R_BRACE)) {
    if (isKey) {
      key = expression(reader);
    } else {
      data[key.val] = expression(reader);
    }
    isKey = !isKey;
  }

  return { type: Type.DICT, dict: data };
}


/**
 * Tokens -> abstract syntax tree.
 * @param {array<Token>} tokens.
 * @return {object} suntax tree.
 */
export function parse(tokens) {
  const expressions = [];
  const reader = new Reader(tokens);

  while (!reader.done()) {
    let exp = expression(reader);
    if (exp) expressions.push(exp);
  }
  return expressions;
}