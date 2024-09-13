//@ts-check

/**
 * @file String tool helpers for the code editor.
 */

/**
 * Given a potentially multiline string, get the index of the first character 
 * on the line that ends at index lineEnd.
 * @param {string} str The search string.
 * @param {number} lineEnd The index of the line break that terminatese the line.
 * @return {number} The index of the first character on that line.
 */
export function lineStart(str, lineEnd) {
  return str.lastIndexOf('\n', lineEnd - 1) + 1;
}


/**
 * Get an array containing the indices of all line breaks in a source string.
 * @param {string} str The search string.
 * @return {number[]}
 */
export function findLineBreaks(str) {
  let ndx = str.indexOf("\n");
  if (ndx < 0)
    return [ndx];

  let breaks = [ndx];
  while (ndx > -1) {
    ndx = str.indexOf("\n", ndx + 1);
    if (ndx > -1) breaks.push(ndx);
  }
  breaks.push(str.length + 1);
  return breaks;
}


/**
 * Get the number of linebreaks in a search string.
 * @param {string} str The search string.
 * @return {number}
 */
export function countLinebreaks(str) {
  let ndx = str.indexOf("\n");
  if (ndx < 0) return 0;

  let breaks = 1;
  while (ndx > -1) {
    ndx = str.indexOf("\n", ndx + 1);
    if (ndx > -1) breaks += 1;
  }
  return breaks + 1;
}


/**
 * Get the next non-space character in a search string.
 * @param {string} str The search string.
 * @param {number} index The start index.
 * @return {[number, string]} The index of the non-space char, and what the 
 *     char was.
 */
export function nextNonSpaceChar(str, index) {
  let ndx = index;
  while (str[ndx] === ' ' && ndx < str.length) {
    ndx++;
  }
  return [ndx, str[ndx]];
}


/**
 * Fill a string with something.
 * @param {number} n The number of something.
 * @param {string} str The something.
 * @return {string} str repeated n times.
 */
export function fillString(n, str) {
  return new Array(n + 1).join(str);
}