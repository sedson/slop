/**
 * Types enum to be shared by the reading, interpreting and highlighting 
 * process.
 */
export const Type = {
  L_PAREN: Symbol('L_PAREN'),
  R_PAREN: Symbol('R_PAREN'),
  L_BRACE: Symbol('L_BRACE'),
  R_BRACE: Symbol('R_BRACE'),
  L_BRACKET: Symbol('L_BRACKET'),
  R_BRACKET: Symbol('R_BRACKET'),
  COMMENT: Symbol('COMMENT'),
  EOF: Symbol('EOF'),
  
  NIL: Symbol('NIL'),
  NUM: Symbol('NUM'),
  STR: Symbol('STR'),
  KEY: Symbol('KEY'),
  IDENTIFIER: Symbol('IDENTIFIER'),
  LIST: Symbol('LIST'),
  DICT: Symbol('DICT'),
  VEC: Symbol('VEC'),
  FUNC: Symbol('FUNC'),
  UNKNOWN: Symbol('UNKNOWN'),
};

const _symbolToString = new Map(Object.entries(Type).map(([k, v]) => [v, k]));

Type.getString = function (symbol) {
  return _symbolToString.get(symbol);
}

Type.valid = function (symbol){
  return _symbolToString.has(symbol);
}

Object.freeze(Type);
