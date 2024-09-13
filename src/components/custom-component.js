// @ts-check
/**
 * @file Custom component base.
 *
 * @typedef {Object} KeymapEntry
 * @prop {boolean} preventDefault Prevent default on the initial event.
 * @prop {function} fn The function to run on keypress.
 * 
 * @typedef {Element | typeof window | Document} Listenable
 * @typedef {EventListenerOrEventListenerObject} Listener
 */

/**
 * Skeleton class for a custom Web Component. Has utils for adding "key mapped"
 * functions and wraps adding event listeners for proper cleanup.
 */ 
export class CustomComponent extends HTMLElement {

  /** @type {ShadowRoot} */
  root;

  /** @type {Map<string, KeymapEntry>} */
  keymap = new Map();

  /** @type {Map<Listenable, [string, Listener][]>} */
  listeners = new Map();

  /** 
   * Whether or not key events get e.stopPropagation called.
   * @type {boolean}
   */
  captureKeys = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.listen(window, 'keydown', (e) => {
      if (!(e instanceof KeyboardEvent)) return;
      this.#keys(e)
    });
  }

  disconnectedCallback() {
    for (let [target, listeners] of this.listeners) {
      for (let [event, callback] of listeners) {
        target.removeEventListener(event, callback);
      }
    }
  }

  /**
   * Set up a listener.
   * @param {Listenable} target
   * @param {string} event
   * @param {Listener} callback
   */ 
  listen(target, event, callback) {
    target.addEventListener(event, callback);
    const listenersByTarget = this.listeners.get(target);
    if (!listenersByTarget) {
      this.listeners.set(target, [[event, callback]]);
    } else {
      listenersByTarget.push([event, callback]);
    }
  }


  /**
   * Set up a key handler.
   * @param {string} key The key combo. Like 'ctrl+r' or 'alt+shift+t'.
   * @param {(e: KeyboardEvent) => void} callback
   * @param {boolean} preventDefault Whether to prevent default on the 
   *     event or not. 
   */
  mapkey(key, callback, preventDefault = true) {
    this.keymap.set(key, {
      fn: callback,
      preventDefault: preventDefault
    });
  }


  /**
   * Key handlers.
   * @param {KeyboardEvent} e
   */ 
  #keys(e) {
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');

    keys.push(e.key.toLowerCase());

    const command = keys.join('+');
    const keymapEntry = this.keymap.get(command);
    if (!keymapEntry) {
      return;
    }
    keymapEntry.fn(e);
    if (keymapEntry.preventDefault) {
      e.preventDefault();
    }

    if (this.captureKeys) {
      e.stopPropagation();
    }
  }
}

