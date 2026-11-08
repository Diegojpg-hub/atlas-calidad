"use strict";

// Derivado de brace-expansion; ver la licencia MIT incluida con el proyecto.
const { balanced } = require("balanced-match");

Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPANSION_MAX = 100_000;
exports.EXPANSION_MAX_LENGTH = 4_000_000;
const MAX_DEPTH = 256;
const MAX_REWRITES = 256;
const MAX_PATTERN_LENGTH = 65_536;
exports.EXPANSION_MAX_DEPTH = MAX_DEPTH;
exports.EXPANSION_MAX_REWRITES = MAX_REWRITES;
exports.EXPANSION_MAX_PATTERN_LENGTH = MAX_PATTERN_LENGTH;
exports.expand = expand;
exports.expandGlob = expandGlob;

const escSlash = "\0SLASH" + Math.random() + "\0";
const escOpen = "\0OPEN" + Math.random() + "\0";
const escClose = "\0CLOSE" + Math.random() + "\0";
const escComma = "\0COMMA" + Math.random() + "\0";
const escPeriod = "\0PERIOD" + Math.random() + "\0";
const escSlashPattern = new RegExp(escSlash, "g");
const escOpenPattern = new RegExp(escOpen, "g");
const escClosePattern = new RegExp(escClose, "g");
const escCommaPattern = new RegExp(escComma, "g");
const escPeriodPattern = new RegExp(escPeriod, "g");
const slashPattern = /\\\\/g;
const openPattern = /\\{/g;
const closePattern = /\\}/g;
const commaPattern = /\\,/g;
const periodPattern = /\\\./g;
const globPeriodPattern = /\\./g;

function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}

function escapeBraces(str, legacyGlob) {
  return str
    .replace(slashPattern, escSlash)
    .replace(openPattern, escOpen)
    .replace(closePattern, escClose)
    .replace(commaPattern, escComma)
    .replace(legacyGlob ? globPeriodPattern : periodPattern, escPeriod);
}

function unescapeBraces(str) {
  return str
    .replace(escSlashPattern, "\\")
    .replace(escOpenPattern, "{")
    .replace(escClosePattern, "}")
    .replace(escCommaPattern, ",")
    .replace(escPeriodPattern, ".");
}

function parseCommaParts(str) {
  const parts = [""];
  for (;;) {
    const match = balanced("{", "}", str);
    const chunk = (match ? match.pre : str).split(",");
    parts[parts.length - 1] += chunk[0];
    for (let i = 1; i < chunk.length; i++) parts.push(chunk[i]);
    if (!match) return parts;
    parts[parts.length - 1] += "{" + match.body + "}";
    str = match.post;
  }
}

function hasTrailingOption(post) {
  let sawComma = false;
  for (let i = 0; i < post.length; i++) {
    const char = post[i];
    if (char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029") {
      sawComma = false;
    } else if (char === "," && post[i + 1] !== ",") {
      sawComma = true;
    } else if (char === "}" && sawComma) {
      return true;
    }
  }
  return false;
}

function expand(str, options = {}) {
  return expandWithMode(str, options, false);
}

function expandGlob(str, options = {}) {
  return expandWithMode(str, options, true);
}

function expandWithMode(str, options, legacyGlob) {
  if (!str) return [];
  if (str.length > MAX_PATTERN_LENGTH) {
    throw new RangeError("Brace pattern exceeds the maximum length");
  }
  const { max = exports.EXPANSION_MAX, maxLength = exports.EXPANSION_MAX_LENGTH } = options;
  if (!Number.isFinite(Number(max)) || !Number.isFinite(Number(maxLength))) {
    throw new RangeError("Brace expansion limits must be finite");
  }
  if (str.slice(0, 2) === "{}") str = "\\{\\}" + str.slice(2);
  return expandInternal(escapeBraces(str, legacyGlob), max, maxLength, true, 0, legacyGlob)
    .map(unescapeBraces);
}

function combine(acc, pre, values, max, maxLength, dropEmpties) {
  const out = [];
  let length = 0;
  for (let a = 0; a < acc.length; a++) {
    for (let v = 0; v < values.length; v++) {
      if (out.length >= max) return out;
      const expansion = acc[a] + pre + values[v];
      if (dropEmpties && !expansion) continue;
      if (length + expansion.length > maxLength) return out;
      out.push(expansion);
      length += expansion.length;
    }
  }
  return out;
}

function expandSequence(body, isAlphaSequence, max, maxLength) {
  const parts = body.split(/\.\./);
  const values = [];
  if (parts[0] === undefined || parts[1] === undefined) return values;
  const first = numeric(parts[0]);
  const last = numeric(parts[1]);
  const width = Math.max(parts[0].length, parts[1].length);
  // El bundle anterior de glob podía quedar en un bucle con un paso cero.
  let increment = parts.length === 3 && parts[2] !== undefined
    ? Math.max(Math.abs(numeric(parts[2])), 1)
    : 1;
  let test = (i, end) => i <= end;
  if (last < first) {
    increment *= -1;
    test = (i, end) => i >= end;
  }
  const padded = parts.some((value) => /^-?0\d/.test(value));
  let length = 0;
  for (let i = first; test(i, last) && values.length < max; i += increment) {
    let value;
    if (isAlphaSequence) {
      value = String.fromCharCode(i);
      if (value === "\\") value = "";
    } else {
      value = String(i);
      if (padded) {
        const need = width - value.length;
        if (need > 0) {
          const zeroes = new Array(need + 1).join("0");
          value = i < 0 ? "-" + zeroes + value.slice(1) : zeroes + value;
        }
      }
    }
    if (length + value.length > maxLength) break;
    values.push(value);
    length += value.length;
  }
  return values;
}

function expandInternal(str, max, maxLength, isTop, depth, legacyGlob) {
  if (depth > MAX_DEPTH) {
    throw new RangeError("Brace pattern exceeds the maximum nesting depth");
  }
  let acc = [""];
  let dropEmpties = false;
  let firstGroup = true;
  let rewrites = 0;
  for (;;) {
    const match = balanced("{", "}", str);
    if (!match) return combine(acc, str, [""], max, maxLength, dropEmpties);
    const pre = match.pre;
    if (/\$$/.test(pre)) {
      acc = combine(acc, pre + "{" + match.body + "}", [""], max, maxLength,
        dropEmpties && !match.post.length);
      firstGroup = false;
      if (!match.post.length) break;
      str = match.post;
      continue;
    }
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(match.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(match.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = match.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (hasTrailingOption(match.post)) {
        if (++rewrites > MAX_REWRITES) {
          throw new RangeError("Brace pattern exceeds the maximum number of rewrites");
        }
        const rewritten = pre + "{" + match.body + escClose + match.post;
        if (legacyGlob) {
          const values = expandInternal(rewritten, max, maxLength, true, depth + 1, legacyGlob);
          return combine(acc, "", values, max, maxLength, dropEmpties);
        }
        str = rewritten;
        isTop = true;
        continue;
      }
      return combine(acc, pre + "{" + match.body + "}" + match.post, [""], max, maxLength, dropEmpties);
    }
    if (firstGroup) {
      dropEmpties = isTop && !isSequence;
      firstGroup = false;
    }
    let values;
    if (isSequence) {
      values = expandSequence(match.body, isAlphaSequence, max, maxLength);
    } else {
      let parts = parseCommaParts(match.body);
      if (parts.length === 1 && parts[0] !== undefined) {
        parts = expandInternal(parts[0], max, maxLength, false, depth + 1, legacyGlob)
          .map((value) => "{" + value + "}");
        if (parts.length === 1) {
          acc = combine(acc, pre + parts[0], [""], max, maxLength, dropEmpties && !match.post.length);
          if (!match.post.length) break;
          str = match.post;
          continue;
        }
      }
      let dropsEmpties = dropEmpties && !match.post.length && !pre;
      for (let i = 0; dropsEmpties && i < acc.length; i++) {
        if (acc[i]) dropsEmpties = false;
      }
      values = [];
      let valuesLength = 0;
      outer: for (let j = 0; j < parts.length; j++) {
        const expanded = expandInternal(parts[j], max, maxLength, false, depth + 1, legacyGlob);
        for (let k = 0; k < expanded.length; k++) {
          const value = expanded[k];
          if (dropsEmpties && !value) continue;
          if (values.length >= max || valuesLength + value.length > maxLength) break outer;
          values.push(value);
          valuesLength += value.length;
        }
      }
    }
    acc = combine(acc, pre, values, max, maxLength, dropEmpties && !match.post.length);
    if (!match.post.length) break;
    str = match.post;
  }
  return acc;
}
