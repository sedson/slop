import * as slop from "./src/lang/index.mjs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({input,  output});

const context = new slop.Context(slop.lib);

const ansi = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
};

function error(msg) {
  console.log(ansi.red + msg + ansi.reset);
}

while (true) {
  const line = await rl.question("SLOP > ");
  try {
    const tokens = slop.tokenize(line);
    const tree = slop.parse(tokens);
    const res = tree.reduce((_, expr) => {
      return slop.interpret(expr, context);
    }, undefined);
    context.set('$', res);
    console.log(slop.prettyPrint(res));
  } catch (e) {
    error(e.message);
  }
}
