/**
 * @file The context/env functionality for lisp programs to run in.
 */

function error(message) {
  throw new Error(`context – ${message}`);
}

export class Context {
  /**
   * Create a context.
   * @param {object} scope
   */
  constructor(scope = {}, params = [], args = []) {
    this.env = Object.setPrototypeOf({}, scope);
    this._constants = new Set();
    for (let i = 0; i < params.length; i++) {
      this.env[params[i].val] = args[i];
    }
  }


  /**
   * Get the value of id in the context.
   * @param {string} id The identifier to get.
   * @param {string[]} subpath Nested subpath.
   * @return {any}
   */ 
  get(id, subpath = undefined) {
    if (!(id in this.env)) {
      error('no value found for key: ' + id);
      return;
    }

    if (!subpath || subpath.length === 0) {
      return this.env[id];
    }

    let [nestedVal, parent] = nested(this.env[id], subpath);

    if (nestedVal === undefined) {
      error('subpath error for id: ' + id + ' and path: ' + subpath.join('.'));
    }

    if (nestedVal instanceof Function) {
      return nestedVal.bind(parent)
    }
    return nestedVal;
  }


  set(id, val, constant = false) {
    if (this._constants.has(id)) {
      error(`attempt to set constant label: ${id}`);
    }
    

    this.env[id] = val;
    return val;
  }
}


/**
 * Search for a nested path in the object outer.
 * @param {object} outer The context to search in.
 * @param {string[]} path The array of strings to search with.
 * @return {[any, object]} A tuple where the first element is the asked for
 *     value or undefined. The second element is the direct parent which is 
 *     helpful for binding 'this' if the value is a function.
 */
function nested(outer, path) {
  let parent = outer;
  for (let i = 0; i < path.length - 1; i++) {
    const target = path[i];
    if (parent && parent[target] !== undefined) {
      parent = parent[target];
    }
  }
  return [parent[path[path.length - 1]], parent];
}