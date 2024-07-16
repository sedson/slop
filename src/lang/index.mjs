export {
  types,
  keywords,
  Context,
  run,
  tokenize,
  parse,
  ast,
  interpret
}
from './tiny-lisp.mjs';

import { lists, utils, math } from './lib.mjs';
export const lib = { ...lists, ...utils, ...math };