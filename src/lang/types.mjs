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
  UNKNOWN: Symbol("UNKNOWN"),
});

const sybmolToString = new Map(Object.entries(SlopTypeEnum).map(([k, v]) => [v, k]));

const atomicTypes = [
  SlopTypeEnum.NIL,
  SlopTypeEnum.NUM,
  SlopTypeEnum.STR,
  SlopTypeEnum.KEY,
  SlopTypeEnum.SYMBOL,
  SlopTypeEnum.BOOL,
];


function error(message) {
  throw new Error(`type error - ${message}`);
}

// Classes to use for type checking otherwise indistinguishable types from JS's 
// perspective.
export class SlopText extends String {}
export class SlopSymbol extends SlopText {}
export class SlopString extends SlopText {}
export class SlopKey extends SlopText {}
export class SlopVec extends Array {}


/**
 * SlopType name space has methods for 
 */ 
export class SlopType {
  /**
   * Get the string label for a SlopType.
   * @param {Symbol} symbol A JS symbol.
   * @return {string} Human readable string name of type.
   */
  static getString(symbol) {
    return sybmolToString.has(symbol) ?
      sybmolToString.get(symbol) :
      sybmolToString.get(SlopType.UNKNOWN);
  }

  static enum = SlopTypeEnum;

  /**
   * Check if a symbol is a valid SlopType.
   * @param {Symbol}
   * @return {boolean}
   */
  static valid(symbol) {
    return sybmolToString.has(symbol);
  }

  /**
   * Get the Slop Type of Some value.
   * @param {any} val
   * @return {SlopType}
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

  static isNil(val) {
    return val === undefined;
  }

  static isBool(val) {
    return typeof val === "boolean";
  }

  static isFalse(val) {
    return val === false;
  }

  static isSymbol(val) {
    return val?.constructor === SlopSymbol;
  }

  static isString(val) {
    return (
      val?.constructor === SlopString ||
      (typeof val === "string" && 
        !(SlopType.isKey(val) || SlopType.isSymbol(val)))
    );
  }

  static isKey(val) {
    return val?.constructor === SlopKey;
  }

  static isNum(val) {
    return typeof val === "number";
  }

  static isVec(val) {
    return val?.constructor === SlopVec;
  }

  static isList(val) {
    return Array.isArray(val) && !SlopType.isVec(val);
  }

  static isDict(val) {
    return val?.constructor === Object;
  }

  static isListLike(val) {
    return SlopType.isVec(val) || SlopType.isList(val);
  }

  static isFn(val) {
    return typeof val ==="function";
  }

  static isAtom (val) {
    return atomicTypes.includes(SlopType.getType(val));
  }

  static isTruthy (val) {
    return (!(SlopType.isNil(val) || SlopType.isFalse(val)));
  }

  static nil() {
    return undefined;
  }

  static bool(b) {
    if (typeof b !== "boolean") {
      error("expected boolean to construct boolean");
    }
    return b;
  }

  static symbol(s) {
    if (typeof s !== "string") {
      error("expected string to construct symbol");
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

  static list(xs) {
    if (!Array.isArray(xs)) {
      error("expected array to construct list");
    }
    return xs;
  }

  static vec(xs) {
    if (!Array.isArray(xs)) {
      error("expected array to construct vector");
    }
    return SlopVec.from(xs);
  }

  static dict(map) {
    if (map == null || map?.constructor !== Object) {
      error("expected plain JS object to construct dict");
    }
    return map;
  }

  static fn(fn, name = undefined) {
    if (typeof fn !== "function") {
      error("Expected function to construct function");
    }
    if (name) {
      fn.funcName = name;
    }
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
    return l.map(fn);
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
