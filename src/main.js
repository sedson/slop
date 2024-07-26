import { tokenize, Context, run, keywords, lib } from "./lang/index.mjs";
import { highlight } from './highlight.js';
import { format } from "./utils.js";
import { Cnvs } from './cnvs.js';
import * as themes from './themes.js';


function applyTheme(theme, ...objects) {
  for (let [name, color] of Object.entries(theme)) {
    for (let obj of objects) {
      obj.style.setProperty('--' + name, color);
    }
  }
}

const imagesBySource = window.imagesBySource = {};
const files = window.files = [];


const THEME = themes.cooldark;


function ctx(editor = null, viewport = null) {
  const scope = Object.assign({}, lib);

  if (editor) {
    Object.assign(scope, {
      print: (...items) => {
        items.forEach((item) => editor.print(format(item)));
        return items[items.length - 1];
      },
    });

    if (viewport) scope.viewport = viewport;

    Object.assign(scope, {
      canvas: (width, height, label) => {
        return new Cnvs(width, height, label);
      },

      'make-canvas': (width, height, label) => {
        return new Cnvs(width, height, label);
      },

      Canvas: Cnvs,
      '->Canvas': (...args) => new Cnvs(...args),

      view: (canvas, x = 0, y = 0) => {
        if (viewport) {
          viewport.artboards.push({
            canvas: canvas.canvas,
            position: [x, y]
          })
        }
      },

      'open-new': (canvas) => {
        const url = canvas.canvas.toDataURL();
        fetch(url).then(async res => {
          const blob = await res.blob();
          const handle = URL.createObjectURL(blob);
          window.open(handle);
        })
        return canvas;
      },

      ui: {
        color: () => {}
      },

      now: () => performance.now(),

      blend: (mode, a, b, alpha) => Cnvs.blend(mode, a, b, alpha),

      '@color': (x) => {
        return x;
      },

      '@slider': (x) => {
        return x;
      },

      'load-img': (url) => {
        if (imagesBySource[url]) {
          const img = imagesBySource[url];
          const cnvs = new Cnvs(img.width, img.height);
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

        return new Cnvs(1, 1);
      },

      files: files,

      '#JS': (str) => eval(str),
    })

    return new Context(scope);
  }
}

const globals = new Set(keywords);
for (let word of Object.keys(lib)) {
  globals.add(word);
}

window.addEventListener('DOMContentLoaded', () => {
  const editor = window.editor = document.getElementById('editor');
  const viewport = window.viewport = document.getElementById('viewport');
  const importer = document.getElementById('file-import');

  applyTheme(THEME, document.documentElement, editor, viewport);

  const evalAll = () => {
    const src = editor.sourceString;
    const env = ctx(editor, viewport);
    const { ok, tree, result, error, tokens } = run(src, env);
    if (ok) {
      editor.print(format(result));
    } else {
      editor.error(error);
      console.error(error);
    }
  }


  // Update syntax on keystrokes.
  editor.oninput(() => {
    const src = editor.sourceString;
    const tokens = tokenize(src);
    const highlighted = highlight(src, tokens, globals, editor.currentLine, editor.selection);
    editor.setHighlight(highlighted);
  });

  // Eval on control+enter
  editor.mapkey('ctrl+enter', evalAll);
  window.addEventListener('image-load', evalAll);



  editor.mapkey('tab', () => editor.indent());
  editor.mapkey('shift+tab', () => editor.indent(true));
  editor.mapkey('meta+z', (e) => editor.undo(e), false);
  editor.mapkey('ctrl+-', () => editor.zoom(-0.1));
  editor.mapkey('ctrl+=', () => editor.zoom(+0.1));
  editor.mapkey('meta+s', () => {
    editor.source.value = editor.sourceString;
    editor.save('MAIN');
  });

  editor.mapkey('ctrl+i', () => importer.click());
  editor.mapkey('ctrl+c', () => editor.clearLog());

  viewport.mapkey('ctrl+-', () => viewport.zoom(-0.1));
  viewport.mapkey('ctrl+=', () => viewport.zoom(+0.1));
  viewport.mapkey('ctrl+l', () => viewport.pan(50, 0));
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