/**
 * @file Provide basic library functions for the tiny lisp.
 */ 

const A = 16807;
const MOD = (2 ** 32) - 1;

function PRNG (seed) {
  let _seed = Math.abs(seed % MOD);
  return () => {
    _seed = (A *_seed) % MOD;
    return (_seed - 1) / MOD;
  }
} 

export const prng = {
  _prng: PRNG(1),
  'seed': (num) => prng._prng = PRNG(num),
  'rand': () => prng._prng(),
};


export const utils = {
  'join': (...args) => { 
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0].join('');
    }
    return args.join('');
  },
  'join-c': (c ,...args) => {
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0].join(c);
    }
    return args.join(c);
  },
  'print': (...args) => console.log(...args),
  'len': (...args) => {
    if (args.length === 1) {
      return args[0].length !== undefined ? args[0].length : 0;
    }
    return args.length;
  },
  '_': (...args) => args[args.length - 1] || null,
  'ls': (...args) => args,
  'call': (fn, args) => {
    return fn(...args);
  },
  'key': (a) => ':' + a,
  'console/log': (...args) => console.log(...args),
};


export const math = {
  '*': (...args) => args.reduce((a, b) => a * b, 1),
  '+': (...args) => {
    // console.log('+', args, args.reduce((a, b) => a + b, 0));
    return args.reduce((a, b) => a + b, 0);
  },
  '-': (...args) => (args.length === 1) ? -args[0] : args.slice(1).reduce((a, b) => a - b, args[0]),
  '/': (...args) => args.slice(1).reduce((a, b) => a / b, args[0]),
  'max': (...args) => Math.max(...args),
  'min': (...args) => Math.min(...args),
  'clamp': (a, mn = 0, mx = 1) => Math.min(Math.max(a, mn), mx),
  'abs': (a) => Math.abs(a),
  'sin': (a) => Math.sin(a),
  'cos': (a) => Math.cos(a),
  'sqrt': (a) => Math.sqrt(a),
  'floor': (a) => Math.floor(a),
  'round': (a) => Math.round(a),
  'ciel': (a) => Math.ciel(a),
  '%': (a, b) => a % b,
  '=': (a, b) => a === b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>=': (a, b) => a >= b,
  'hex': (a) => (a & 0xff).toString(16),
  '<<': (a, b) => a << b,
  '>>': (a, b) => a >> b,
  '&': (a, b) => a & b,
  '|': (a, b) => a | b,
  '**': (a, b) => a ** b,
  'and': (...args) => {
    for (let a of args) {
      if (!a) return false;
    }
    return true;
  },
  'or': (...args) => {
    for (let a of args) {
      if (a) return true;
    }
    return false;
  }
}

export const lists = {
  'range': (a, b) => {
    let list = [];
    for (let i = a; i < b; i++) {
      list.push(i);
    }0
    return list;
  },
  'map': (ls, fn) => ls.map(x => fn(x)),
  'for-each': (ls, fn) => ls.forEach(x => fn(x)),
  'filter': (ls, fn) => ls.filter(x => fn(x)),
  'list-join': (ls, delim = " ") => ls.join(delim),
  'fold': (ls, fn, init) => ls.reduce(fn, init),
  'fold-self': (ls, fn) => ls.slice(1).reduce(fn, ls[0]),
  'push': (ls, val) => {
    ls.push(val);
    return val;
  },
  'sum': (ls) => ls.reduce((a, b) => a + b, 0), 
  'first': (ls) => ls[0] ?? null,
  'last': (ls) => ls[ls.length - 1] ?? null,
  'rest': (ls) => ls.slice(1),
  'nth': (ls, n) => {
    if (n < 0) {
      return ls[Math.max(ls.length + n, 0)];
    }
    return ls[(n ?? ls.length - 1)];
  },
  'has': (ls, member) => ls.indexOf(member) > -1,
  'fill-with': (len, val) => new Array(len).fill(val),
  
  '->' : (data, ...functions) => {
    let d = data;
    for (let f of functions) {
      if (Array.isArray(d)) {
        d = d.map(f);
      } else {
        d = f(d);
      }
    }
    return d;
  },

  'keys': (obj) => Object.keys(obj),
  'values': (obj) => Object.values(obj),
  'entries': (obj) => Object.entries(obj),
  'get': (obj, key) => (obj[key]),
  'dset': (obj, key, val) => {
    obj[key] = val;
    return val;
  },
  'put': (obj, key, val) => {
    console.log("PUT", key, val);
    obj[key] = val;
    return val;
  },

  'zip-dict': (keys, vals, def = 0) => {
    return Object.fromEntries(keys.map((x, i) => {
      return [x, vals[i] ?? 0];
    }));
  }
}