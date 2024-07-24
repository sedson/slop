/**
 * @file Canvas wrapper utility.
 */

import { BlendModes } from './constants.js';

export class Cnvs {
  constructor(w, h, label) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
  }

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

  static blend(mode, a, b, alpha = 1) {
    console.log(mode, a, b, alpha)
    if (!BlendModes[mode]) {
      throw new Error('no blend mode: ', mode);
    }

    const w = Math.max(a.w, b.w);
    const h = Math.max(a.h, b.h);

    const newCanvas = new Cnvs(w, h);
    newCanvas.img(a, 0, 0);
    newCanvas.blend(BlendModes[mode]);
    newCanvas.alpha(alpha);
    newCanvas.img(b, 0, 0);
    return newCanvas;
  }

  static new(w, h, label) {
    return new Cnvs(w, h, label);
  }

  rect(x, y, w, h, col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(x, y, w, h);
    return this;
  }

  fill(col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(0, 0, this.w, this.h);
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

  line(x1, y1, x2, y2, color, width = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
  }

  _customFormat() {
    return `CANVAS [ ${this.w} by ${this.h} ]`;
  }
}