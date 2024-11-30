// @ts-check

/**
 * Runtime data types. Use JS Symbols for (ostensibly) faster comparison than 
 * strings and more clear semantics than numbers.
 */
export const SlopTypeEnum = Object.freeze({
  NIL: Symbol("NIL"),
  NUM: Symbol("NUM"),
  STR: Symbol("STR"),
  KEY: Symbol("KEY"),
  SYMBOL: Symbol("SYMBOL"),
  BOOL: Symbol("BOOL"),
  LIST: Symbol("LIST"),
  VEC: Symbol("VEC"),
  DICT: Symbol("DICT"),
  FUNC: Symbol("FUNC"),
  MACRO: Symbol("MACRO"),
  UNKNOWN: Symbol("UNKNOWN"),
});

const symbolToString = new Map(Object.entries(SlopTypeEnum).map(([k, v]) => [v, k]));

const atomicTypes = [
  SlopTypeEnum.NIL,
  SlopTypeEnum.NUM,
  SlopTypeEnum.STR,
  SlopTypeEnum.KEY,
  SlopTypeEnum.SYMBOL,
  SlopTypeEnum.BOOL,
];

/**
 * @param {string} message
 */
function error(message) {
  throw new Error(`type error - ${message}`);
}


export class SlopText extends String {}
export class SlopSymbol extends SlopText {}
export class SlopString extends SlopText {}
export class SlopKey extends SlopText {}
export class SlopVec extends Array {}
export class SlopSplice extends Array {}


/**
 * SlopType name space has methods for managing types.
 */
export class SlopType {
  /**
   * Get the string label for a SlopType.
   * @param {symbol} symbol A JS symbol.
   * @return {string} Human readable string name of type.
   */
  static getString(symbol) {
    //@ts-ignore
    return symbolToString.has(symbol) ?
      symbolToString.get(symbol) :
      symbolToString.get(SlopTypeEnum.UNKNOWN);
  }

  static enum = SlopTypeEnum;

  /**
   * Check if a symbol is a valid SlopType.
   * @param {symbol} symbol
   * @return {boolean}
   */
  static valid(symbol) {
    return symbolToString.has(symbol);
  }

  /**
   * Get the Slop Type of Some value.
   * @param {any} val
   * @return {symbol}
   */
  static getType(val) {
    if (SlopType.isNil(val)) return SlopTypeEnum.NIL;
    if (SlopType.isNum(val)) return SlopTypeEnum.NUM;
    if (SlopType.isString(val)) return SlopTypeEnum.STR;
    if (SlopType.isKey(val)) return SlopTypeEnum.KEY;
    if (SlopType.isSymbol(val)) return SlopTypeEnum.SYMBOL;
    if (SlopType.isBool(val)) return SlopTypeEnum.BOOL;
    if (SlopType.isList(val)) return SlopTypeEnum.LIST;
    if (SlopType.isVec(val)) return SlopTypeEnum.VEC;
    if (SlopType.isDict(val)) return SlopTypeEnum.DICT;
    if (SlopType.isFn(val)) return SlopTypeEnum.FUNC;
    return SlopTypeEnum.UNKNOWN;
  }

  /**
   * @param {undefined} val
   */
  static isNil(val) {
    return val === undefined;
  }

  /**
   * @param {any} val
   */
  static isBool(val) {
    return typeof val === "boolean";
  }

  /**
   * @param {any} val
   */
  static isFalse(val) {
    return val === false;
  }

  /**
   * @param {any} val
   */
  static isSymbol(val) {
    return val?.constructor === SlopSymbol;
  }

  /**
   * @param {any} val
   */
  static isString(val) {
    return (
      val?.constructor === SlopString ||
      (typeof val === "string" &&
        !(SlopType.isKey(val) || SlopType.isSymbol(val)))
    );
  }

  /**
   * @param {string} val
   */
  static isKey(val) {
    return val?.constructor === SlopKey;
  }

  /**
   * @param {any} val
   */
  static isNum(val) {
    return typeof val === "number";
  }

  /**
   * @param {any[]} val
   */
  static isVec(val) {
    return val?.constructor === SlopVec;
  }

  /**
   * @param {any[]} val
   */
  static isList(val) {
    return Array.isArray(val) && !SlopType.isVec(val);
  }

  /**
   * @param {{ constructor: ObjectConstructor; }} val
   */
  static isDict(val) {
    return val?.constructor === Object;
  }

  /**
   * @param {any[]} val
   */
  static isListLike(val) {
    return SlopType.isVec(val) || SlopType.isList(val);
  }

  /**
   * @param {any} val
   */
  static isFn(val) {
    return typeof val === "function" && !val.isMacro;
  }

  /**
   * @param {any} val
   */
  static isMacro(val) {
    return typeof val === "function" && val.isMacro;
  }

  /**
   * @param {any} val
   */
  static isAtom(val) {
    return atomicTypes.includes(SlopType.getType(val));
  }

  /**
   * @param {any} val
   */
  static isTruthy(val) {
    return (!(SlopType.isNil(val) || SlopType.isFalse(val)));
  }

  static nil() {
    return undefined;
  }

  /**
   * @param {any} b
   */
  static bool(b) {
    if (typeof b !== "boolean") {
      error("expected boolean to construct boolean");
    }
    return b;
  }

  static symbol(s) {
    if (typeof s !== 'string') {
      error("expected string to construct symbol " + s);
    }
    return new SlopSymbol(s);
  }

  static string(s) {
    if (typeof s !== "string") {
      error("expected string to construct string literal");
    }
    return new SlopString(s);
  }

  static key(s) {
    if (typeof s !== "string") {
      error("expected string to construct key");
    }
    return new SlopKey(s);
  }

  static num(n) {
    if (typeof n !== "number") {
      error("expected number to construct number");
    }
    return n;
  }

  /**
   * @param {any[]} xs
   */
  static list(xs) {
    if (!Array.isArray(xs)) {
      error("expected array to construct list");
    }
    return SlopList.flatten(xs);
  }

  /**
   * @param {any[]} xs
   */
  static vec(xs) {
    if (!Array.isArray(xs)) {
      error("expected array to construct vector");
    }
    return SlopVec.from(SlopList.flatten(xs));
  }

  static splice(xs) {
    if (!Array.isArray(xs)) {
      error("expected array to construct splice");
    }
    return SlopSplice.from(SlopList.flatten(xs));
  }

  /**
   * @param {any} map
   */
  static dict(map) {
    if (map == null || map?.constructor !== Object) {
      error("expected plain JS object to construct dict");
    }
    return map;
  }

  /**
   * @param {Function} fn
   * @param {string|undefined} name
   */
  static fn(fn, name = undefined) {
    if (typeof fn !== "function") {
      error("expected function to construct function");
    }
    if (name) {
      fn.funcName = name;
    }
    return fn;
  }

  /**
   * @param {Function} fn
   * @param {string|undefined} name
   */
  static macro(fn, name = undefined) {
    if (typeof fn !== "function") {
      error("expected function to construct macro");
    }
    if (name) {
      fn.funcName = name;
    }
    fn.isMacro = true;
    return fn;
  }
}

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
    if (l instanceof SlopVec) {
      return SlopType.vec(l.map(fn));
    }
    return SlopType.list(l.map(fn));
  },

  forEach(l, fn) {
    l.forEach(fn);
  },

  * iter(l) {
    for (let i = 0; i < SlopList.len(l); i++) {
      yield SlopList.at(l, i);
    }
  },

  reduce(l, fn, init = SlopType.nil()) {
    return l.reduce(fn, init);
  },

  at(l, i) {
    return l[i];
  },

  len(l) {
    return l.length;
  },

  flatten(l) {
    const m = [];
    for (let e of l) {
      e instanceof SlopSplice ? m.push(...e) : m.push(e);
    }
    return m;
  }
};

/**
 * SLOP dict APIs
 */
export const SlopDict = {
  get(dict, key) {
    return dict[key];
  },

  entries(dict) {
    return SlopType.list(Object.entries(dict));
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
    return SlopType.dict(newDict);
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
