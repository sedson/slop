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
  /* --background: rgb(46, 46, 46);
   --background-focus: rgb(36, 36, 36);
   --comments: rgb(121, 121, 121);
   --text: rgb(214, 214, 214);
   --yellow: rgb(229, 181, 103);
   --green: rgb(180, 210, 115);
   --orange: rgb(232, 125, 62);
   --purple: rgb(158, 134, 200);
   --pink: rgb(176, 82, 121);
   --blue: rgb(108, 153, 187);
   --red: rgb(255, 80, 133);*/
  --background: #fdf6e3;
  --background-focus: #eee8d5;
  --background-selection: #2aa19844;
  --text: #586e75;
  --comments: #93a1a1;
  --red: #dc322f;
  --orange: #cb4b16;
  --yellow: #b58900;
  --green: #859900;
  --blue: #268bd2;
  --purple: #6c71c4;
  --pink: #d33682;
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
  color: var(--pink);
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
  background: #8881;
}
.line.caret-line::before {
  background: #8881;
}

.source, .display, .display-text {
  padding-left: 4em;
}

.source:focus {
  background: var(--background-focus);
  outline: none
}
.source::selection {
  background-color: var(--background-selection);
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