"use strict";

// La compatibilidad heredada se basa en path-to-regexp; licencia en ../licenses.
const { pathToRegexp } = require("../node_modules/path-to-regexp/dist/atlas-compat.cjs");

function createDefaultCapture() {
  const { regexp } = pathToRegexp(
    { tokens: [{ type: "param", name: "value" }], originalPath: "" },
    { trailing: false }
  );
  const source = regexp.source;
  if (!source.startsWith("^(?:") || !source.endsWith("+))$")) {
    throw new Error("La versión de path-to-regexp genera un formato inesperado");
  }
  return `${source.slice(4, -3)}?)`.replace("\\/", "/");
}

const defaultCapture = createDefaultCapture();

function captureKeys(source, keys, namedCaptures = new Map()) {
  let numeric = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
      continue;
    }
    if (source[i] !== "(") continue;

    const named = namedCaptures.get(i);
    if (named) {
      keys.push(named);
      continue;
    }
    let name;
    if (source[i + 1] !== "?") {
      name = numeric++;
    } else if (source[i + 2] === "<" && !["=", "!"].includes(source[i + 3])) {
      const end = source.indexOf(">", i + 3);
      if (end === -1) throw new TypeError("Grupo con nombre no válido");
      name = source.slice(i + 3, end);
    } else {
      continue;
    }
    keys.push({ name, optional: false, offset: i });
  }
}

function convertCustomCapture(capture) {
  let output = "";
  let stars = 0;
  for (let i = 0; i < capture.length; i++) {
    if (capture[i] === "\\" && i + 1 < capture.length) {
      output += capture[i] + capture[++i];
    } else if (capture[i] === "*") {
      output += "(.*)";
      stars++;
    } else {
      output += capture[i];
    }
  }
  return { output, stars };
}

function parseParameter(input, offset) {
  const match = /^:(\w+)/.exec(input.slice(offset));
  if (!match) return null;
  let end = offset + match[0].length;
  let capture = "";
  if (input[end] === "(") {
    const close = input.indexOf(")", end + 1);
    if (close !== -1 && !/[\n\r\u2028\u2029]/.test(input.slice(end, close))) {
      capture = input.slice(end, close + 1);
      end = close + 1;
    }
  }
  let star = false;
  let optional = false;
  if (input[end] === "*") {
    star = true;
    end++;
  }
  if (input[end] === "?") {
    optional = true;
    end++;
  }
  return { name: match[1], capture, star, optional, end };
}

function findParameter(input, index) {
  let slash = "";
  let format = "";
  let offset = index;
  if (input[index] === "/" && input[index + 1] === "." && input[index + 2] === ":") {
    slash = "/";
    format = "\\.";
    offset += 2;
  } else if ((input[index] === "/" || input[index] === ".") && input[index + 1] === ":") {
    slash = input[index] === "/" ? "/" : "";
    format = input[index] === "." ? "\\." : "";
    offset++;
  }
  const parameter = input[offset] === ":" ? parseParameter(input, offset) : null;
  return parameter && { ...parameter, slash, format };
}

function appendParameter(state, input, index, parameter) {
  const { slash, format } = parameter;
  if (!slash && !format && index === state.previousParameterEnd) {
    throw new TypeError(`Ruta no compatible: parámetros adyacentes en ${input}`);
  }
  if (slash || format) {
    state.delimiter = "";
  } else {
    state.delimiter += input.slice(state.cursor, index);
  }
  state.cursor = parameter.end;
  let capture;
  if (parameter.capture) {
    const converted = convertCustomCapture(parameter.capture);
    capture = converted.output;
    state.stars += converted.stars;
  } else if (state.delimiter) {
    capture = `((?:(?!/|${state.delimiter}).)+?)`;
  } else if (format) {
    capture = "([^/\\.]+?)";
  } else {
    capture = defaultCapture;
  }
  if (parameter.star) state.stars++;
  if (state.stars > 1) {
    throw new TypeError(`Ruta no compatible: varios comodines en ${input}`);
  }
  const prefix = `(?:${format}${slash}`;
  state.namedCaptures.set(state.pattern.length + prefix.length, {
    name: parameter.name,
    optional: parameter.optional,
    offset: state.pattern.length,
  });
  const tail = parameter.star ? `((?:[/${format}].+?)?)` : "";
  state.pattern += `${prefix}${capture}${tail})${parameter.optional ? "?" : ""}`;
  state.delimiter = "";
  state.previousParameterEnd = parameter.end;
}

function appendText(state, input, index) {
  const ch = input[index];
  if (ch === "\\" && index + 1 < input.length) {
    const escaped = input.slice(index, index + 2);
    state.pattern += escaped;
    state.delimiter += escaped;
    state.cursor += 2;
    return index + 2;
  }
  if (ch === ".") {
    state.pattern += "\\.";
    state.delimiter += "\\.";
    state.cursor++;
  } else if (ch === "*") {
    if (++state.stars > 1) {
      throw new TypeError(`Ruta no compatible: varios comodines en ${input}`);
    }
    state.pattern += "(.*)";
    state.delimiter = "";
    state.cursor = index + 1;
  } else if (ch === "/" && input[index + 1] === "(") {
    state.pattern += "/(?:";
    state.delimiter += input.slice(state.cursor, index) + "/";
    state.cursor = index + 2;
    return index + 2;
  } else {
    state.pattern += ch;
  }
  return index + 1;
}

function compileLegacy(input, keys, options) {
  const state = {
    pattern: "",
    delimiter: "",
    cursor: 0,
    previousParameterEnd: -1,
    stars: 0,
    namedCaptures: new Map(),
  };
  for (let index = 0; index < input.length;) {
    const escaped = input[index] === "\\" && index + 1 < input.length;
    const parameter = escaped ? null : findParameter(input, index);
    if (parameter) {
      appendParameter(state, input, index, parameter);
      index = parameter.end;
    } else {
      index = appendText(state, input, index);
    }
  }

  captureKeys(state.pattern, keys, state.namedCaptures);
  if (!options.strict) state.pattern += state.pattern.endsWith("/") ? "?" : "/?";
  if (options.end !== false) {
    state.pattern += "$";
  } else if (!state.pattern.endsWith("/")) {
    state.pattern += options.lookahead === false ? "(?:/|$)" : "(?=/|$)";
  }
  return new RegExp(`^${state.pattern}`, options.sensitive ? "" : "i");
}

function compileSimple(input, options) {
  const segments = input.split("/");
  const tokens = [];
  for (let i = 0; i < segments.length; i++) {
    if (i) tokens.push({ type: "text", value: "/" });
    const segment = segments[i];
    if (/^:\w+$/.test(segment)) {
      tokens.push({ type: "param", name: segment.slice(1) });
    } else if (segment) {
      tokens.push({ type: "text", value: segment });
    }
  }
  if (!options.strict && input.endsWith("/")) tokens.pop();
  const result = pathToRegexp({ tokens, originalPath: input }, {
    end: true,
    trailing: false,
    sensitive: options.sensitive,
  });
  const core = result.regexp.source.slice(1, -1);
  let suffix = options.strict ? "" : "/?";
  if (options.end !== false) {
    suffix += "$";
  } else if (!(options.strict && input.endsWith("/"))) {
    suffix += options.lookahead === false ? "(?:/|$)" : "(?=/|$)";
  }
  return {
    regexp: new RegExp(`^${core}${suffix}`, options.sensitive ? "" : "i"),
    keys: result.keys.map(({ name }) => ({ name, optional: false })),
  };
}

function pathToRegexpCompat(path, keys, options) {
  keys = keys || [];
  options = options || {};
  if (path instanceof RegExp) {
    captureKeys(path.source, keys);
    return path;
  }
  if (Array.isArray(path)) {
    const flags = options.sensitive ? "" : "i";
    return new RegExp(path.map((value) => pathToRegexpCompat(value, keys, options).source).join("|"), flags);
  }
  if (typeof path !== "string") {
    throw new TypeError("path must be a string, array of strings, or regular expression");
  }
  const simple = path.split("/").every((segment) =>
    /^:\w+$/.test(segment) || /^[A-Za-z0-9_.~@;,%=-]*$/.test(segment)
  );
  if (!simple) return compileLegacy(path, keys, options);

  const legacyKeys = [];
  compileLegacy(path, legacyKeys, options);
  const result = compileSimple(path, options);
  const comparableKeys = legacyKeys.map(({ name, optional }) => ({ name, optional }));
  if (JSON.stringify(comparableKeys) !== JSON.stringify(result.keys)) {
    throw new Error("Los compiladores de rutas devolvieron parámetros distintos");
  }
  for (const key of legacyKeys) keys.push(key);
  return result.regexp;
}

module.exports = pathToRegexpCompat;
