/**
 * Built-in runtime data types.
 */
export const SlopType = {
  NIL: Symbol("NIL"),
  NUM: Symbol("NUM"),
  STR: Symbol("STR"),
  KEY: Symbol("KEY"),
  SYMBOL: Symbol("SYMBOL"),
  LIST: Symbol("LIST"),
  DICT: Symbol("DICT"),
  VEC: Symbol("VEC"),
  FUNC: Symbol("FUNC"),
  UNKNOWN: Symbol("UNKNOWN"),
};

const _symbolToString = new Map(
  Object.entries(SlopType).map(([k, v]) => [v, k])
);

SlopType.getString = function (symbol) {
  return _symbolToString.get(symbol);
};

SlopType.valid = function (symbol) {
  return _symbolToString.has(symbol);
};

Object.freeze(SlopType);

/**
 * Constructs homoiconic shared types from plain Js types.
 */
export const SlopVal = {
  nil() {
    return undefined;
  },

  bool(b) {
    if (typeof b !== "boolean") {
      throw new Error("Expected boolean to construct boolean");
    }
    return b;
  },

  symbol(s, subpath = undefined) {
    if (typeof s !== "string") {
      throw new Error("Expected string to construct symbol");
    }
    return new SlopSymbol(s, subpath);
  },

  string(s) {
    if (typeof s !== "string") {
      throw new Error("Expected string to construct string literal");
    }
    return new SlopString(s);
  },

  key(s) {
    if (typeof s !== "string") {
      throw new Error("Expected string to construct key");
    }
    return new SlopKey(s);
  },

  num(n) {
    if (typeof n !== "number") {
      throw new Error("Expected number to construct number");
    }
    return n;
  },

  list(xs) {
    if (!Array.isArray(xs)) {
      throw new Error("Expected array to construct list");
    }
    return xs;
  },

  vec(xs) {
    if (!Array.isArray(xs)) {
      throw new Error("Expected array to construct vector");
    }
    return SlopVec.from(xs);
  },


  dict(map) {
    if (map == null || map?.constructor !== Object) {
      throw new Error("Expexted plain JS object to construct dict");
    }
    return map;
  },

  fn(fn, name = undefined) {
    if (typeof fn !== "function") {
      throw new Error("Expected function to construct function");
    }
    if (name) {
      fn.funcName = name;
    }
    return fn;
  },
};

Object.freeze(SlopVal);

/**
 * SLOP bool APIs
 */
export const SlopBool = {
  isTrue(b) {
    return !!b;
  },

  isFalse(b) {
    return !SlopBool.isTrue(b);
  },
};

/**
 * SLOP list APIs
 */
export const SlopList = {
  first(l) {
    return l[0];
  },

  rest(l) {
    return l.slice(1);
  },

  take(l, n) {
    return l.slice(0, n);
  },

  decap(l) {
    const [first, ...rest] = l;
    return [first, rest];
  },

  split(l, n) {
    return [l.slice(0, n), l.slice(n)];
  },

  map(l, fn) {
    return l.map(fn);
  },

  forEach(l, fn) {
    l.forEach(fn);
  },

  *iter(l) {
    for (let i = 0; i < SlopList.len(l); i++) {
      yield SlopList.at(l, i);
    }
  },

  reduce(l, fn, init = SlopVal.nil()) {
    return l.reduce(fn, init);
  },

  at(l, i) {
    return l[i];
  },

  len(l) {
    return l.length;
  },
};

/**
 * SLOP dict APIs
 */
export const SlopDict = {
  get(dict, key) {
    return dict[key];
  },

  entries(dict) {
    return SlopVal.list(Object.entries(dict));
  },

  mapVals(dict, fn) {
    return SlopDict.mapEntries(dict, ([key, val]) => [key, fn(val)]);
  },

  mapEntries(dict, fn) {
    const newDict = {};
    for (let entry of Object.entries(dict)) {
      const [newKey, newVal] = fn(entry);
      newDict[newKey] = newVal;
    }
    return SlopVal.dict(newDict);
  },
};

/**
 * Slop function APIs
 */
export const SlopFn = {
  apply(fn, args) {
    return fn(...args);
  },
};

/**
 * Predicates for getting types of SLOP values
 */
export const SlopPred = {
  isNil: (val) => val === undefined,

  isBool: (val) => typeof val === "boolean",

  isSymbol: (val) => val?.constructor?.name === "SlopSymbol",

  isString: (val) => val?.constructor?.name === "SlopString",

  isKey: (val) => val?.constructor?.name === "SlopKey",

  isNum: (val) => typeof val === "number",

  isVec: (val) => val?.constructor?.name === 'SlopVec',

  isList: (val) => Array.isArray(val) && !SlopPred.isVec(val),

  isDict: (val) => val?.constructor === Object,

  isListLike: (val) => SlopPred.isVec(val) || SlopPred.isList(val),

  isFn: (val) => typeof val === "function",
};

export function isAtom(val) {
  return [
    SlopPred.isNil,
    SlopPred.isBool,
    SlopPred.isSymbol,
    SlopPred.isString,
    SlopPred.isKey,
    SlopPred.isNum,
  ].some((p) => p(val));
}

Object.freeze(SlopPred);

export function getType(val) {
  
}

export class SlopText extends String {}

class SlopSymbol extends SlopText {
  constructor(val, subpath = undefined) {
    super(val);
    this.subpath = subpath;
  }
}

class SlopString extends SlopText {
  constructor(val) {
    super(val);
  }
}

class SlopKey extends SlopText {
  constructor(val) {
    super(val);
  }
}

class SlopVec extends Array {}