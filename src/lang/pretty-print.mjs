import { SlopToken } from "./token.mjs";
import { SlopType } from "./types.mjs";

function isObj(any) {
  return typeof any === "object" &&
    !Array.isArray(any) &&
    any !== null &&
    !(any instanceof String);
}


export function prettyPrint(item) {
  if (item === undefined) {
    return "nil";
  }

  if (item === null) {
    return "uncaught null";
  }

  if (item._customFormat) return item._customFormat();

  if (SlopToken.valid(item)) {
    return SlopToken.getString(item);
  }

  if (SlopType.valid(item)) {
    return SlopType.getString(item);
  }

  if (SlopType.isNum(item) || SlopType.isBool(item)) {
    return item;
  }

  if (SlopType.isString(item)) {
    return `"${item}"`;
  }

  if (SlopType.isSymbol(item) || SlopType.isKey(item)) {
    return `${item}`;
  }

  if (SlopType.isDict(item)) {
    return `{ ${Object.entries(item)
      .map((x) => {
        return `${x[0]} : ${prettyPrint(x[1])}`;
      }).join(", ")} }`;
  }

  if (item instanceof Function) {
    if (SlopType.isMacro(item)) {
      return `<macro ${item.funcName || "anon"}>`;
    }
    return `<function ${item.funcName || "anon"}>`;
  }
 
  if (SlopType.isVec(item)) {
    return `[${item.map(prettyPrint).join(" ")}]`;
  }

  if (Array.isArray(item)) {
    return `(${item.map(prettyPrint).join(" ")})`;
  }

  return JSON.stringify(item);
}