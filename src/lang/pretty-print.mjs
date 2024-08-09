import { Type } from './types.mjs';

function isObj (any) {
  return (typeof any === 'object') && !Array.isArray(any) && any !== null; 
}

export function prettyPrint(item) {
  if (item === undefined){
    return 'nil';
  }
  
  if (item === null){
    return 'null';
  }

  if (typeof item === 'number'){
    return item;
  }


  if (Type.valid(item)){
    return Type.getString(item);
  }

  if (item.type !== undefined) {
    if (item.type === Type.LIST) {
      return `${Type.getString(Type.LIST)} – ${prettyPrint(item.elements)}`;
    }

    if (item.type === Type.VEC) {
      return `${Type.getString(Type.VEC)} – ${prettyPrint(item.elements)}`;
    }

    if (item.type === Type.DICT) {
      return `${Type.getString(Type.DICT)} – ${prettyPrint(item.dict)}`;
    }

    return `${Type.getString(item.type)} – ${item.val}`;
  }

  if (isObj(item)) {
    return `{ ${Object.entries(item).map(x => {
      return `${x[0]} : ${prettyPrint(x[1])}`
    }).join(', ')} }`;
  }
  
  if (item instanceof Function)
    return `{ Function : ${item.funcName || 'anon'} }`;

  if (Array.isArray(item))
    return `[ ${item.map(prettyPrint).join(', ')} ]`;

  if (typeof item === "string")
    return `"${item}"`;

  if (item._customFormat)
    return item._customFormat()

  return JSON.stringify(item);
}