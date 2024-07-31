import { Type } from './types.mjs';

export function prettyPrint(item) {
  if (item === undefined) 
    return 'nil';
  
  if (item === null) 
    return 'null';

  if (typeof item === 'number')
    return item;

  if (item.type !== undefined) {
    if (item.type === Type.LIST) {
      return `${Type.getString(Type.LIST)} – ${prettyPrint(item.elements)}`;
    }

    if (item.type === Type.DICT) {
      return `${Type.getString(Type.LIST)} – ${prettyPrint(item.dict)}`;
    }

    return `${Type.getString(item.type)} – ${item.val}`;
  }
  
  if (item instanceof Function)
    return `{ Function : ${item.funcName || 'anon'} }`;

  if (Array.isArray(item))
    return `[ ${item.map(prettyPrint).join(', ')} ]`;

  if (typeof item === "string")
    return `${item}`;

  if (item._customFormat)
    return item._customFormat()

  return JSON.stringify(item);
}