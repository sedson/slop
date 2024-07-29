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
import * as stringTools from './string-tools.js';

// TODO : These key presses interact with undo uniquely. When/if I roll my own 
// undo stack, these might go.
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
     * The string to append on tab.
     * @private
     */
    this._tabString = "  ";

    /**
     * The current size of the font in ems.
     * @type {number}
     * @private
     */
    this._fontSize = 1;

    /**
     * If I replace the string in the text area then the browser chucks its undo
     * history. Probably I want to make some kind of full custom undo stack.
     * TODO
     * @private
     */
    this._undoStack = [];

    /**
     * The list of line break locations.
     * @type {number[]}
     * @private
     */


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
      comment: '#',
      tabSize: 2,
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
   * The source text.
   * @type {string} 
   */
  get text() {
    return this.source.value;
  }


  /**
   * The source text, right trailing spaces trimmed per line.
   * @type {string} 
   */
  get trimmedText() {
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
   * The current caret position.
   * @type {number}
   */
  get caretPosition() {
    return this.source.selectionDirection === 'forward' ?
      this.source.selectionEnd :
      this.source.selectionStart;
  }


  /**
   * A list of the locations of all line breaks.
   * @type {number[]}
   */
  get linebreaks() {
    return stringTools.findLineBreaks(this.text);
  }


  /**
   * Get the index of the line containing some selection.
   * @param {number} ndx An index in the source string.
   * @return {number} The line number containing that index.
   */
  lineAt(ndx) {
    return this.linebreaks.findIndex((num, i, arr) => {
      return ndx <= num && (ndx >= (arr[i - 1] ?? -1));
    });
  }


  /**
   * A list of all currently selected line numbers.
   * @type {number[]}
   */
  get selectedLines() {
    const sel = this.selection;
    if (sel[0] === sel[1])
      return [this.lineAt(sel[0])];

    const start = this.lineAt(sel[0]);
    const end = this.lineAt(sel[1]);
    if (start === end)
      return [start];

    const range = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
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

    this.listen(this.source, 'input', (e) => this.update());
  }


  /**
   * WebComponent mount handler. Set up all the default listeners.
   */
  disconnectedCallback() {
    for (let listener of this._listeners) {
      this.source.removeEventListener(listener);
    }
  }


  update() {
    if (this.syntax.tokenize) {
      const tokens = this.syntax.tokenize(this.text);
      const highlighted = highlight(this.text, tokens, this.syntax.keywords);
      this.setHighlight(highlighted);
    }
    this.updateCaret();
  }

  /**
   * Save to local storage.
   * TODO
   * @param {string} name The name of the "file".
   */
  save(name) {
    try {
      localStorage.setItem('text-' + name, this.source.value);
      this.print('Saved text to localStorage: ' + name);
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
   * Push current state onto the custom undo stack.
   */
  _pushState() {
    if (this._undoStack.length > 10) {
      this._undoStack.shift();
    }
    this._undoStack.push({
      sel: this.selection,
      str: this.text,
    });
  }


  /**
   * Set the syntax for the editor.
   * @param {object} syntax The syntax.
   * @param {(source: string) => Tokens[]} syntax.tokenize A tokenize function.
   * @param {Set<string>} syntax.keywords A set of keywords.
   * @param {number} syntax.tabSize The number of spaces to indent lines
   * @param {char} syntax.comment The string to use when commenting a line. 
   */
  setSyntax(syntax) {
    this.syntax = syntax;
  }


  /**
   * Handle indentation and de-indentation based on current selection.
   * @param {boolean} reverse Flag for forward or reverse indent. Default is 
   *     false (forward).
   * @void
   */
  indent(reverse = false) {
    this._pushState();
    const selection = this.selection;
    const selectedLines = this.selectedLines;

    if (selection[0] === selection[1]) {
      // Indent one line and move the caret accordingly.
      const [pos, offset] = this._indentLine(selectedLines[0], reverse);
      const caret = Math.max(pos, selection[0] + offset);
      this.source.setSelectionRange(caret, caret);
      this.raise('input');
      return;
    }

    const startLineNo = selectedLines[0];
    const endLineNo = selectedLines[selectedLines.length - 1];

    // Keep selection if it fits on one line.
    if (endLineNo === startLineNo) {
      const [pos, offset] = this._indentLine(selectedLines[0], reverse);
      const newSelectionStart = Math.max(pos, selection[0] + offset);
      const newSelectionEnd = Math.max(pos, selection[1] + offset);
      this.source.setSelectionRange(newSelectionStart, newSelectionEnd);
      this.raise('input');
      return;
    }

    // The beginning of the First selected line.
    const firstLineStart = stringTools.lineStart(this.text, this.selectedLines[0]);
    let totalOffset = 0;
    let firstLineOffset = 0;

    for (let i = 0; i < selectedLines.length; i++) {
      const [, offset] = this._indentLine(selectedLines[i], reverse);
      if (i === 0)
        firstLineOffset = offset;

      totalOffset += offset;
    }

    const newSelectionStart = Math.max(firstLineStart, selection[0] + firstLineOffset);
    const newSelectionEnd = selection[1] + totalOffset;
    this.source.setSelectionRange(newSelectionStart, newSelectionEnd);
    this.raise('input');
  }


  /**
   * Single line indent helper.
   * @param {number} lineNo The line number to indent or de-indent.
   * @param {reverse} reverse If true, de-indent the line.
   * @return {[number, number]} A tuple with elem 0: the text position at the 
   *     start of the indented line and elem 1: the total amount of chars
   *     added – negative number if removed.
   * @private
   */
  _indentLine(lineNo, reverse) {
    const str = this.text;
    const lineStart = stringTools.lineStart(str, this.linebreaks[lineNo]);

    if (reverse) {
      let backShiftAmt = 0;
      while (str[lineStart + backShiftAmt] === " " && backShiftAmt < this.syntax.tabSize) {
        backShiftAmt++;
      }
      this.source.value = str.slice(0, lineStart) + str.slice(lineStart + backShiftAmt);
      return [lineStart, -backShiftAmt];
    } else {
      this.source.value = str.slice(0, lineStart) + this._tabString + str.slice(lineStart);
      return [lineStart, this.syntax.tabSize];
    }
  }


  /**
   * Handle comment and and uncomment based on current selection.
   * @void
   */
  comment() {
    this._pushState();
    const selection = this.selection;
    const selectedLines = this.selectedLines;

    // Comment one line and move the caret accordingly.
    if (selection[0] === selection[1]) {
      const [line, pos, offset] = this._commentLine(selectedLines[0]);
      let caret = selection[0];
      if (caret >= pos) {
        caret = Math.max(line, caret + offset);
      }
      this.source.setSelectionRange(caret, caret);
      this.raise('input');
      return;
    }

    const startLineNo = selectedLines[0];
    const endLineNo = selectedLines[selectedLines.length - 1];

    // Keep selection if it fits on one line.
    if (endLineNo === startLineNo) {
      const [line, pos, offset] = this._commentLine(selectedLines[0]);
      let newStart = selection[0];
      let newEnd = selection[1];

      if (newStart >= pos) {
        newStart = Math.max(line, newStart + offset);
      }
      if (newEnd >= pos) {
        newEnd = Math.max(line, newEnd + offset);
      }

      this.source.setSelectionRange(newStart, newEnd);
      this.raise('input');
      return;
    }

    // The beginning of the first selected line.
    const firstLineStart =
      stringTools.lineStart(this.text, this.linebreaks[selectedLines[0]]);

    let allCommented = true;
    let depth = Infinity;

    for (let i = 0; i < selectedLines.length; i++) {
      const lineStart = stringTools.lineStart(this.text, this.linebreaks[selectedLines[i]]);
      const [index, char] = stringTools.nextNonSpaceChar(this.text, lineStart);
      if (index - lineStart < depth) {
        depth = index - lineStart;
      }
      if (char !== this.syntax.comment) {
        allCommented = false;
      }
    }

    let totalOffset = 0;
    let firstLineOffset = 0;

    // If every selected line was already commented, I can safely uncomment 
    // by deferring to the default behavior of _commentLine, otherwise I pass 
    // the optional depth param, which will add a comment token at that position
    // in each line.
    for (let i = 0; i < selectedLines.length; i++) {
      const [, , offset] = allCommented ?
        this._commentLine(selectedLines[i]) : this._commentLine(selectedLines[i], depth);

      if (i === 0) firstLineOffset += offset;
      totalOffset += offset;
    }

    const newSelectionStart = Math.max(firstLineStart, selection[0] + firstLineOffset);
    const newSelectionEnd = selection[1] + totalOffset;
    this.source.setSelectionRange(newSelectionStart, newSelectionEnd);
    this.raise('input');
  }


  /**
   * Single line comment helper. Will uncomment if the first char on the line 
   * is the configured syntax.comment char, otherwise will add the comment 
   * char plus a space.
   * @param {number} lineNo The line number to comment or uncomment.
   * @param {number} forceStart The in-line offset to force add a comment token
   *     in the case of a multi line comment where all lines should receive a 
   *     comment.
   * @return {[number, number, number]} A tuple with elem 0: the text position 
   *     at the start of the commented line, elem 1: the text index where the 
   *     comment token was added or removed, and elem 2: the total amount of 
   *     chars added – negative number if removed
   * @private
   */
  _commentLine(lineNo, forceStart = -1) {
    const str = this.text;
    const lineStart = str.lastIndexOf('\n', this.linebreaks[lineNo] - 1) + 1;
    let lineEnd = str.indexOf('\n', this.linebreaks[lineNo] + 1);
    if (lineEnd === -1) lineEnd = str.length;

    if (forceStart > -1) {
      let index = lineStart + forceStart;
      this.source.value = str.slice(0, index) + this.syntax.comment + ' ' + str.slice(index);
      return [lineStart, index, 2];
    }

    let index = lineStart;
    while (index < lineEnd && str[index] === ' ') {
      index += 1;
    }

    if (str[index] === this.syntax.comment) {
      if (str[index + 1] === ' ') {
        this.source.value = str.slice(0, index) + str.slice(index + 2);
        return [lineStart, index, -2]
      } else {
        this.source.value = str.slice(0, index) + str.slice(index + 1);
        return [lineStart, index, -1]
      }
    }

    this.source.value = str.slice(0, index) + this.syntax.comment + ' ' + str.slice(index);
    return [lineStart, index, 2];
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
    const lineNo = this.lineAt(this.caretPosition);
    if (lineNo === -1) return;
    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i].classList.remove('caret-line');
      if (lineNo === i) {
        this.lines[i].classList.add('caret-line');
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