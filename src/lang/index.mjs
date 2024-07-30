export { Type } from './types.mjs';
export {
  keywords,
  Context,
  run,
  tokenize,
  parse,
  interpret
} from './tiny-lisp.mjs';

import { lists, utils, math } from './lib.mjs';

export const lib = { ...lists, ...utils, ...math };