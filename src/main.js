import { tokenize, Context, run, keywords, lib } from "./lang/index.mjs";
import { highlight } from './highlight.js';
import { format } from "./utils.js";
import { Cnvs } from './cnvs.js';

function ctx(editor = null) {
  const scope = Object.assign({}, lib);

  if (editor) {
    Object.assign(scope, {
      print: item => editor.print(format(item))
    });
  }

  Object.assign(scope, {
    canvas: (width, height) => {
      return new Cnvs(width, height);
    },

    view: (canvas) => {
      let ab = document.querySelector('.artboard');
      console.log(ab)
      if (ab) {
        ab.append(canvas.canvas);
      }
    },

    ui: {
      color: () => {}
    }
  })

  return new Context(scope);
}


keywords.push(...Object.keys(lib));

window.addEventListener('DOMContentLoaded', () => {

  const editor = window.editor = document.getElementById('editor');

  editor.oninput(() => {
    const src = editor.sourceString;
    const tokens = tokenize(src);
    const highlighted = highlight(src, tokens, keywords);
    editor.display.innerHTML = highlighted;
  });

  editor.mapkey('ctrl+enter', () => {
    const src = editor.sourceString;
    const { ok, tree, result, error } = run(src, ctx(editor));
    if (ok) {
      editor.print(format(result));
    } else {
      editor.error(error);
    }
  });

  editor.mapkey('tab', () => {
    editor.indent();
  });

  editor.mapkey('shift+tab', () => {
    editor.indent(true)
  });

  editor.mapkey('meta+s', () => editor.save('MAIN'));

  editor.mapkey('meta+z', (e) => editor.undo(e), false);

  editor.load('MAIN');
});