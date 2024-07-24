export function format(item) {
  if (item === null) {
    return 'NULL';

  } else if (item === undefined) {
    return 'undefined'

  } else if (item instanceof Function) {
    return `{ Function : ${item.funcName || 'anon'} }`;

  } else if (Array.isArray(item)) {
    return `[ ${item.map(format).join(', ')} ]`;

  } else if (typeof item === "string") {
    return `"${item}"`;

  } else if (item._customFormat) {
    return item._customFormat()

  } else {
    return JSON.stringify(item);
  }
}