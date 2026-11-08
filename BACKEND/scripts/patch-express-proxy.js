"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const realRoot = fs.realpathSync(root);
const expressManifestPath = require.resolve("express/package.json", { paths: [root] });
const expressRoot = path.dirname(expressManifestPath);
if (fs.realpathSync(expressRoot) !== path.join(realRoot, "node_modules", "express")) {
  throw new Error("No se puede modificar un Express fuera del proyecto");
}
const expressManifest = require(expressManifestPath);
const aliasManifestPath = require.resolve("proxy-addr/package.json", { paths: [expressRoot] });
const aliasManifest = require(aliasManifestPath);
const adapterPath = path.join(root, "src", "proxy-addr-compat.js");
const adapterAliasPath = require.resolve("proxy-addr/package.json", { paths: [path.dirname(adapterPath)] });

if (expressManifest.version !== "4.21.2" ||
    aliasManifest.name !== "ip-address" || aliasManifest.version !== "10.7.6" ||
    fs.realpathSync(aliasManifestPath) !== fs.realpathSync(adapterAliasPath) ||
    fs.realpathSync(aliasManifestPath) !== path.join(realRoot, "node_modules", "proxy-addr", "package.json")) {
  throw new Error("Revisar el adaptador de proxy: cambiaron Express o ip-address");
}
if (!fs.existsSync(adapterPath)) {
  throw new Error("No se encuentra el adaptador de proxy");
}

const changes = [];
for (const name of ["request.js", "utils.js"]) {
  const file = path.join(expressRoot, "lib", name);
  const relative = path.relative(path.dirname(file), adapterPath).split(path.sep).join("/");
  const modulePath = relative.startsWith(".") ? relative : `./${relative}`;
  const replacement = `var proxyaddr = require(${JSON.stringify(modulePath)});`;
  const original = "var proxyaddr = require('proxy-addr');";
  const source = fs.readFileSync(file, "utf8");
  if (source.includes(replacement) && !source.includes(original)) continue;
  if (source.split(original).length !== 2 || source.includes(replacement)) {
    throw new Error(`No se puede aplicar el adaptador a ${file}`);
  }
  changes.push({ file, source: source.replace(original, replacement) });
}
for (const change of changes) {
  fs.writeFileSync(change.file, change.source);
}
