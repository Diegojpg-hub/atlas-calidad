const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const fixtures = [];
const script = path.join(__dirname, "../../scripts/patch-express-routing.js");
const original = "var pathRegexp = require('path-to-regexp');";
const generated = 'exports.pathToRegexp = function pathToRegexp() {};\n';

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-routing-patch-"));
  fixtures.push(root);
  for (const dir of [
    "scripts", "src", "node_modules/express/lib/router",
    "node_modules/path-to-regexp/dist", "node_modules/@swc/wasm",
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.copyFileSync(script, path.join(root, "scripts/patch-express-routing.js"));
  fs.writeFileSync(path.join(root, "src/path-to-regexp-compat.js"), "");
  fs.writeFileSync(path.join(root, "node_modules/express/package.json"), JSON.stringify({
    name: "express", version: "4.21.2",
  }));
  fs.writeFileSync(path.join(root, "node_modules/express/lib/router/layer.js"), original);
  fs.writeFileSync(path.join(root, "node_modules/path-to-regexp/package.json"), JSON.stringify({
    name: "path-to-regexp", version: "9.0.0", type: "module", exports: "./dist/index.js",
  }));
  fs.writeFileSync(path.join(root, "node_modules/path-to-regexp/dist/index.js"), "export function pathToRegexp() {}\n");
  fs.writeFileSync(path.join(root, "node_modules/@swc/wasm/package.json"), JSON.stringify({
    name: "@swc/wasm", version: "1.16.22", main: "index.js",
  }));
  fs.writeFileSync(path.join(root, "node_modules/@swc/wasm/index.js"),
    `exports.transformSync = () => ({ code: ${JSON.stringify(generated)} });\n`);
  return root;
}

function runPatch(root) {
  return spawnSync(process.execPath, [path.join(root, "scripts/patch-express-routing.js")], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("Instalación del adaptador de rutas", () => {
  test("convierte el módulo, redirige Express y es idempotente", () => {
    const root = createFixture();
    const layer = path.join(root, "node_modules/express/lib/router/layer.js");
    const output = path.join(root, "node_modules/path-to-regexp/dist/atlas-compat.cjs");
    expect(runPatch(root).status).toBe(0);
    expect(fs.readFileSync(layer, "utf8"))
      .toBe('var pathRegexp = require("../../../../src/path-to-regexp-compat.js");');
    expect(fs.readFileSync(output, "utf8")).toBe(generated);
    expect(runPatch(root).status).toBe(0);
    expect(fs.readFileSync(output, "utf8")).toBe(generated);
    expect(fs.readdirSync(path.dirname(output)).some((name) => name.includes(".tmp.cjs"))).toBe(false);
  });

  test.each([
    ["express/package.json", { name: "express", version: "4.22.0" }],
    ["path-to-regexp/package.json", { name: "path-to-regexp", version: "8.0.0", exports: "./dist/index.js" }],
    ["@swc/wasm/package.json", { name: "@swc/wasm", version: "1.16.21", main: "index.js" }],
  ])("rechaza versiones inesperadas en %s", (manifest, content) => {
    const root = createFixture();
    fs.writeFileSync(path.join(root, "node_modules", manifest), JSON.stringify(content));
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Revisar el adaptador de rutas/);
    expect(fs.readFileSync(path.join(root, "node_modules/express/lib/router/layer.js"), "utf8")).toBe(original);
  });

  test("no modifica Express cuando su código no coincide", () => {
    const root = createFixture();
    const layer = path.join(root, "node_modules/express/lib/router/layer.js");
    fs.writeFileSync(layer, "codigo inesperado");
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/No se puede aplicar el adaptador/);
    expect(fs.readFileSync(layer, "utf8")).toBe("codigo inesperado");
    expect(fs.existsSync(path.join(root, "node_modules/path-to-regexp/dist/atlas-compat.cjs"))).toBe(false);
  });

  test("rechaza un módulo distinto dentro de Express", () => {
    const root = createFixture();
    const nested = path.join(root, "node_modules/express/node_modules/path-to-regexp");
    fs.mkdirSync(path.join(nested, "dist"), { recursive: true });
    fs.writeFileSync(path.join(nested, "package.json"), JSON.stringify({
      name: "path-to-regexp", version: "9.0.0", exports: "./dist/index.js",
    }));
    fs.writeFileSync(path.join(nested, "dist/index.js"), "");
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Revisar el adaptador de rutas/);
  });

  test("rechaza Express enlazado fuera del proyecto", () => {
    const root = createFixture();
    const external = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-routing-external-"));
    fixtures.push(external);
    const express = path.join(root, "node_modules/express");
    const target = path.join(external, "express");
    fs.renameSync(express, target);
    fs.symlinkSync(target, express, "dir");
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Revisar el adaptador de rutas/);
    expect(fs.readFileSync(path.join(target, "lib/router/layer.js"), "utf8")).toBe(original);
  });

  test("rechaza una instalación sin el adaptador", () => {
    const root = createFixture();
    fs.unlinkSync(path.join(root, "src/path-to-regexp-compat.js"));
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/No se encuentra el adaptador de rutas/);
  });

  test("descarta la conversión inválida sin modificar Express", () => {
    const root = createFixture();
    fs.writeFileSync(path.join(root, "node_modules/@swc/wasm/index.js"),
      'exports.transformSync = () => ({ code: "module.exports = {};" });\n');
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/versión convertida de path-to-regexp no es válida/);
    const dist = path.join(root, "node_modules/path-to-regexp/dist");
    expect(fs.readdirSync(dist)).toEqual(["index.js"]);
    expect(fs.readFileSync(path.join(root, "node_modules/express/lib/router/layer.js"), "utf8")).toBe(original);
  });
});
