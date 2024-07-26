/**
 * @file Code editor component. This is a silly idea, probably taken too far. A 
 * default HTML textarea is a somewhat workable editor, but does not support 
 * internal spans or other markup that would be essential to have syntax
 * highlighting. The idea here is that the user interacts with a text area with 
 * invisible text directly below a div full of highlighted spans with its 
 * pointer-events set to none. With some css effort the text lines up perfect 
 * and the trick works. Scroll position, scroll height, etc. have to be 
 * manually matched as well.
 */

import { highlight } from './highlight.js';
import { tokenize } from './tokenize.js';

// TODO These key presses interact with undo uniquely.
const nonPrintingChars = new Set(['Tab', 'Meta', 'Shift', 'Control', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown']);

const markup = `
<link rel="stylesheet" href="src/components/code-editor/style.css">
<textarea class="source" spellcheck="false"></textarea>
<div class="display">
  <div class="display-text"></div>
  <div class="scroll-filler"></div>
</div>
<div class="log"></div>
`.trim();


class CodeEditor extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = markup;

    this.editor = this.root.querySelector('.editor');
    this.source = this.root.querySelector('.source');
    this.display = this.root.querySelector('.display');
    this.displayText = this.root.querySelector('.display-text');
    this.scrollFiller = this.root.querySelector('.scroll-filler');
    this.log = this.root.querySelector('.log');

    /**
     * The registered key shortcuts.
     * @type {Map<string, function>} 
     */
    this.keymap = new Map();

    /**
     * Keep a running list of listeners for cleanup hygiene.
     * @private
     */
    this._listeners = [];

    /**
     * The number of spaces to append on tab press.
     * @private
     */
    this._tabSize = 2;

    /**
     * The string to append on tab.
     */
    this._tabString = "  ";

    /**
     * The current size of the font in ems.
     */
    this._fontSize = 1;

    /**
     * If I replace the string in the text area then the browser chucks its undo
     * history. Probably I want to make some kind of full custom undo stack.
     */
    this._undoStack = [];

    /**
     * The array of the highlighted text.
     */
    this.lines = [];

    /**
     * For syntax highlighting. An object with a tokenize function and a 
     * set of keywords.
     */
    this.syntax = {
      tokenize: tokenize,
      keywords: new Set(),
    }
  }


  /**
   * Add an event listener to the text area. Stash a reference to the listener
   * to remove on cleanup.
   * @param {string} event
   * @param {function} callback
   */
  listen(target, event, callback) {
    const listener = target.addEventListener(event, callback);
    this._listeners.push(listener);
    return listener;
  }


  /**
   * Manually raise a named event on the text area.
   * @param {string} event
   */
  raise(event) {
    this.source.dispatchEvent(new Event(event));
  }


  /**
   * Register a callback for any keystroke in the text area.
   * @param {function} callback
   */
  oninput(callback) {
    this.listen(this.source, 'input', callback);
  }


  /**
   * Set up a key handler.
   * @param {string} key The key combo. Like 'ctrl+r' or 'alt+shift+t'.
   * @param {function} callback
   * @param {boolean=true} preventDefault Whether to prevent default on the
   *     event or not.
   */
  mapkey(key, callback, preventDefault = true) {
    this.keymap.set(key, {
      fn: callback,
      preventDefault: preventDefault,
    });
  }


  /**
   * The source code, but cleaned so that lines are white-space-trimmed on the
   * right ends.
   * @type {string} 
   */
  get sourceString() {
    return this.source.value
      .split("\n")
      .map((ln) => ln.trimRight())
      .join("\n");
  }


  /**
   * The current selection. A [start, end] array.
   * @type {number[]}
   */
  get selection() {
    return [this.source.selectionStart, this.source.selectionEnd];
  }


  /**
   * A list of the locations of all line breaks.
   * @type {number[]}
   */
  get linebreaks() {
    const str = this.source.value;
    let loc = 0;
    let ndx = str.indexOf("\n");
    if (ndx < 0) return [ndx];
    let breaks = [ndx];
    while (ndx > -1) {
      ndx = str.indexOf("\n", ndx + 1);
      if (ndx > -1) breaks.push(ndx);
    }
    breaks.push(this.source.value.length + 1);
    return breaks;
  }


  /**
   * The line of the current selection end.
   * @type {number}
   */
  get currentLine() {
    const pos = this.source.selectionEnd;
    const breaks = this.linebreaks;
    for (let i = breaks.length - 1; i >= 0; i--) {
      if (pos <= breaks[i] && pos > (breaks[i - 1] ?? -1)) {
        return i;
      }
    }
    return -1;
  }


  /**
   * Key event handler. 
   * @private
   */
  _keys(e) {
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');

    keys.push(e.key.toLowerCase());

    const command = keys.join('+');

    if (this.keymap.has(command)) {
      this.keymap.get(command).fn(e);
      if (this.keymap.get(command).preventDefault) {
        e.preventDefault();
      }
    }

    if (!nonPrintingChars.has(e.key) && !e.metaKey && !e.ctrlKey)
      this._undoStack = [];

    e.stopPropagation();
  }


  /**
   * WebComponent mount handler. Set up all the default listeners.
   */
  connectedCallback() {
    this.listen(this.source, 'keydown', (e) => this._keys(e));
    this.listen(this.source, 'scroll', (e) => this._mirror(e));
    this.listen(window, 'resize', (e) => this._mirror(e));

    // Firefox listens on the textarea itself.
    this.listen(this.source, 'selectionchange', (e) => this.updateCaret());

    // Other browsers listen on the document.
    this.listen(document, 'selectionchange', (e) => {
      this.updateCaret();
    });

    this.listen(this.source, 'input', (e) => {
      const tokens = this.syntax.tokenize(this.sourceString);
      this.setHighlight(highlight(this.sourceString, tokens, this.syntax.keywords));
    });
  }


  /**
   * WebComponent mount handler. Set up all the default listeners.
   */
  disconnectedCallback() {
    for (let listener of this._listeners) {
      this.source.removeEventListener(listener);
    }
  }


  /**
   * Save to local storage.
   * TODO
   * @param {string} name The name of the "file".
   */
  save(name) {
    try {
      localStorage.setItem('text-' + name, this.source.value);
    } catch (e) {
      console.error(e);
    }
  }


  /**
   * Load from local storage.
   * TODO
   * @param {string} name The name of the "file".
   */
  load(name) {
    try {
      const text = localStorage.getItem('text-' + name);
      this.source.value = text;
      this.raise('input');
    } catch (e) {
      console.error(e);
    }
  }


  /**
   * Print some text to the log.
   * @param {string} text The text.
   * @param {boolean} error Whether the text is an error message.
   */
  print(text, error = false) {
    const line = document.createElement('div');
    line.classList.add('log-line');
    if (error) line.classList.add('error');

    const time = new Date().toLocaleTimeString();
    const timeSpan = document.createElement('span');

    line.innerText = text;
    this.log.append(line);
    this.log.scrollTop = this.log.scrollHeight;
  }


  /**
   * Print an error to the log.
   * @param {string} text The text.
   */
  error(text) {
    this.print(text, true);
  }


  /**
   * start of a custom undo handler.
   * TODO
   * @param {string} text The text.
   * 
   */
  undo(e) {
    if (this._undoStack.length) {
      let last = this._undoStack.pop();
      this.source.value = last.str;
      this.source.setSelectionRange(last.sel[0], last.sel[1]);
      this.raise('input');
      e.preventDefault();
    }
  }


  /**
   * Set the syntax for the editor.
   * @param {(source: string) => Tokens[]} tokenize A tokenize function.
   * @param {Set<string>} A set of keywords.
   */
  setSyntax(tokenize, keywords) {
    this.syntax = { tokenize, keywords };
  }


  /**
   * Handle custom tab behavior for one line of text.
   * TODO This kinda sucks. Bugs if cursor is in white space at the start or end
   *     of the line.
   * @param {boolean} reverse Flag for forward or reverse indent.
   */
  indent(reverse) {
    const sel = this.selection;
    const str = this.source.value;
    this._undoStack.push({ str, sel });

    let lineStart = sel[0];

    while (str[lineStart] !== "\n" && lineStart > -1) {
      lineStart--;
    }
    lineStart += 1;

    if (reverse) {
      let backShiftAmt = 0;
      while (
        str[lineStart + backShiftAmt] === " " &&
        backShiftAmt < this._tabSize
      ) {
        backShiftAmt++;
      }

      this.source.value =
        str.slice(0, lineStart) + str.slice(lineStart + backShiftAmt);
      const start = Math.max(sel[0] - backShiftAmt, lineStart);
      this.source.setSelectionRange(start, sel[1] - backShiftAmt);
    } else {
      this.source.value =
        str.slice(0, lineStart) + this._tabString + str.slice(lineStart);
      this.source.setSelectionRange(
        sel[0] + this._tabSize,
        sel[1] + this._tabSize,
      );
    }

    this.raise('input');
  }


  /**
   * Scroll match the highlighted div to the source text area.
   */
  _mirror() {
    this.scrollFiller.style.height = this.source.scrollHeight + 'px';
    this.display.scrollTop = this.source.scrollTop;
    this.display.scrollLeft = this.source.scrollLeft;
  }


  /**
   * Change the font size by some amount of em.
   * @param {number} amt The amount.
   */
  zoom(amt) {
    this._fontSize += amt;
    this.editor.style.fontSize = this._fontSize + 'rem';
  }


  /**
   * Set the highlighted lines of text.
   * @param {HTMLElement[]} lines
   * @private
   */
  setHighlight(lines) {
    this.source.style.color = 'transparent';
    this.lines = lines;
    this.displayText.innerHTML = '';
    for (let line of this.lines) this.displayText.append(line);
    this.updateCaret();
  }


  /**
   * Update the caret line of highlight.
   * @private
   */
  updateCaret() {
    const lineNo = this.currentLine;
    if (lineNo === -1) return;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      line.classList.remove('caret-line');
      if (i === lineNo) {
        line.classList.add('caret-line');
      }
    }
  }


  /**
   * Clear the log text.
   */
  clearLog() {
    this.log.innerHTML = '';
  }
}

customElements.define('code-editor', CodeEditor);