/**
 * @file Themes for the editor.
 */

export function applyTheme(theme, ...objects) {
  for (let [name, color] of Object.entries(theme)) {
    for (let obj of objects) {
      obj.style.setProperty('--' + name, color);
    }
  }
}

export const xcodeDark = {
  // main background
  background: "#292a30",

  // bg of element with focus
  focus: "#292a30",

  // bg of the current caret line
  currentline: "#2f323955",

  // user selection color
  selection: "#0973eb",

  // ui diving line color
  edge: "#515153",

  // text color
  text: "#fcfcfc",

  // comments
  comments: "#7f8c99",

  red: "#ff806c",
  orange: "#cd9764",
  yellow: "#daca77",
  green: "#75c3b3",
  blue: "#65dfff",
  purple: "#dbb8ff",
  pink: "#ff78b2",
};

export const light = {
  background: "#fdf6e3",
  focus: "#eee8d4",
  currentline: "#88777711",
  selection: "#6c71c444",
  edge: "#d6d6d6",
  text: "#657b83",
  comments: "#93a1a1",
  red: "#dc322f",
  orange: "#cb4b16",
  yellow: "#b58900",
  green: "#859900",
  blue: "#268bd2",
  purple: "#6c71c4",
  pink: "#d33682",
};

export const dark = {
  background: "#161616",
  focus: "#121212",
  currentline: "#ffffff10",
  selection: "#00f3",
  edge: "#333",
  text: "#d8d8d8",
  comments: "#535353",
  red: "#e54126",
  orange: "#fe8d00",
  yellow: "#cd9a62",
  green: "#d5eb28",
  blue: "#78c5fa",
  purple: "#bdbdf8",
  pink: "#f893c4",
};

export const cooldark = {
  background: "#0E1415",
  focus: "#0E1415",
  currentline: "#ffffff10",
  selection: "#293334",
  edge: "#293436",
  text: "#d8d8d8",
  comments: "#535353",
  red: "#dc322f",
  orange: "#999",
  yellow: "#dcaa4c",
  green: "#7db26c",
  blue: "#8095ab",
  purple: "#795BA5",
  pink: "#a86fa8",
};

export const purple = {
  background: "#201d2a",
  focus: "#201d2a",
  currentline: "#b042ff11",
  selection: "#2c2839",
  edge: "#6e658b55",
  text: "#9992b0",
  comments: "#625a7c",
  red: "#9375f5",
  orange: "#999",
  yellow: "#dcaa4c",
  green: "#d294ff",
  blue: "#d294ff",
  purple: "#795BA5",
  pink: "#a86fa8",
}