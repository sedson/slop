import css from './code-editor.style.js';


const markup = `
<style>
${css}
</style>
<div class="editor">
  <textarea class="source" spellcheck="false"></textarea>
  <div class="display"></div>
  <div class="log"></div>
</div>
`.trim();


class CodeEditor extends HTMLElement {
  constructor() {
    super();

    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = markup;

    this.source = this.root.querySelector('.source');
    this.display = this.root.querySelector('.display');
    this.log = this.root.querySelector('.log');

    this._listeners = [];
    this.keymap = new Map();

    this._tabSize = 2;
    this._tabString = '  ';

    this._localUndoStack = [];

    this.logLine = 0;

    this.nonPrintingChars = new Set([
      'Tab', 'Meta', 'Shift', 'Control', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
    ]);
  }

  listen(event, callback) {
    const listener = this.source.addEventListener(event, callback);
    this._listeners.push(listener);
    return listener;
  }

  raise(event) {
    this.source.dispatchEvent(new Event(event))
  }

  oninput(callback) {
    this.listen('input', callback);
  }

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
  }

  connectedCallback() {
    this.listen('keydown', (e) => this._keys(e));
    // this.listen('input', (e) => this._localUndoStack = []);
    this.listen('scroll', (e) => this._mirror(e));
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
    const prompt = document.createElement('span');

    if (error) {
      prompt.classList.add('prompt', 'error');
      prompt.innerText = '×';
    } else {
      prompt.classList.add('prompt');
      prompt.innerText = '>';
    }

    line.innerHTML = prompt.outerHTML + text;
    this.log.append(line);
    this.log.scrollTop = this.log.scrollHeight;
  }

  error(text) {
    this.print(text, true);
  }

  undo(e) {
    console.log('UNDO')
    console.log(this._localUndoStack)
    if (this._localUndoStack.length) {
      console.log('POP LAST')
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
    const rect = this.source.getBoundingClientRect();
    this.display.style.height = rect.height;
    this.display.style.width = rect.width;
    this.display.scrollTop = this.source.scrollTop;
    this.display.scrollLeft = this.source.scrollLeft;
  }
}


customElements.define('code-editor', CodeEditor);