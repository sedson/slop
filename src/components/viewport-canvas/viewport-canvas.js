/**
 * @file Canvas viewer component.
 */

const markup = `
<link rel="stylesheet" href="src/components/viewport-canvas/style.css">
<div class="viewport">
  <canvas class="view-canvas"></canvas>
  <div class="buttons">
    <div class="button mode selected" data-mode="PAN">MOVE</div>
    <div class="button mode" data-mode="BRUSH">BRUSH</div>
  </div>
</div>
`.trim();

export const ViewportModes = {
  PAN: "PAN",
  BRUSH: "BRUSH"
};

class ViewportCanvas extends HTMLElement {
  constructor() {
    super();

    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = markup;

    this.viewport = this.root.querySelector('.viewport');
    this.viewCanvas = this.root.querySelector('.view-canvas');
    this.viewCtx = this.viewCanvas.getContext('2d');
    this.modeButtons = this.root.querySelectorAll('.button.mode');

    this.keymap = new Map();

    this._listeners = [];

    this.artboards = [];

    this.state = {
      top: 0,
      left: 0,
      scale: 1,
    };

    this._resizeHandler = window.addEventListener('resize', () => this.draw());

    this.mode = ViewportModes.PAN;
    this.setMode(ViewportModes.PAN);

    for (let btn of this.modeButtons) {
      btn.addEventListener('click', (e) => {
        this.setMode(btn.dataset.mode);
        console.log(this.mode);
      })
    }

    this.brushPoints = [];
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


  listen(target, event, callback) {
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
    this.listen(window, 'keydown', (e) => this._keys(e));

    this.listen(this.viewport, 'pointerdown', () => {
      this._mouseDown = true;
    });

    this.listen(window, 'pointerup', () => {
      this._mouseDown = false;
    });

    this.listen(window, 'mousemove', (e) => {
      if (!this._mouseDown) return;

      if (this.mode === ViewportModes.PAN) {
        this.state.left += e.movementX;
        this.state.top += e.movementY;
        this.draw();
      } else if (this.mode === ViewportModes.BRUSH) {
        this.brushPoints.push([
          (e.offsetX - this.state.left) / this.state.scale,
          (e.offsetY - this.state.top) / this.state.scale,
        ]);
        window.dispatchEvent(new CustomEvent("brush"));
        this.draw();
      }
    });

    this.listen(this.viewport, 'wheel', (e) => {
      console.log(e.wheelDeltaY);
      this.state.scale += e.wheelDeltaY / 1000;
      this.state.scale = Math.min(Math.max(0.1, this.state.scale), 20)
      this.draw();
    });
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

  setMode(mode) {
    this.mode = mode;
    for (let btn of this.modeButtons) {
      btn.classList.remove('selected');
      if (btn.dataset.mode === this.mode) {
        btn.classList.add('selected');
      }
    }
  }
}

customElements.define('viewport-canvas', ViewportCanvas);