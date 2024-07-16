export default `

@font-face {
  font-family: Commit;
  src: url('/fonts/CommitMono-400-Regular.otf') format('opentype');
}

* {
  box-sizing: border-box;
}

:host {
  --background: rgb(46, 46, 46);
  --comments: rgb(121, 121, 121);
  --text: rgb(214, 214, 214);
  --yellow: rgb(229, 181, 103);
  --green: rgb(180, 210, 115);
  --orange: rgb(232, 125, 62);
  --purple: rgb(158, 134, 200);
  --pink: rgb(176, 82, 121);
  --blue: rgb(108, 153, 187);
  --red: rgb(255, 80, 133);
  --log-height: 20%;
  width: 100%;
  height: 100%;
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

.line {
  display: block;
  counter-increment: linenumcounter;
}

.line::before {
  content: counter(linenumcounter);
  margin-left: -3rem;
  display: inline-block;
  width: 3rem;
  color: var(--comments);
}

.source {
  padding-left: 4rem;
}
.display { 
  padding-left: 4rem;
}


.source:focus {
  outline: 3px solid gray;
}
.source::selection {
  background-color: rgba(255, 255, 255, 0.1);
  outline: 3px solid gold;
}

.log {
  border-top: 1px solid yellow;
  padding: 1rem;
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

.prompt {
  color: var(--green);
  width: 3rem;
  display: inline-block;
}
.prompt.error {
  color: var(--red);
}

`.trim();