const span = (text, c) => {
  const s = document.createElement('span');
  s.innerText = text;
  s.classList = c;
  return s;
}

// make white space
const pad = (n, str) => new Array(n + 1).join(str);

// 
const space = (n) => pad(n, ' ');

// make a line break
const br = () => document.createElement('br');


/**
 * From some source code, a list of gererated tokens, and a list of keywords.
 * @param {string} sourceString
 * @param {array<Token>} tokens
 * @param {array<String>} keywords
 * @return {string}
 */
export function highlight(sourceString, tokens, keywords) {

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

      lines.push(currentLine.outerHTML);


      let linebreaks = 0;

      while (lineNo < token.line) {
        lineNo++;
        linebreaks++;
        if (lineNo < token.line) {
          lines.push(span(' ', 'line').outerHTML);
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

    if (keywords.includes(token.str)) {
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

  lines.push(currentLine.outerHTML);
  return lines.join('');
}