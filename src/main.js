//@ts-check
import * as slop from "./lang/index.mjs";
import { Canvas, CanvasPool } from "./canvas.js";
import { CodeEditor } from "./components/code-editor/code-editor.js";
import { ViewportCanvas } from "./components/viewport-canvas/viewport-canvas.js";
// Import the the to-js compiler extensions.
import "./lang/extensions/to-js.mjs";



const imagesBySource = (window.imagesBySource = {});
const files = (window.files = []);

const pool = new CanvasPool();
window.pool = pool;

/**
 * @param {CodeEditor|null} editor
 * @param {ViewportCanvas|null} viewport
 */
function ctx(editor = null, viewport = null) {
  // Add lisp to the scope.
  const scope = Object.assign({}, slop.lib);

  if (editor) {

    Object.assign(scope, {
      print: (/** @type {any[]} */ ...items) => {
        items.forEach((item) => {
          return editor.print(slop.prettyPrint(item));
        });
        return items[items.length - 1];
      },
    });

    if (viewport) Object.assign(scope, { viewport });

    Object.assign(scope, {
      // Add the canvas stuff to the scope.
      "->canvas": (w, h) => pool.create(w, h),
      "make-canvas": (w, h) => pool.create(w, h),

      blend: (mode, a, b, alpha) => Canvas.blend(mode, a, b, alpha),

      // View a canvas.
      view: (canvas, x = (-canvas.w / 2), y = (-canvas.h / 2)) => {
        if (viewport) {
          viewport.add(canvas, x, y);
        }
      },

      // Open a canvas in a new tab.
      "open-new": (canvas) => {
        const url = canvas.canvas.toDataURL();
        fetch(url).then(async (res) => {
          const blob = await res.blob();
          const handle = URL.createObjectURL(blob);
          window.open(handle);
        });
        return canvas;
      },

      now: () => performance.now(),

      "@color": (x) => {
        return x;
      },

      "@slider": (x) => {
        return x;
      },

      "load-img": (url) => {
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
          window.dispatchEvent(new Event("image-load"));
        };
        img.onerror = (e) => {
          if (editor) editor.error("Img load error: " + url);
          console.error(e);
        };

        return new Canvas(1, 1);
      },

      files: files,

      "#JS": (str) => eval(str),
    });

    return new slop.Context(scope);
  }
}

const globals = new Set(slop.keywords);
for (let word of Object.keys(slop.lib)) {
  globals.add(word);
}
for (let word of Object.keys(slop.extensions)) {
  globals.add(word);
}

window.addEventListener("DOMContentLoaded", () => {
  const editor = /** @type {CodeEditor} */ (document.getElementById("editor"));
  const viewport = /** @type {ViewportCanvas} */ (document.getElementById("viewport"));

  const importer = document.getElementById("file-import");
  const opener = document.getElementById("file-open");

  // themes.applyTheme(themes.THEME, document.documentElement, editor, viewport);

  const evalAll = (useLog = true) => {
    pool.reset();
    viewport.clear();

    const src = editor.text;
    const env = ctx(editor, viewport);
    const { ok, tree, result, error, tokens } = slop.run(src, env);

    if (ok) {
      viewport.draw();
      if (useLog) editor.print(slop.prettyPrint(result));
    } else {
      editor.error(error);
      console.error(error);
    }
  };

  editor.setSyntax({
    tokenize: slop.tokenize,
    keywords: globals,
    comment: "#",
    tabSize: 2,
  });

  // Eval on control+enter
  editor.mapkey("meta+enter", () => evalAll(true));
  editor.mapkey("meta+e", () => evalAll(true));

  // Eval when an image reloads.
  window.addEventListener("image-load", () => evalAll(true));

  editor.mapkey("tab", () => editor.indent());
  editor.mapkey("shift+tab", () => editor.indent(true));
  editor.mapkey("meta+]", () => editor.indent());
  editor.mapkey("meta+[", () => editor.indent(true));
  editor.mapkey("meta+z", (e) => editor.undo(e), false);
  editor.mapkey("ctrl+-", () => editor.zoom(-0.1));
  editor.mapkey("ctrl+=", () => editor.zoom(+0.1));
  editor.mapkey("meta+s", () => editor.save("MAIN"));
  editor.mapkey("meta+k", () => editor.clearLog());
  editor.mapkey("meta+/", () => editor.comment());
  editor.mapkey("meta+i", () => importer?.click());
  editor.mapkey("meta+o", () => opener?.click());

  viewport.mapkey("ctrl+-", () => viewport.zoom(-0.1));
  viewport.mapkey("ctrl+=", () => viewport.zoom(+0.1));
  viewport.mapkey("ctrl+l", () => viewport.pan(+50, 0));
  viewport.mapkey("ctrl+h", () => viewport.pan(-50, 0));
  viewport.mapkey("ctrl+k", () => viewport.pan(0, -50));
  viewport.mapkey("ctrl+j", () => viewport.pan(0, 50));

  importer.addEventListener("change", (e) => {
    for (let file of e.target.files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = (e) => {
        const img = new Image();
        img.src = reader.result;
        editor.print("Loaded: " + file.name);
        imagesBySource[file.name] = img;
        files.push(file.name);
      };
    }
  });

  opener?.addEventListener("change", (e) => {
    for (let file of e.target.files) {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onloadend = (e) => {
        editor.source.value = reader.result;
        editor.update();
        editor.save("MAIN");
      };
    }
  });

  document.getElementById("save-text")?.addEventListener("click", () => {
    const blob = new Blob([editor.text], { type: "text/plain" });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create an anchor element
    const link = document.createElement("a");
    link.href = url;
    link.download = "script.slop";

    link.click();
  });

  let lastChange = Date.now();
  const threshTime = 60;

  editor.listen(editor, "mousemove", (event) => {
    let e = /** @type {MouseEvent} */ (event);
    if (e.metaKey) {
      const [token, index] = editor.tokenAt(editor.caretPosition);

      if (token?.type === slop.SlopToken.enum.NUM) {
        const n = Date.now();
        const update = n - lastChange > threshTime;
        if (update) {
          lastChange = n;
          evalAll(false);
        }

        let delta = e.movementX;

        if (e.shiftKey) {
          delta /= 100;
        }

        let newVal = token.val + delta;
        if (newVal.toString().split(".")[1]?.length > 4) {
          newVal = newVal.toFixed(4);
        }

        editor.replaceToken(index, newVal, update, true);
      }
    }
  });

  window.addEventListener("brush", () => {
    evalAll(false);
  });

  editor.load("MAIN");
});
