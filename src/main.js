import * as lisp from "./lang/index.mjs";
import * as themes from './themes.js';
import { format } from "./utils.js";
import { Canvas } from './canvas.js';

const THEME = themes.light;

const imagesBySource = window.imagesBySource = {};
const files = window.files = [];

function ctx(editor = null, viewport = null) {

  // Add lisp to the scope.
  const scope = Object.assign({}, lisp.lib);

  if (editor) {

    // Add lisp to the scope.
    Object.assign(scope, {
      print: (...items) => {
        items.forEach((item) => editor.print(format(item)));
        return items[items.length - 1];
      },
    });

    if (viewport) scope.viewport = viewport;

    Object.assign(scope, {

      // Add the canvas stuff to the scope.
      Canvas: Canvas,
      '->Canvas': (...args) => new Canvas(...args),
      'make-canvas': (width, height, label) => {
        return new Canvas(width, height, label);
      },

      blend: (mode, a, b, alpha) => Canvas.blend(mode, a, b, alpha),

      // View a canvas.
      view: (canvas, x = 0, y = 0) => {
        if (viewport) {
          viewport.artboards.push({
            canvas: canvas.canvas,
            position: [x, y]
          })
        }
      },

      // Open a canvas in a new tab.
      'open-new': (canvas) => {
        const url = canvas.canvas.toDataURL();
        fetch(url).then(async res => {
          const blob = await res.blob();
          const handle = URL.createObjectURL(blob);
          window.open(handle);
        })
        return canvas;
      },


      now: () => performance.now(),



      '@color': (x) => {
        return x;
      },

      '@slider': (x) => {
        return x;
      },

      'load-img': (url) => {
        if (imagesBySource[url]) {
          const img = imagesBySource[url];
          const cnvs = new Canvas(img.width, img.height);
          cnvs.ctx.drawImage(img, 0, 0);
          return cnvs;
        }

        const img = new Image();
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          imagesBySource[url] = img;
          window.dispatchEvent(new Event('image-load'));
        }
        img.onerror = (e) => {
          if (editor) editor.error('Img load error: ' + url);
          console.error(e)
        }

        return new Canvas(1, 1);
      },

      files: files,

      '#JS': (str) => eval(str),
    })

    return new lisp.Context(scope);
  }
}

const globals = new Set(lisp.keywords);
for (let word of Object.keys(lisp.lib)) {
  globals.add(word);
}

window.addEventListener('DOMContentLoaded', () => {

  const editor = window.editor = document.getElementById('editor');
  const viewport = window.viewport = document.getElementById('viewport');
  const importer = document.getElementById('file-import');

  themes.applyTheme(THEME, document.documentElement, editor, viewport);

  const evalAll = () => {
    const src = editor.text;
    const env = ctx(editor, viewport);
    const { ok, tree, result, error, tokens } = lisp.run(src, env);
    console.log(tree);
    if (ok) {
      editor.print(format(result));
    } else {
      editor.error(error);
      console.error(error);
    }
  }

  editor.setSyntax({
    tokenize: lisp.tokenize,
    keywords: globals,
    comment: '#',
    tabSize: 2,
  });

  // Eval on control+enter
  editor.mapkey('ctrl+enter', evalAll);

  // Eval when an imahge reloads.
  window.addEventListener('image-load', evalAll);

  editor.mapkey('tab', () => editor.indent());
  editor.mapkey('shift+tab', () => editor.indent(true));
  editor.mapkey('meta+z', (e) => editor.undo(e), false);
  editor.mapkey('ctrl+-', () => editor.zoom(-0.1));
  editor.mapkey('ctrl+=', () => editor.zoom(+0.1));
  editor.mapkey('meta+s', () => editor.save('MAIN'));
  editor.mapkey('ctrl+c', () => editor.clearLog());
  editor.mapkey('meta+/', () => editor.comment());
  editor.mapkey('ctrl+i', () => importer.click());

  viewport.mapkey('ctrl+-', () => viewport.zoom(-0.1));
  viewport.mapkey('ctrl+=', () => viewport.zoom(+0.1));
  viewport.mapkey('ctrl+l', () => viewport.pan(+50, 0));
  viewport.mapkey('ctrl+h', () => viewport.pan(-50, 0));
  viewport.mapkey('ctrl+k', () => viewport.pan(0, -50));
  viewport.mapkey('ctrl+j', () => viewport.pan(0, 50));

  importer.addEventListener('change', e => {
    for (let file of e.target.files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = e => {
        const img = new Image();
        img.src = reader.result;
        editor.print('Loaded: ' + file.name);
        imagesBySource[file.name] = img;
        files.push(file.name);
      };
    }
  });

  editor.load('MAIN');
});