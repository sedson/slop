// @ts-check
/**
 * @file Viewport custom component.
 * 
 * @typedef {Object} Artboard
 * @prop {Canvas} canvas
 * @prop {[number, number]} position
 * @prop {[number, number][]} brushPoints
 * 
 * @typedef {keyof ViewportModes} ViewportMode
 */

import { CustomComponent } from "../custom-component.js";
import { Canvas } from "../../canvas.js";
import { THEME, applyTheme } from '/src/themes.js';

/**
 * Modes/tools for the viewport
 */
export const ViewportModes = {
  PAN: "PAN",
  BRUSH: "BRUSH"
};

/** The max size of the viewport for drawing guides */
const EDGE = 5_000;

/**
 * The markup for the Custom Component.
 */ 
const markup = `
<link rel="stylesheet" href="src/components/viewport-canvas/style.css">
<div class="viewport">
  <canvas class="view-canvas"></canvas>
  <div class="buttons">
    <div class="button mode selected" data-mode="PAN">[M] MOVE</div>
    <div class="button mode" data-mode="BRUSH">[B] BRUSH</div>
  </div>
</div>
`.trim();


export class ViewportCanvas extends CustomComponent {
  constructor() {
    super();
    this.root.innerHTML = markup;
    applyTheme(THEME, this);

    this.viewport = /** @type {HTMLCanvasElement} */ (this.root.querySelector('.viewport'));
    this.canvas = /** @type {HTMLCanvasElement} */ (this.root.querySelector('.view-canvas'));
    this.ctx = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
    
    /** @type {HTMLElement[]} */
    this.modeButtons = Array.from(this.root.querySelectorAll('.button.mode'))
      .filter(x => x instanceof HTMLElement);

    /** @type {Map<string, Artboard>} */
    this.artboards = new Map();

    this.top = 0;
    this.left = 0;
    this.scale = 1;

    this.resizeHandler = window.addEventListener('resize', () => this.draw());

    this.setMode(ViewportModes.PAN);

    for (let btn of this.modeButtons) {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode ?? '');
      })
    }
  }

  get width() { return this.canvas?.clientWidth ?? 0; }
  get height() { return this.canvas?.clientHeight ?? 0; }


  draw(clear = false) {
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.translate(this.left, this.top);

    const debug = true;
    if (debug) {
      this.ctx.globalCompositeOperation = 'difference';
      this.ctx.strokeStyle = "#ffffff33";
      this.ctx.beginPath();
      this.ctx.moveTo(0, -EDGE);
      this.ctx.lineTo(0, EDGE);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(-EDGE, 0);
      this.ctx.lineTo(EDGE, 0);
      this.ctx.stroke();
      this.ctx.globalCompositeOperation = 'source-over';
    }

    this.ctx.scale(this.scale, this.scale);

    if (clear) {
      return;
    }

    for (let [_, { canvas, position }] of this.artboards) {
      const x = -canvas.w * 0 + position[0];
      const y = -canvas.h * 0 + position[1];
      this.ctx.drawImage(canvas.canvas, x, y);
    }
  }

  clear() {
    this.draw(true);
  }

  reset() {
    this.artboards = new Map();
  }


  connectedCallback() {
    super.connectedCallback();
  
    this.listen(this.canvas, 'pointerdown', () => {
      this._mouseDown = true;
    });

    this.listen(window, 'pointerup', () => {
      this._mouseDown = false;
    });

    this.listen(window, 'pointermove', (e) => {
      console.log('move')

      if (!(e instanceof MouseEvent)) return;
      if (!this._mouseDown) return;

      if (this.mode === ViewportModes.PAN) {

        this.left += e.movementX;
        this.top += e.movementY;
        this.draw();

      } else if (this.mode === ViewportModes.BRUSH) {


        for (let [_, artboard] of this.artboards) {
          let x = e.offsetX - this.left - this.width / 2;
          x /= this.scale;
          x -= artboard.position[0];

          let y = e.offsetY - this.top - this.height / 2;
          y /= this.scale;
          y -= artboard.position[1];

          artboard.brushPoints.push([x, y]);
        }
        
        window.dispatchEvent(new CustomEvent('brush'));
        this.draw();
      }
    });

    this.listen(this.canvas, 'wheel', (e) => {
      if (!(e instanceof WheelEvent)) return;
      this.scale += e.deltaY / 1000;
      this.scale = Math.min(Math.max(0.1, this.scale), 20)
      this.draw();
    });
  }


  /**
   * Set the zoom multiplier.
   * @param {number} amt
   */ 
  zoom(amt) {
    this.scale += amt;
    this.draw();
  }


  /**
   * Pan the viewport
   * @param {number} x
   * @param {number} y
   */ 
  pan(x, y) {
    this.left += x;
    this.top += y;
    this.draw();
  }


  /**
   * @param {string} id
   */ 
  brushPoints(id) {
    return this.artboards.get(id)?.brushPoints ?? [];
  }


  /**
   * Add a canvas to the Viewport.
   * @param {Canvas} canvas
   * @param {number} x The x offset for canvas display.
   * @param {number} y The y offset for canvas display.
   */ 
  add(canvas, x = 0, y = 0) {
    const id = canvas.id;
    let artboard = this.artboards.get(id);
    if (artboard) {
      artboard.position = [x, y];
    } else {
      this.artboards.set(id, {
        canvas,
        position: [x, y],
        brushPoints: [],
      });
    }
  }


  /**
   * Set the viewport mode.
   * @param {ViewportMode | string} mode
   */ 
  setMode(mode) {
    if (!(mode in ViewportModes)) return;
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