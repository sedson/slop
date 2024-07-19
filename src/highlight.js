const span = (text, c) => {
  const s = document.createElement('span');
  s.innerText = text;
  s.classList = c;
  return s;
}

const pad = (n, str) => new Array(n + 1).join(str);
const space = (n) => pad(n, ' ');

const countLinebreaks = (str) => {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') count += 1;
  }
  return count;
}


/**
 * From some source code, a list of gererated tokens, and a list of keywords.
 * @param {string} sourceString
 * @param {array<Token>} tokens
 * @param {Set<String>} keywords
 * @param {number} caretLine
 * @param {array<number>} selection
 * @return {Array<HTMLElement}
 */
export function highlight(sourceString, tokens, keywords, caretLine, selection) {
  // track the line number
  let lineNo = 0;

  // line array
  const lines = [];

  // the current line
  let currentLine = span('', 'line');

  if (sourceString.length === 0 || tokens.length === 0) {
    return '';
  }

  const leadingSpace = tokens[0].range[0];
  currentLine.append(space(leadingSpace));

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'eof') {
      const spaceToEnd = token.line - lineNo;
      continue;
    }

    if (token.line !== lineNo) {

      lines.push(currentLine);

      let linebreaks = 0;

      while (lineNo < token.line) {
        lineNo++;
        linebreaks++;
        if (lineNo < token.line) {
          lines.push(span(' ', 'line'));
        }
      }

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

    if (tokens[i + 1].type === 'eof') {
      continue;
    }

    const spaceToNext = tokens[i + 1].range[0] - token.range[1];
    currentLine.append(space(spaceToNext));

  }

  lines.push(currentLine);

  const totalLines = countLinebreaks(sourceString);
  while (lines.length <= totalLines) {
    lines.push(span('', 'line'));
  }

  return lines;
}