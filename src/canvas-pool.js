import { Canvas } from "./canvas.js";
/**
 * A pool of a canvases. When drawing the 
 */
export class CanvasPool {
  /** @type {Canvas[]} */
  #canvases = [];

  #index = 0;

  /**
   * Create a new canvas and add it to the pool.
   * @param {number} w The width
   * @param {number} h The height
   * @returns {Canvas}
   */
  create(w, h) {
    if (this.#index < this.#canvases.length) {

      const canvas = this.#canvases[this.#index];
      if (w !== canvas.width || h !== canvas.height) {
        canvas.resize(w, h);
      }

      this.#index += 1;
      canvas.clear();
      return canvas;

    } else {

      const canvas = new Canvas(w, h);
      this.#canvases.push(canvas)
      this.#index += 1;
      return canvas;

    }
  }

  reset() {
    this.#index = 0;
  }
}
