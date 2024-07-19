import css from './code-editor.style.js';

const markup = `
<style>
${css}
</style>
<div class="editor">
  <textarea class="source" spellcheck="false"></textarea>
  <div class="display">
    <div class="display-text"></div>
    <div class="scroll-filler"></div>
  </div>
  <div class="log"></div>
</div>
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

    this.log = this.root.querySelector('.log');
    this.scrollFiller = this.root.querySelector('.scroll-filler');

    this._listeners = [];
    this.keymap = new Map();

    this._tabSize = 2;
    this._tabString = '  ';

    this._fontSize = 1;

    this._localUndoStack = [];

    this.logLine = 0;

    this.displayLines = [];

    this.nonPrintingChars = new Set([
      'Tab', 'Meta', 'Shift', 'Control', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
    ]);
  }

  /**
   * Add an event listener to the text area. Stash a reference to the listener 
   * to remove on cleanup.
   * @param {string} event
   * @param {function} callback
   */
  listen(event, callback, target = window) {
    const listener = target.addEventListener(event, callback);
    this._listeners.push(listener);
    return listener;
  }

  /**
   * Manually raise a named event on the text area.
   * @param {string} event
   */
  raise(event) {
    this.source.dispatchEvent(new Event(event))
  }

  /**
   * Register a callback for any keystroke in the text area.
   * @param {function} callback
   */
  oninput(callback) {
    this.listen('input', callback, this.source);
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
      preventDefault: preventDefault
    });
  }

  get sourceString() {
    return this.source.value.split('\n')
      .map(ln => ln.trimRight())
      .join('\n');
  }

  get selection() {
    return [this.source.selectionStart, this.source.selectionEnd];
  }

  get linebreaks() {
    const str = this.source.value;
    let loc = 0;
    let ndx = str.indexOf('\n');
    if (ndx < 0) return [ndx];
    let breaks = [ndx];
    while (ndx > -1) {
      ndx = str.indexOf('\n', ndx + 1);
      if (ndx > -1) breaks.push(ndx)
    }
    breaks.push(this.source.value.length + 1);
    return breaks;
  }

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

    if (!this.nonPrintingChars.has(e.key) && !e.metaKey && !e.ctrlKey)
      this._localUndoStack = [];

    e.stopPropagation();
  }

  connectedCallback() {
    this.listen('keydown', (e) => this._keys(e), this.source);
    this.listen('scroll', (e) => this._mirror(e), this.source);
    this.listen('resize', (e) => this._mirror(e), window);

    // Firefox listens on the textarea itself.
    this.listen('selectionchange', (e) => this.updateCaret(), this.source);

    // Other browsers listen on the document.
    this.listen('selectionchange', (e) => {
      this.updateCaret();
    }, document);
  }

  disconnectedCallback() {
    for (let listener of this._listeners) {
      this.source.removeEventListener(listener);
    }
  }


  save(uuid) {
    try {
      localStorage.setItem('text-' + uuid, this.source.value);
    } catch (e) {
      console.error(e)
    }
  }

  load(uuid) {
    try {
      const text = localStorage.getItem('text-' + uuid);
      this.source.value = text;
      this.raise('input')
    } catch (e) {
      console.error(e);
    }
  }

  print(text, error) {
    const line = document.createElement('div');
    line.classList.add('log-line');
    if (error) line.classList.add('error');

    const time = (new Date()).toLocaleTimeString();
    const timeSpan = document.createElement('span');


    line.innerText = text;
    this.log.append(line);
    this.log.scrollTop = this.log.scrollHeight;
  }

  error(text) {
    this.print(text, true);
  }

  undo(e) {
    if (this._localUndoStack.length) {
      let last = this._localUndoStack.pop();
      this.source.value = last.str;
      this.source.setSelectionRange(last.sel[0], last.sel[1]);
      this.raise('input')
      e.preventDefault();
    }
  }

  /**
   * Handle custom tab behavior for one line of text.
   */
  indent(reverse) {
    const sel = this.selection;
    const str = this.source.value;

    this._localUndoStack.push({ str, sel });

    let lineStart = sel[0];

    while (str[lineStart] !== '\n' && lineStart > -1) {
      lineStart--;
    }
    lineStart += 1;


    if (reverse) {
      let backShiftAmt = 0;
      while (str[lineStart + backShiftAmt] === ' ' && backShiftAmt < this._tabSize) {
        backShiftAmt++;
      }


      this.source.value = str.slice(0, lineStart) + str.slice(lineStart + backShiftAmt);
      const start = Math.max(sel[0] - backShiftAmt, lineStart);
      this.source.setSelectionRange(start, sel[1] - backShiftAmt);

    } else {
      this.source.value = str.slice(0, lineStart) + this._tabString + str.slice(lineStart);
      this.source.setSelectionRange(sel[0] + this._tabSize, sel[1] + this._tabSize);
    }

    this.raise('input')
  }


  _mirror() {
    this.scrollFiller.style.height = this.source.scrollHeight + 'px';
    this.display.scrollTop = this.source.scrollTop;
    this.display.scrollLeft = this.source.scrollLeft;
  }

  zoom(amt) {
    this._fontSize += amt;
    this.editor.style.fontSize = this._fontSize + 'rem';
  }

  setHighlight(lines) {
    this.source.style.color = 'transparent';
    this.lines = lines;

    this.displayText.innerHTML = '';
    for (let line of this.lines)
      this.displayText.append(line);

    this.updateCaret();
  }

  updateCaret() {
    const lineNo = this.currentLine;
    console.log(lineNo);
    if (lineNo === -1) return;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      line.classList.remove('caret-line');
      if (i === lineNo) {
        line.classList.add('caret-line');
      }
    }
  }
}


customElements.define('code-editor', CodeEditor);