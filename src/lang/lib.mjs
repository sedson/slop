/**
 * @file Provide basic library functions for the tiny lisp.
 */ 

export const utils = {
  'join': (...args) => args.join(''),
  'print': (...args) => console.log(...args),
  'len': (...args) => {
    if (args.length === 1) {
      return args[0].length !== undefined ? args[0].length : 0;
    }
    return args.length;
  },
  '_': (...args) => args[args.length - 1] || null,
  'ls': (...args) => args,
  'call': (fn, ...args) => fn(...args),
};


export const math = {
  '*': (...args) => args.reduce((a, b) => a * b, 1),
  '+': (...args) => args.reduce((a, b) => a + b, 0),
  '-': (...args) => (args.length === 1) ? -args[0] : args.slice(1).reduce((a, b) => a - b, args[0]),
  '/': (...args) => args.slice(1).reduce((a, b) => a / b, args[0]),
  'max': (...args) => Math.max(...args),
  'min': (...args) => Math.min(...args),
  'clamp': (a, mn = 0, mx = 1) => Math.min(Math.max(a, mn), mx),
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
  'rand': () => Math.random(),
  'hex': (a) => (a & 0xff).toString(16),
  '<<': (a, b) => a << b,
  '>>': (a, b) => a >> b,
  '&': (a, b) => a & b,
  '|': (a, b) => a | b,
  '**': (a, b) => a ** b,
}

export const lists = {
  '..': (a, b) => {
    let list = [];
    for (let i = a; i < b; i++) {
      list.push(i);
    }
    return list;
  },

  'map': (ls, fn) => ls.map(x => fn(x)),
  'for-each': (ls, fn) => ls.forEach(x => fn(x)),
  'filter': (ls, fn) => ls.filter(x => fn(x)),
  'list-join': (ls, delim = " ") => ls.join(delim),
  'push': (ls, val) => {
    ls.push(val);
    return val;
  },
  'first': (ls) => ls[0] ?? null,
  'rest': (ls) => ls.slice(1),
  'nth': (ls, n) => ls[(n ?? ls.length - 1)],
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
  }
}