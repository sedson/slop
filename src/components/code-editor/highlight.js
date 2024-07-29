/**
 * @file Syntax highlighting for the code editor.
 */
import * as stringTools from './string-tools.js';


/**
 * Create a span
 * @param {string} innerText
 * @param {string} classList
 * @return {HTMLElement}
 */
function span(innerText, classList) {
  return Object.assign(document.createElement('span'), { innerText, classList });
}


/**
 * Get an n-long string full of spaces.
 * @param {number} n
 * @return {string}
 */
function space(n) {
  return stringTools.fillString(n, ' ');
}


/**
 * Generate some highlight-wrapped HTML from some source code, a list of 
 * generated tokens, and a set of keywords.
 * @param {string} sourceString
 * @param {Token[]} tokens
 * @param {Set<String>} keywords
 * @return {HTMLElement[]}
 */
export function highlight(sourceString, tokens, keywords) {
  const outputLines = [];
  let lineNumber = 0;
  let currentLine = span('', 'line');

  // Add front padding to the first line.
  currentLine.append(space(tokens[0].range[0]));

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'eof') continue;

    // Make a new line.
    if (token.line !== lineNumber) {
      outputLines.push(currentLine);

      while (lineNumber < token.line - 1) {
        outputLines.push(span('', 'line'));
        lineNumber += 1;
      }
      lineNumber += 1;

      currentLine = span('', 'line');

      // Search backwards for a line break.
      const prevLineBreak = sourceString.lastIndexOf('\n', token.range[0]);

      // Fill new line with leading space.
      currentLine.append(space(token.range[0] - prevLineBreak - 1));
    }

    // Make a syntax highlighted span for the token.
    const tokenSpan = span(sourceString.substring(...token.range), token.type);

    if (token.depth !== undefined) {
      tokenSpan.classList.add(`depth-${token.depth % 5}`);
    }

    if (keywords.has(token.str)) {
      tokenSpan.classList.add('keyword');
    }

    if (token.subpath && token.subpath.length) {
      tokenSpan.classList.add('dynamic');
    }

    currentLine.append(tokenSpan);

    if (tokens[i + 1].type === 'eof') continue;

    const spaceToNext = tokens[i + 1].range[0] - token.range[1];
    currentLine.append(space(spaceToNext));
  }

  outputLines.push(currentLine);

  while (outputLines.length < stringTools.countLinebreaks(sourceString)) {
    outputLines.push(span('', 'line'));
  }
  return outputLines;
}