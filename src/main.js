import { tokenize, Context, run, keywords, lib } from "./lang/index.mjs";
import { highlight } from './highlight.js';
import { format } from "./utils.js";
import { Cnvs } from './cnvs.js';


function ctx(editor = null, viewport = null) {
  const scope = Object.assign({}, lib);

  if (editor) {
    Object.assign(scope, {
      print: item => editor.print(format(item)),
    });
  }

  if (viewport) scope.viewport = viewport;

  Object.assign(scope, {
    canvas: (width, height, label) => {
      return new Cnvs(width, height, label);
    },

    'make-canvas': (width, height, label) => {
      return new Cnvs(width, height, label);
    },

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
  })

  return new Context(scope);
}

const globals = new Set(keywords);
for (let word of Object.keys(lib)) {
  globals.add(word);
}

window.addEventListener('DOMContentLoaded', () => {
  const editor = window.editor = document.getElementById('editor');
  const viewport = window.viewport = document.getElementById('viewport');

  // Update syntax on keystrokes.
  editor.oninput(() => {
    const src = editor.sourceString;
    const tokens = tokenize(src);
    const highlighted = highlight(src, tokens, globals, editor.currentLine, editor.selection);
    editor.setHighlight(highlighted);
  });

  // Eval on control+enter
  editor.mapkey('ctrl+enter', () => {
    const src = editor.sourceString;
    const { ok, tree, result, error } = run(src, ctx(editor, viewport));
    console.log(tree);
    if (ok) {
      editor.print(format(result));
    } else {
      editor.error(error);
    }
  });

  editor.mapkey('tab', () => editor.indent());
  editor.mapkey('shift+tab', () => editor.indent(true));
  editor.mapkey('meta+z', (e) => editor.undo(e), false);
  editor.mapkey('ctrl+-', () => editor.zoom(-0.1));
  editor.mapkey('ctrl+=', () => editor.zoom(+0.1));
  editor.mapkey('meta+s', () => {
    editor.source.value = editor.sourceString;
    editor.save('MAIN');
  });

  viewport.mapkey('ctrl+-', () => viewport.zoom(-0.1));
  viewport.mapkey('ctrl+=', () => viewport.zoom(+0.1));
  viewport.mapkey('ctrl+l', () => viewport.pan(50, 0));
  viewport.mapkey('ctrl+h', () => viewport.pan(-50, 0));
  viewport.mapkey('ctrl+k', () => viewport.pan(0, -50));
  viewport.mapkey('ctrl+j', () => viewport.pan(0, 50));

  editor.load('MAIN');
});