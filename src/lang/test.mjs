/**
 * @file Tests.
 */

function _equal(a, b) {
  if (Array.isArray(a)) return _arrayEqual(a, b);
  return a == b;
}

function _arrayEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!_equal(a[i], b[i])) return false;
  }
  return true;
}

const ansi = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
};

function fail(msg) {
  if (typeof process === "object") {
    console.log(ansi.red + msg + ansi.reset);
  } else {
    console.log("%c" + msg, "color: red");
  }
}

function pass(msg) {
  if (typeof process === "object") {
    console.log(ansi.green + msg + ansi.reset);
  } else {
    console.log("%c" + msg, "color: green");
  }
}

const assert = {
  equal: function (got, expected, message) {
    if (!_equal(got, expected)) {
      fail(`𐄂 ${message}\n\tGot: ${got}\n\tExpected: ${expected}`);
      return;
    }
    pass("✓ " + message);
  },
};

export function Test(desc, fn) {
  console.log("\nTest Unit:", desc);
  fn(assert);
}
