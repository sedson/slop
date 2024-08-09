import { TokenType } from "./token.mjs";
import { SlopVal } from "./types.mjs";
import { Reader } from "./parsing-utils.mjs";

function error(message, token) {
  const location = token ? ` [ line ${token.line}, col ${token.col} ]` : "";
  throw new Error(`parse - ${message + location}`);
}

/**
 * Match the current reader token with a desired type.
 * @param {Reader} reader
 * @param {TokenType} type
 */
function match(reader, type) {
  if (reader.done()) {
    error("unexpected EOF", reader.prev());
  }
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
  if (match(reader, TokenType.L_PAREN)) {
    if (match(reader, TokenType.R_PAREN)) {
      return SlopVal.nil();
    }
    return list(reader, TokenType.R_PAREN);
  }

  // TODO: remove me once we've implemented square brackets as a reader macro.
  // For now, it's just the same as round parens.
  if (match(reader, TokenType.L_BRACKET)) {
    if (match(reader, TokenType.R_BRACKET)) {
      return SlopVal.nil();
    }
    return list(reader, TokenType.R_BRACKET);
  }

  if (match(reader, TokenType.L_BRACE)) {
    if (match(reader, TokenType.R_BRACE)) {
      return SlopVal.dict({});
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
function list(reader, closeToken) {
  const elements = [];

  while (!match(reader, closeToken)) {
    let expr = expression(reader);
    if (expr != null) elements.push(expr);
  }

  return SlopVal.list(elements);
}

/**
 * Parse an atom.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function atom(reader) {
  const token = reader.next();
  switch (token.type) {
    case TokenType.SYMBOL:
      return SlopVal.symbol(token.val, token.subpath);

    case TokenType.KEY:
      return SlopVal.key(token.val);

    case TokenType.NUM:
      return SlopVal.num(token.val);

    case TokenType.STR:
      return SlopVal.string(token.val);

    case TokenType.COMMENT:
      return false;

    case TokenType.EOF:
      return false;

    default:
      const typeStr = TokenType.getString(token.type);
      error(
        `unexpected type: ${typeStr}, line: ${token.line}, col: ${token.col}`
      );
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
  while (!match(reader, TokenType.R_BRACE)) {
    if (isKey) {
      key = expression(reader);
    } else {
      data[key.val] = expression(reader);
    }
    isKey = !isKey;
  }

  return SlopVal.dict({});
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
