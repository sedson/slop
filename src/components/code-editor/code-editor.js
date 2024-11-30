// @ts-check
/**
 * @file Code editor component. This is a silly idea, probably taken too far. A 
 * default HTML textarea is a somewhat workable editor, but does not support 
 * internal spans or other markup that would be essential to have syntax
 * highlighting. The idea here is that the user interacts with a text area with 
 * invisible text directly below a div full of highlighted spans with its 
 * pointer-events set to none. With some css effort the text lines up perfect 
 * and the trick works. Scroll position, scroll height, etc. have to be 
 * manually matched as well.
 *
 * @typedef {import('../custom-component.js').Listener} Listener
 * 
 * @typedef {Object} Syntax
 * @prop {((source: string) => Token[]) | undefined} tokenize A tokenizer function
 * @prop {Set<string>} keywords A set of special key words
 * @prop {string} comment The comment marker
 * @prop {number} tabSize The number of spaced to use for tabs
 * 
 */

import { CustomComponent } from '../custom-component.js';
import { highlight } from './highlight.js';
import { Token } from '../../lang/token.mjs';
import * as stringTools from './string-tools.js';
import { THEME, applyTheme } from '../../themes.js';


const markup = `
<link rel="stylesheet" href="src/components/code-editor/style.css">
<textarea class="source" spellcheck="false"></textarea>
<div class="display">
  <div class="display-text"></div>
  <div class="scroll-filler"></div>
</div>
<div class="log"></div>
`.trim();

/**
 * The SLOP editor.
 */
export class CodeEditor extends CustomComponent {

  captureKeys = true;

  constructor() {
    super();

    this.root.innerHTML = markup;
    applyTheme(THEME, this);

    this.source = /** @type {HTMLTextAreaElement} */ (this.root.querySelector('.source'));
    this.display =  /** @type {HTMLDivElement} */ (this.root.querySelector('.display'));
    this.displayText = /** @type {HTMLDivElement} */ (this.root.querySelector('.display-text'));
    this.scrollFiller = /** @type {HTMLDivElement} */ (this.root.querySelector('.scroll-filler'));
    this.log =  /** @type {HTMLDivElement} */ (this.root.querySelector('.log'));

    /** @type {Syntax} */
    this.syntax = {
      tokenize: undefined,
      keywords: new Set(),
      comment: '#',
      tabSize: 2,
    }

    /**
     * @type {string}
     */
    this.tabString = stringTools.fillString(this.syntax.tabSize, " ");

    /**
     * The current size of the font in ems.
     * @type {number}
     */
    this.fontSize = 1;

    /**
     * If I replace the string in the text area then the browser chucks its undo
     * history. Probably I want to make some kind of full custom undo stack.
     * TODO
     * @private
     */
    this.undoStack = [];

    /**
     * The array of the highlighted text.
     * @type {HTMLElement[]}
     */
    this.lines = [];


    /**
     * The list of tokens
     * @type {Token[]}
     */
    this.tokens = [];
  }


  /**
   * Manually raise a named event on the text area.
   * @param {string} event
   */
  raise(event) {
    this.source.dispatchEvent(new Event(event));
  }


  /**
   * The source text.
   * @type {string} 
   */
  get text() {
    return this.source.value;
  }


  connectedCallback() {
    super.connectedCallback();

    this.listen(this.source, 'scroll', () => this.#mirror());
    this.listen(window, 'resize', () => this.#mirror());

    // Firefox listens on the textarea itself.
    this.listen(this.source, 'selectionchange', () => this.updateCaret());

    // Other browsers listen on the document.
    this.listen(document, 'selectionchange', () => this.updateCaret());

    this.listen(this.source, 'input', () => this.update());
  }


  /**
   * The source text, right trailing spaces trimmed per line.
   * @type {string} 
   */
  get trimmedText() {
    return this.source.value
      .split("\n")
      .map((ln) => ln.trimEnd())
      .join("\n");
  }


  /**
   * The current selection. A [start, end] array.
   * @type {[number, number]}
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
   * Get token containing the text offset ndx.
   * @param {number} ndx An index in the source string.
   * @return {[Token|undefined, number]} The token data.
   */
  tokenAt(ndx) {
    let left = 0;
    let right = this.tokens.length - 1;
    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2);
      const token = this.tokens[mid];
      const [start, end] = token.range;

      if (start <= ndx && ndx < end)
        return [token, mid];

      if (ndx < start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return [undefined, -1];
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


  update() {
    if (this.syntax.tokenize) {
      this.tokens = this.syntax.tokenize(this.text);
      const highlighted = highlight(this.text, this.tokens, this.syntax.keywords);
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
      const text = localStorage.getItem('text-' + name) ?? '';
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

    // const time = new Date().toLocaleTimeString();
    // const timeSpan = document.createElement('span');

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
   * custom undo handler.
   * @param {{ preventDefault: () => void; }} e
   */
  undo(e) {
    if (this.undoStack.length) {
      let last = this.undoStack.pop();
      this.source.value = last.str;
      this.source.setSelectionRange(last.sel[0], last.sel[1]);
      this.raise('input');
      e.preventDefault();
    }
  }


  /**
   * Push current state onto the custom undo stack.
   */
  #pushState() {
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
    this.undoStack.push({
      sel: this.selection,
      str: this.text,
    });
  }


  /**
   * Set the syntax for the editor.
   * @param {object} syntax The syntax.
   * @param {(source: string) => Token[]} syntax.tokenize A tokenize function.
   * @param {Set<string>} syntax.keywords A set of keywords.
   * @param {number} syntax.tabSize The number of spaces to indent lines
   * @param {string} syntax.comment The string to use when commenting a line. 
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
    this.#pushState();
    const selection = this.selection;
    const selectedLines = this.selectedLines;

    if (selection[0] === selection[1]) {
      // Indent one line and move the caret accordingly.
      const [pos, offset] = this.#indentLine(selectedLines[0], reverse);
      const caret = Math.max(pos, selection[0] + offset);
      this.source.setSelectionRange(caret, caret);
      this.raise('input');
      return;
    }

    const startLineNo = selectedLines[0];
    const endLineNo = selectedLines[selectedLines.length - 1];

    // Keep selection if it fits on one line.
    if (endLineNo === startLineNo) {
      const [pos, offset] = this.#indentLine(selectedLines[0], reverse);
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
      const [, offset] = this.#indentLine(selectedLines[i], reverse);
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
   * @param {boolean} reverse If true, de-indent the line.
   * @return {[number, number]} A tuple with elem 0: the text position at the 
   *     start of the indented line and elem 1: the total amount of chars
   *     added – negative number if removed.
   */
  #indentLine(lineNo, reverse) {
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
      this.source.value = str.slice(0, lineStart) + this.tabString + str.slice(lineStart);
      return [lineStart, this.syntax.tabSize];
    }
  }


  /**
   * Handle comment and and uncomment based on current selection.
   * @void
   */
  comment() {
    this.#pushState();
    const selection = this.selection;
    const selectedLines = this.selectedLines;

    // Comment one line and move the caret accordingly.
    if (selection[0] === selection[1]) {
      const [line, pos, offset] = this.#commentLine(selectedLines[0]);
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
      const [line, pos, offset] = this.#commentLine(selectedLines[0]);
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
        this.#commentLine(selectedLines[i]) : this.#commentLine(selectedLines[i], depth);

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
   */
  #commentLine(lineNo, forceStart = -1) {
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
  #mirror() {
    this.scrollFiller.style.height = this.source.scrollHeight + 'px';
    this.display.scrollTop = this.source.scrollTop;
    this.display.scrollLeft = this.source.scrollLeft;
  }


  /**
   * Change the font size by some amount of em.
   * @param {number} amt The amount.
   */
  zoom(amt) {
    this.fontSize += amt;
    this.style.fontSize = this.fontSize + 'rem';
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


  replaceToken(tokenIndex, value, pushState = false, selectToken = true) {
    if (tokenIndex < 0 || tokenIndex > this.tokens.length) {
      return;
    }

    if (pushState) {
      this.#pushState();
    }

    const str = this.text;
    const sel = this.selection;

    const token = this.tokens[tokenIndex];
    const before = str.slice(0, token.range[0]);
    const after = str.slice(token.range[1]);

    this.source.value = before + value + after;
    if (selectToken) {
      const start = token.range[0]
      const end = token.range[0] + value.toString().length;
      this.source.setSelectionRange(start, end, "backward");
    } else {
      this.source.setSelectionRange(...sel);
    }

    this.raise('input');
  }

  /**
   * Clear the log text.
   */
  clearLog() {
    this.log.innerHTML = '';
  }
}

customElements.define('code-editor', CodeEditor);
