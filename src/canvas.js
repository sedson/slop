// @ts-check
/**
 * @file Canvas wrapper utility.
 */
import { uuid } from "./uuid.js";


/** */
export const BlendModes = {
  default: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  hardlight: 'hard-light',
  softlight: 'soft-light',
  colorburn: 'color-burn',
  colordodge: 'dolor-dodge',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity'
};


/**
 * @param {HTMLCanvasElement} canvas
 * @returns {CanvasRenderingContext2D}
 */
function getContext(canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('Canvas context "2d" was null');
  }
  return ctx;
}


export class Canvas {
  
  /**
   * Create a new canvas. 
   * @param {number} width The width
   * @param {number} height The height
   */ 
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.id = uuid();

    this.canvas = document.createElement('canvas');

    /** @type {CanvasRenderingContext2D} */
    this.ctx = getContext(this.canvas);
    
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.filterString = '';
  }

  get w () {return this.width};
  get h() { return this.height };


  iteratePixels(fn) {
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = fn(...pixels.slice(i, i + 4));
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  mapPixels(fn) {
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = fn(pixels.slice(i, i + 4));
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  static blend(mode, a, b, alpha = 1) {
    console.log(mode, a, b, alpha)
    if (!BlendModes[mode]) {
      throw new Error('no blend mode: ' + mode);
    }

    const w = Math.max(a.w, b.w);
    const h = Math.max(a.h, b.h);

    const newCanvas = new Canvas(w, h);
    newCanvas.img(a, 0, 0);
    newCanvas.blend(BlendModes[mode]);
    newCanvas.alpha(alpha);
    newCanvas.img(b, 0, 0);
    return newCanvas;
  }

  static new(w, h, label) {
    return new Canvas(w, h, label);
  }

  rect(x, y, w, h, col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(x, y, w, h);
    return this;
  }

  fill(col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(0, 0, this.width, this.height);
    return this;
  }

  ellipse(x, y, rx, ry, col) {
    this.ctx.fillStyle = col;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    return this;
  }

  ellipseStroke(x, y, rx, ry, col, width = 1) {
    this.ctx.strokeStyle = col;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
    this.ctx.stroke();
    return this;
  }

  img(img, x, y, rot = 0) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rot * Math.PI / 180);
    this.ctx.drawImage(img.canvas, x, y, img.canvas.width, img.canvas.height);
    this.ctx.restore();
    return this;
  }

  blend(mode) {
    this.ctx.globalCompositeOperation = mode;
    return this;
  }

  alpha(a) {
    this.ctx.globalAlpha = a;
    return this;
  }

  reset() {
    this.ctx.globalCompositeOperation = BlendModes.default;
    this.ctx.globalAlpha = 1.0
    return this;
  }

  noise(strength = 10, mono = false) {
    const noise = (r, g, b, a) => {
      if (mono) {
        const rand = Math.round(Math.random() * 2 * strength - strength);
        return [r + rand, g + rand, b + rand, a];
      }

      const randR = Math.round(Math.random() * 2 * strength - strength);
      const randG = Math.round(Math.random() * 2 * strength - strength);
      const randB = Math.round(Math.random() * 2 * strength - strength);
      return [r + randR, g + randG, b + randB, a];
    }

    this.iteratePixels(noise);
    return this;
  }

  threshold(val = 128) {
    const thresh = (r, g, b, a) => {
      const avg = (r + g + b) / 3;
      const v = avg > val ? 255 : 0;
      return [v, v, v, a];
    }
    this.iteratePixels(thresh);
    return this;
  }

  line(x1, y1, x2, y2, color, width = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    return this;
  }


  blur(px = 1) {
    this.ctx.filter = `blur(${px}px)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = '';
    return this;
  }

  contrast(amount = 0) {
    this.ctx.filter = `contrast(${amount * 100}%)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = '';
    return this;
  }

  grayscale(amount = 0) {
    this.ctx.filter = `grayscale(${amount * 100}%)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = '';
    return this;
  }

  brightness(amount = 0) {
    this.ctx.filter = `brightness(${amount * 100}%)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = '';
    return this;
  }

  _customFormat() {
    return `CANVAS [ ${this.width} by ${this.height} ]`;
  }

  clear() {
    console.log('CLEAR', this.id, this.width);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w; 
    this.height = h;
    this.clear();
  }
}


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
        canvas.resize(w , h);
      }
      
      this.#index += 1;
      canvas.clear();
      return canvas;

    } else {

      const canvas = Canvas.new(w, h, uuid(6));
      this.#canvases.push(canvas)
      this.#index += 1;
      return canvas;

    }
  }

  reset() {
    this.#index = 0;
  }
}
