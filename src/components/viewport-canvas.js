import css from './viewport-canvas.style.js';

const markup = `
<style>
${css}
</style>
<div class="viewport">
  <canvas class="view-canvas"></canvas>
</div>
`.trim();

class ViewportCanvas extends HTMLElement {
  constructor() {
    super();

    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = markup;

    this.viewport = this.root.querySelector('.viewport');
    this.viewCanvas = this.root.querySelector('.view-canvas');
    this.viewCtx = this.viewCanvas.getContext('2d');

    this._listeners = [];
    this.keymap = new Map();

    this.artboards = [];

    this.state = {
      top: 0,
      left: 0,
      scale: 1,
    }

    this._resizeHandler = window.addEventListener('resize', () => this.draw());
  }

  get width() { return this.viewport?.clientWidth ?? 0; }
  get height() { return this.viewport?.clientHeight ?? 0; }


  draw() {
    this.viewCanvas.width = this.width;
    this.viewCanvas.height = this.height;


    this.viewCtx.clearRect(0, 0, this.width, this.height);

    this.viewCtx.translate(this.state.left, this.state.top);
    this.viewCtx.scale(this.state.scale, this.state.scale);

    for (let artboard of this.artboards) {
      this.viewCtx.drawImage(artboard.canvas, artboard.position[0], artboard.position[1]);
    }
  }

  clear() {
    this.artboards = [];
    this.draw();
  }


  listen(event, callback, target = window) {
    const listener = target.addEventListener(event, callback);
    this._listeners.push(listener);
    return listener;
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

  _keys(e) {
    console.log(e)
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
  }


  connectedCallback() {
    this.listen('keydown', (e) => this._keys(e), window);

    this.listen('pointerdown', () => {
      this._mouseDown = true;
    }, this.viewport);

    this.listen('pointerup', () => {
      this._mouseDown = false;
    }, window);

    this.listen('mousemove', (e) => {
      if (!this._mouseDown) return;
      this.state.left += e.movementX //  / this.state.scale;
      this.state.top += e.movementY //  / this.state.scale;
      this.draw();
    }, window);

    this.listen('wheel', (e) => {
      console.log(e.wheelDeltaY);
      this.state.scale += e.wheelDeltaY / 1000;
      this.state.scale = Math.min(Math.max(0.1, this.state.scale), 20)
      this.draw();
    }, this.viewport);

  }


  disconnectedCallback() {
    for (let listener of this._listeners) {
      this.source.removeEventListener(listener);
    }
    window.removeEventListener(this._resizeHandler);
  }

  zoom(amt) {
    this.state.scale += amt;
    this.draw();
  }

  pan(x, y) {
    this.state.left += x;
    this.state.top += y;
    this.draw();
  }
}

customElements.define('viewport-canvas', ViewportCanvas);