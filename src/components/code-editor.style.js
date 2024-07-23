export default `

@font-face {
  font-family: Commit;
  src: url('/fonts/CommitMono-400-Regular.otf') format('opentype');
}

* {
  box-sizing: border-box;
}

:host {
  width: 100%;
  height: 100%;
  --log-height: 20%;
  --background: whitesmoke;
  --comments: lightslategray;
  --selection: gold;
  --text: darkSlateGray;
  --yellow: peru;
  --green: green;
  --orange: tomato;
  --purple: slateblue;
  --pink: mediumvioletred;
  --blue: steelblue;
  --red: firebrick;
}

.editor {
  font-family: Commit, monospace;
  background: var(--background);
  color: var(--text);
  width: 100%;
  height: 100%;
  border: none;
  resize: none;
  position: relative;
  overflow: hidden;
}

.source,
.display {
  position: absolute;
  width: 100%;
  height: calc(100% - var(--log-height));
  top: 0;
  left: 0;
  padding: 0;
  margin: 0;
  border: 0;
  font-family: inherit;
  font-size: inherit;
  padding: 1em;
  overflow: scroll;
  overflow-wrap: unset;
  overflow-x: hidden;
  white-space: pre;
}

.source {
  caret-color: var(--text);
  color: var(--text);
  caret-shape: underscore;
  background: transparent;
  resize: none;
  border: none;
  overscroll-behavior-x: none;
  overscroll-behavior-y: none;
  font-family: unset;
}

.display {
  white-space: pre;
  pointer-events: none;
  counter-reset: line-no 1;
}

.scroll-filler,
.display-text {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  padding: 1em;
}

.str {
  color: var(--yellow);
}
.num {
  color: var(--purple);
}
.lparen,
.rparen {
  color: var(--comments);
}
.lparen.depth-1,
.rparen.depth-1 {
  color: var(--purple);
}
.lparen.depth-2,
.rparen.depth-2 {
  color: var(--blue);
}
.lparen.depth-3,
.rparen.depth-3 {
  color: var(--green);
}
.lparen.depth-4,
.rparen.depth-4 {
  color: var(--orange);
}
.dynamic {
  color: var(--green);
}

.keyword {
  color: var(--blue);
}
.invalid {
  color: var(--orange);
}
.comment {
  color: var(--comments);
}

.line {
  display: block;
  counter-increment: linenumcounter;
}

.line::before {
  content: counter(linenumcounter);
  margin-left: -3em;
  display: inline-block;
  width: 3em;
  color: var(--comments);
}

.line.caret-line {
  background: var(--currentline);
}
.line.caret-line::before {
  background: var(--currentline);
}

.source, .display, .display-text {
  padding-left: 4em;
}

.source::selection {
  background-color: var(--selection);
}


.source:focus {
  outline: none;
  background: var(--focus);
}

.log {
  padding-top: 1em;
  color: var(--text);
  height: var(--log-height);
  width: 100%;
  overflow: scroll;
  white-space: pre;
  border-top: var(--line);
  flex-flow: column;
  position: absolute;
  bottom: 0;
  left: 0;
}
.log-line {
  padding-left: 4rem;
}
.log-line.error {
  background: #ff000033;
}
.log-line::before {
  content: '>';
  margin-left: -3em;
  display: inline-block;
  width: 3em;
  color: var(--comments);
}
.log-line.error::before {
  content: '×';
  color: var(--red);

`.trim();