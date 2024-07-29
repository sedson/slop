const lang = await import('./tiny-lisp.mjs');
const { Test } = await import('./test.mjs');

const test = (src, ctx = {}) => {
  try {
    const { tokens, tree } = lang.parse(src);
    let res = null;
    const context = new lang.Context(ctx);
    for (let expr of tree) {
      res = lang.interpret(expr, context);
    }
    return res;
  } catch {
    return null;
  }
}


Test('Basics', (assert) => {
  assert.equal(test(''), null, 'Empty string -> null');
  assert.equal(test('10'), 10, 'Integer atom');
  assert.equal(test('"lang"'), "lang", 'String atom');
  assert.equal(test('(10)'), [10], '1 elem list');
  assert.equal(test('(10 60 30)'), [10, 60, 30], '3 elem list');
  assert.equal(test('(20) (60)'), [60], '2 lists');
  assert.equal(test('(0- sa'), null, 'Syntax error -> null');
});


Test('Lambdas', (assert) => {
  let src;
  
  src = `(fn (x) x)`;
  const type = typeof test(src);
  assert.equal(type, 'function', 'Lambda returns js function');

  src = `((fn (x) x) 10)`;
  assert.equal(test(src), 10, 'Immediately invoked identity lambda');
});


Test('Define', (assert) => {
  let src;

  src = `(def a 10)`;
  assert.equal(test(src), 10, 'Define numeric constant: returns val');
  
  src = `(def a 10) (def b 20) a`
  assert.equal(test(src), 10, 'Lookup numeric constant');

  src = `(def a 10) (def b 20) (a b)`
  assert.equal(test(src), [10, 20], 'Lookup 2 numeric constants');

  src = `(def i (fn (x) (x))) (i "yo")`;
  assert.equal(test(src), ["yo"], 'Identity lambda - as list');

  src = `(def i (fn (x) x)) (i 5)`;
  assert.equal(test(src), 5, 'Identity lambda - no list');

  src = `(defn concat (x) (x x)) (concat 30)`;
  assert.equal(test(src), [30, 30], 'Defn syntax sugar');
});


Test('Js funcs in global scope', (assert) => {
  let src, context;
  context = {
    sum: (...list) => list.reduce((a, b) => a + b, 0)
  };
  
  assert.equal(context.sum(1, 2), 3, 'Js sum');

  src = `(sum 1 2 3 4)`;
  assert.equal(test(src, context), 10, 'Js sum in lisp');
});


Test('Core: if', (assert) => {
  let src;

  src = `(if true 8 0)`;
  assert.equal(test(src), 8, 'If with 1 : pass clause');

  src = `(if false 8 0)`;
  assert.equal(test(src), 0, 'If with 1 : fail clause');

  src = `(if false 8)`;
  assert.equal(test(src), null, 'Malformed if');
});


Test('Funcs as params', (assert) => {
  let src, context;

  context = {
    join: (...list) => list.join('')
  };

  src = `
    (defn greet (greeting) 
       (fn (name) (join greeting " " name)))

    ((greet "hey") "there")
  `.trim();
  
  assert.equal(test(src, context), 'hey there', 'Function as param');
});


Test('toJS string-based compile', (assert) => {
  const exprs = [
    {
      lisp: '(+ 1 2)',
      js: '(1 + 2)'
    },
    {
      lisp: '(+ (* 4 3 2) (/ 6 10 2))',
      js: '((4 * 3 * 2) + (6 / 10 / 2))'
    },
    {
      lisp: '(if (>= 4 0) "cool" 0)',
      js: '((4 >= 0) ? "cool" : 0)',
    }, 
    {
      lisp: '(min x y z)',
      js: 'Math.min(x, y, z)'
    }, 
    {
      lisp: '(1 2 3 4 5)',
      js: '[1, 2, 3, 4, 5]'
    }
  ];

  for (let expr of exprs) {
    const tree = lang.ast(lang.tokenize(expr.lisp));
    const js = lang.toJS(tree[0]);
    assert.equal(js, expr.js, `LISP => ${expr.lisp}\n  JS   => ${js}\n`);
  }
});