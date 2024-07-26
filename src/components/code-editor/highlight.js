/**
 * @file Logic for syntax highlighting.
 */

/**
 * Create a span
 * @param {string} innerText
 * @param {string} classList
 * @return {HTMLElement}
 */
const span = (innerText, classList) => {
  return Object.assign(document.createElement('span'), { innerText, classList });
}

/**
 * Fill a string with something.
 * @param {number} n The number of something.
 * @param {string} str The something.
 * @return {string} str repeated n times.
 */
const pad = (n, str) => new Array(n + 1).join(str);

/**
 * Make a string of spaces of length n.
 * @param {number} n The length of string to generate.
 */
const space = (n) => pad(n, ' ');

const countLinebreaks = (str) => str.split('\n').length;


/**
 * Generate some highlight-wrapped HTML from some source code, a list of 
 * generated tokens, and a set of keywords.
 * @param {string} sourceString
 * @param {Token[]} tokens
 * @param {Set<String>} keywords
 * @return {HTMLElement[]}
 */
export function highlight(sourceString, tokens, keywords) {
  const lines = [];

  let lineNumber = 0;
  let currentLine = span('', 'line');

  if (sourceString.length === 0 || tokens.length === 0) return '';

  // Add front padding to the highlighted line.
  currentLine.append(space(tokens[0].range[0]));

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'eof') continue;

    if (token.line !== lineNumber) {
      lines.push(currentLine);
      let linebreaks = 0;

      while (lineNumber < token.line - 1) {
        lineNumber += 1;
        linebreaks += 1;
        lines.push(span(' ', 'line'));
      }

      lineNumber += 1;
      linebreaks += 1;

      currentLine = span('', 'line');
      const spaceToStart = token.range[0] - (tokens[i - 1]?.range[1] ?? 0) - linebreaks;
      currentLine.append(space(spaceToStart));
    }

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

  lines.push(currentLine);

  while (lines.length < countLinebreaks(sourceString)) {
    lines.push(span('', 'line'));
  }
  return lines;
}