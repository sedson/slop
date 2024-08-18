import { lib } from "./index.mjs";

const lang = await import("./index.mjs");
const toJS = await import("./extensions/to-js.mjs");
const { Test } = await import("./test.mjs");

const test = (src, ctx = {}) => {
  try {
    const { tokens, tree } = lang.read(src);
    let res = null;
    const context = new lang.Context(ctx);
    for (let expr of tree) {
      res = lang.interpret(expr, context);
    }
    return res;
  } catch (err) {
    return null;
  }
};

Test("Basics", (assert) => {
  assert.equal(test(""), undefined, "Empty string -> null");
  assert.equal(test("10"), 10, "Integer atom");
  assert.equal(test('"lang"'), "lang", "String atom");
  assert.equal(test("(list 10)"), [10], "1 elem list");
  assert.equal(test("(list 10 60 30)"), [10, 60, 30], "3 elem list");
  assert.equal(test("(list 20) (list 60)"), [60], "2 lists");
  assert.equal(test("(0- sa"), undefined, "Syntax error -> null");
});


Test("Lambdas", (assert) => {
  let src;

  src = `(fn [x] x)`;
  const type = typeof test(src);
  assert.equal(type, "function", "Lambda returns js function");

  src = `((fn [x] x) 10)`;
  assert.equal(test(src), 10, "Immediately invoked identity lambda");
});


Test("Define", (assert) => {
  let src;

  src = `(def a 10)`;
  assert.equal(test(src), 10, "Define numeric constant: returns val");

  src = `(def a 10) (def b 20) a`;
  assert.equal(test(src), 10, "Lookup numeric constant");

  src = `(def a 10) (def b 20) (list a b)`;
  assert.equal(test(src), [10, 20], "Lookup 2 numeric constants");

  src = `(def i (fn [x] (list x))) (i "yo")`;
  assert.equal(test(src), ["yo"], "Identity lambda - as list");

  src = `(def i (fn [x] x)) (i 5)`;
  assert.equal(test(src), 5, "Identity lambda - no list");

  src = `(defn concat [x] (list x x)) (concat 30)`;
  assert.equal(test(src), [30, 30], "Defn syntax sugar");
});

Test("Js funcs in global scope", (assert) => {
  let src, context;
  context = {
    sum: (...list) => list.reduce((a, b) => a + b, 0),
  };

  assert.equal(context.sum(1, 2), 3, "Js sum");

  src = `(sum 1 2 3 4)`;
  assert.equal(test(src, context), 10, "Js sum in lisp");
});

Test("Core: if", (assert) => {
  let src;

  src = `(if true 8 0)`;
  assert.equal(test(src), 8, "If with 1 : pass clause");

  src = `(if false 8 0)`;
  assert.equal(test(src), 0, "If with 1 : fail clause");

  src = `(if false 8)`;
  assert.equal(test(src), null, "Malformed if");
});

Test("Core: let", (assert) => {
  let src;

  src = `(let [(foo "bar")] foo)`;
  assert.equal(test(src), "bar", "basic let");

  src = `(let [(a "A") (b "B")] (list a b))`;
  assert.equal(test(src), ["A", "B"], "multi-binding let");
});

Test("Core: cond", (assert) => {
  let src;

  src = `(cond (true "true") (false "false"))`;
  assert.equal(test(src), "true", "basic cond");

  src = `(cond (true "true") (true "also true"))`;
  assert.equal(test(src), "true", "cond returns first `true` result");

  src = `(cond (false "false"))`;
  assert.equal(test(src), undefined, "cond returns nil on no match");

  src = `(cond (false "false") (else "else"))`;
  assert.equal(test(src), "else", "cond supports `else` branch");
});

Test("Core: quote", (assert) => {
  let src;

  src = `(quote 1 2)`;
  assert.equal(test(src), null, "invalid quote");

  src = `(def foo 1) (quote foo)`;
  assert.equal(test(src), "foo", "valid quote");
});

Test("Core: eval", (assert) => {
  let src;

  const context = {
    "+": (a, b) => a + b,
  };
  const _test = (expr) => test(expr, context);

  src = `(eval (quote (+ 1 2)))`;
  assert.equal(_test(src), 3, "eval with quote");

  src = `(let [(dbl (fn [x] (+ x x)))] (eval (quote (dbl 2))))`;
  assert.equal(_test(src), 4, "eval with quote and binding");
});

Test("Funcs as params", (assert) => {
  let src, context;

  context = {
    join: (...list) => list.join(""),
  };

  src = `
    (defn greet (greeting)
       (fn (name) (join greeting " " name)))

    ((greet "hey") "there")
  `.trim();

  assert.equal(test(src, context), "hey there", "Function as param");
});


Test("Types", (assert) => {
  const context = {
    "+": (a, b) => a + b,
  };

  function typeCheck(output, type, message) {
    assert.equal(output, lang.SlopType.enum[type], message);
  }

  typeCheck(test("(type nil)"), "NIL", "nil -> nil");
  typeCheck(test("(type ())"), "NIL", "() -> nil");
  typeCheck(test("(type 1)"), "NUM", "num");
  typeCheck(test('(type "h")'), "STR", "str");
  typeCheck(test("(type (+ 1 2))", context), "NUM", "function -> num");
  typeCheck(test("(type {:a 1})"), "DICT", "dict literal");
  typeCheck(test("(type {})"), "DICT", "dict literal empty");
  typeCheck(test("(type (list))"), "LIST", "empty list with (list)");
  typeCheck(test("(type (list 1 2 3))"), "LIST", "list literal");
  typeCheck(test("(type :a)"), "KEY", "key");
  typeCheck(test("(type :a-b)"),"KEY","key with dash");
  typeCheck(test("(type (fn (x) x))"), "FUNC", "lambda");
  typeCheck(test("(type [])"), "VEC", "empty vec");
  typeCheck(test("(type [1])"), "VEC", "vec literal");
});

Test("toJS string-based compile", (assert) => {
  const exprs = [
    {
      lisp: "(+ 1 2)",
      js: "(1 + 2)",
    },
    {
      lisp: "(+ (* 4 3 2) (/ 6 10 2))",
      js: "((4 * 3 * 2) + (6 / 10 / 2))",
    },
    {
      lisp: '(if (>= 4 0) "cool" 0)',
      js: '((4 >= 0) ? "cool" : 0)',
    },
    {
      lisp: "(min x y z)",
      js: "Math.min(x, y, z)",
    },
    {
      lisp: "(1 2 3 4 5)",
      js: "[1, 2, 3, 4, 5]",
    },
  ];

  for (let expr of exprs) {
    const tree = lang.parse(lang.tokenize(expr.lisp));
    const js = toJS.toJS(tree[0]);
    assert.equal(js, expr.js, `LISP => ${expr.lisp}\n  JS   => ${js}\n`);
  }
});