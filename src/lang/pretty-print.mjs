import { TokenType } from "./token.mjs";
import { SlopText } from "./types.mjs";

function isObj(any) {
  return typeof any === "object" && 
    !Array.isArray(any) && 
    any !== null && 
    !(any instanceof String);
}

export function prettyPrint(item) {
  if (item === undefined) return "nil";

  if (item === null) {
    return "null";
  }

  if (typeof item === "number") {
    return item;
  }

  if (TokenType.valid(item)) {
    return TokenType.getString(item);
  }

  if (item.type !== undefined) {
    if (item.type === TokenType.LIST) {
      return `${TokenType.getString(TokenType.LIST)} – ${prettyPrint(
        item.elements
      )}`;
    }

    if (item.type === TokenType.VEC) {
      return `${TokenType.getString(TokenType.VEC)} – ${prettyPrint(
        item.elements
      )}`;
    }

    if (item.type === TokenType.DICT) {
      return `${TokenType.getString(TokenType.DICT)} – ${prettyPrint(
        item.dict
      )}`;
    }

    return `${TokenType.getString(item.type)} – ${item.val}`;
  }

  if (item instanceof SlopText) {
    return `"${item}"`;
  }

  if (isObj(item)) {
    return `{ ${Object.entries(item)
      .map((x) => {
        return `${x[0]} : ${prettyPrint(x[1])}`;
      })
      .join(", ")} }`;
  }

  if (item instanceof Function)
    return `{ Function : ${item.funcName || "anon"} }`;

  if (Array.isArray(item)) return `[ ${item.map(prettyPrint).join(", ")} ]`;




  if (typeof item === "string") return `"${item}"`;

  if (item._customFormat) return item._customFormat();

  return JSON.stringify(item);
}
