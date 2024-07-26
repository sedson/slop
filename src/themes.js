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
  background: "#2d2d2f",

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