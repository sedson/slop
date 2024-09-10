import { TokenType } from "./token.mjs";
import { SlopType } from "./types.mjs";
import { Reader } from "./parsing-utils.mjs";


// Define our parse time macros.
// TODO : define these somewhere more shared?
const quote = SlopType.symbol("quote");
const quasi = SlopType.symbol("quasi");
const unquote = SlopType.symbol("unquote");
const splice = SlopType.symbol("splice");
const spliceUnquote = SlopType.symbol("splice-unquote");
const quoteUnquote = SlopType.symbol("quote-unquote");

export const ParseMacros = {
  "\'": (form) => {
    return SlopType.list([quote, form]);
  },
  "~": (form) => {
    return SlopType.list([quasi, form]);
  },
   ",@": (form) => {
    return SlopType.list([spliceUnquote, form]);
  },
  ",": (form) => {
    return SlopType.list([unquote, form]);
  },
  "@" : (form) => {
    return SlopType.list([splice, form]);
  },
  "\'," : (form) => {
    return SlopType.list([quote, SlopType.list([unquote, form])]);
  }
}


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
      return SlopType.nil();
    }
    return list(reader, TokenType.R_PAREN);
  }

  // TODO: remove me once we've implemented square brackets as a reader macro.
  // For now, it's just the same as round parens.
  if (match(reader, TokenType.L_BRACKET)) {
    if (match(reader, TokenType.R_BRACKET)) {
      return SlopType.vec([]);
    }
    return list(reader, TokenType.R_BRACKET, true);
  }

  if (match(reader, TokenType.L_BRACE)) {
    if (match(reader, TokenType.R_BRACE)) {
      return SlopType.dict({});
    }
    return dict(reader);
  }

  if (match(reader, TokenType.SPECIAL)) {
    if (ParseMacros[reader.prev().val]) {
      return ParseMacros[reader.prev().val](expression(reader));
    }
  }

  return atom(reader);
}

/**
 * Parse a list.
 * @param {Reader} reader
 * @return {ExpressionNode}
 */
function list(reader, closeToken, asVec = false) {
  const elements = [];

  while (!match(reader, closeToken)) {
    let expr = expression(reader);
    if (expr !== null) {
      elements.push(expr);  
    }
  }

  return asVec ? SlopType.vec(elements) : SlopType.list(elements);
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
    return SlopType.symbol(token.val, token.subpath);

  case TokenType.KEY:
    return SlopType.key(token.val);

  case TokenType.NUM:
    return SlopType.num(token.val);

  case TokenType.STR:
    return SlopType.string(token.val);

  // Because, undefined is nil in slop world, use the value null to signal 
  // dropping as expression from the eval tree.
  case TokenType.COMMENT:
  case TokenType.EOF:
    return null;

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
      data[key] = expression(reader);
    }
    isKey = !isKey;
  }

  return SlopType.dict(data);
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
    if (exp !== null) {
      expressions.push(exp);
    }
  }
  return expressions;
}