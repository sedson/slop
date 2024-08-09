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
      if (params[i].val === '&' && params.length === i + 2) {
        this.env[params[i + 1].val] = args.slice(i);
        return;
      }
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

  /**
   * Set the value of id in the context.
   * @param {string} id The identifier to set.
   * @param {any} val The value to set.
   * @param {boolean} Whether to treat the identifier as a variable or 
   *     constant binding.
   * @param {string[]} subpath Nested subpath.
   * @return {any} The value that was set.
   */ 
  set(id, val, constant = false, subpath = undefined) {
    if (this._constants.has(id)) {
      if (!constant) {
        error(`attempted set to constant binding: ${id}`);
      } else {
        delete this.env[id];
      }
    }
    
    if (constant) {
      this._constants.add(id);
    }

    if (!subpath || subpath.length === 0) {
       this.env[id] = val;
       return val;
    }

    if (!(id in this.env)) {
      error('nested set - no top level parent: ' + id);
    }

    setNested(this.env[id], subpath, val);
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


/**
 * Set for a nested path in the object outer.
 * @param {object} outer The context to search in.
 * @param {string[]} path The array of strings to search with.
 * @return {[any, object]} A tuple where the first element is the asked for
 *     value or undefined. The second element is the direct parent which is 
 *     helpful for binding 'this' if the value is a function.
 */
function setNested(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = value;
  return obj;
}
