"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = fs.realpathSync(path.resolve(__dirname, ".."));
const expressManifestPath = require.resolve("express/package.json", { paths: [root] });
const expressRoot = fs.realpathSync(path.dirname(expressManifestPath));
if (expressRoot !== path.join(root, "node_modules", "express")) {
  throw new Error("Revisar el adaptador de rutas: Express está fuera del proyecto");
}
const routeEntry = fs.realpathSync(require.resolve("path-to-regexp", { paths: [expressRoot] }));
const localRouteEntry = fs.realpathSync(require.resolve("path-to-regexp", { paths: [root] }));
const compilerManifestPath = fs.realpathSync(require.resolve("@swc/wasm/package.json", { paths: [root] }));
const routeRoot = path.join(root, "node_modules", "path-to-regexp");
const expectedRouteEntry = path.join(routeRoot, "dist", "index.js");
const expectedCompilerManifest = path.join(root, "node_modules", "@swc", "wasm", "package.json");
const expressManifest = require(expressManifestPath);
const routeManifest = JSON.parse(fs.readFileSync(path.join(routeRoot, "package.json"), "utf8"));
const compilerManifest = require(compilerManifestPath);

if (routeEntry !== expectedRouteEntry || localRouteEntry !== expectedRouteEntry ||
    compilerManifestPath !== expectedCompilerManifest ||
    expressManifest.version !== "4.21.2" ||
    routeManifest.name !== "path-to-regexp" || routeManifest.version !== "9.0.0" ||
    compilerManifest.name !== "@swc/wasm" || compilerManifest.version !== "1.16.22") {
  throw new Error("Revisar el adaptador de rutas: cambiaron las dependencias o sus ubicaciones");
}

const adapter = path.join(root, "src", "path-to-regexp-compat.js");
if (!fs.existsSync(adapter)) {
  throw new Error("No se encuentra el adaptador de rutas");
}

const layer = path.join(expressRoot, "lib", "router", "layer.js");
const source = fs.readFileSync(layer, "utf8");
const relative = path.relative(path.dirname(layer), adapter).split(path.sep).join("/");
const modulePath = relative.startsWith(".") ? relative : `./${relative}`;
const original = "var pathRegexp = require('path-to-regexp');";
const replacement = `var pathRegexp = require(${JSON.stringify(modulePath)});`;
const alreadyPatched = source.includes(replacement) && !source.includes(original);
if (!alreadyPatched && (source.split(original).length !== 2 || source.includes(replacement))) {
  throw new Error(`No se puede aplicar el adaptador a ${layer}`);
}

const swc = require(path.dirname(compilerManifestPath));
const transformed = swc.transformSync(fs.readFileSync(routeEntry, "utf8"), {
  jsc: { parser: { syntax: "ecmascript" }, target: "es2022" },
  module: { type: "commonjs" },
});
if (typeof transformed.code !== "string" || !transformed.code) {
  throw new Error("No se pudo convertir path-to-regexp a CommonJS");
}

const output = path.join(path.dirname(routeEntry), "atlas-compat.cjs");
const temporary = `${output}.${process.pid}.tmp.cjs`;
try {
  fs.writeFileSync(temporary, transformed.code, { flag: "wx" });
  if (typeof require(temporary).pathToRegexp !== "function") {
    throw new Error("La versión convertida de path-to-regexp no es válida");
  }
  fs.renameSync(temporary, output);
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
if (!alreadyPatched) fs.writeFileSync(layer, source.replace(original, replacement));
