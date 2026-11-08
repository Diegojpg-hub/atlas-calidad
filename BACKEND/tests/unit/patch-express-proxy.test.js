const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const fixtures = [];
const original = "var proxyaddr = require('proxy-addr');";
const script = path.join(__dirname, "../../scripts/patch-express-proxy.js");

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-proxy-patch-"));
  fixtures.push(root);
  for (const dir of ["scripts", "src", "node_modules/express/lib", "node_modules/proxy-addr"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.copyFileSync(script, path.join(root, "scripts/patch-express-proxy.js"));
  fs.writeFileSync(path.join(root, "src/proxy-addr-compat.js"), "");
  fs.writeFileSync(path.join(root, "node_modules/express/package.json"), JSON.stringify({ version: "4.21.2" }));
  fs.writeFileSync(path.join(root, "node_modules/proxy-addr/package.json"), JSON.stringify({ name: "ip-address", version: "10.7.6" }));
  for (const name of ["request.js", "utils.js"]) {
    fs.writeFileSync(path.join(root, "node_modules/express/lib", name), original);
  }
  return root;
}

function runPatch(root) {
  return spawnSync(process.execPath, [path.join(root, "scripts/patch-express-proxy.js")], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("Instalación del adaptador de proxy", () => {
  test("actualiza ambos imports y puede ejecutarse más de una vez", () => {
    const root = createFixture();
    expect(runPatch(root).status).toBe(0);
    const files = ["request.js", "utils.js"].map((name) =>
      path.join(root, "node_modules/express/lib", name)
    );
    const sources = files.map((file) => fs.readFileSync(file, "utf8"));
    expect(sources).toEqual([
      'var proxyaddr = require("../../../src/proxy-addr-compat.js");',
      'var proxyaddr = require("../../../src/proxy-addr-compat.js");',
    ]);
    expect(runPatch(root).status).toBe(0);
    expect(files.map((file) => fs.readFileSync(file, "utf8"))).toEqual(sources);
  });

  test.each([
    ["express/package.json", { version: "4.22.0" }],
    ["proxy-addr/package.json", { name: "ip-address", version: "10.7.5" }],
  ])("rechaza versiones inesperadas en %s", (manifest, content) => {
    const root = createFixture();
    fs.writeFileSync(path.join(root, "node_modules", manifest), JSON.stringify(content));
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Revisar el adaptador/);
    expect(fs.readFileSync(path.join(root, "node_modules/express/lib/request.js"), "utf8")).toBe(original);
  });

  test("no modifica ningún archivo si el código de Express no coincide", () => {
    const root = createFixture();
    fs.writeFileSync(path.join(root, "node_modules/express/lib/utils.js"), "codigo inesperado");
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/No se puede aplicar el adaptador/);
    expect(fs.readFileSync(path.join(root, "node_modules/express/lib/request.js"), "utf8")).toBe(original);
  });

  test("rechaza un alias distinto dentro de Express", () => {
    const root = createFixture();
    const nested = path.join(root, "node_modules/express/node_modules/proxy-addr");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, "package.json"), JSON.stringify({ name: "ip-address", version: "10.7.6" }));
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Revisar el adaptador/);
  });

  test("no modifica una instalación de Express enlazada fuera del proyecto", () => {
    const root = createFixture();
    const external = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-express-external-"));
    fixtures.push(external);
    const express = path.join(root, "node_modules/express");
    const target = path.join(external, "express");
    fs.renameSync(express, target);
    fs.symlinkSync(target, express, "dir");
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Express fuera del proyecto/);
    expect(fs.readFileSync(path.join(target, "lib/request.js"), "utf8")).toBe(original);
  });

  test("rechaza una instalación sin el adaptador", () => {
    const root = createFixture();
    fs.unlinkSync(path.join(root, "src/proxy-addr-compat.js"));
    const result = runPatch(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/No se encuentra el adaptador/);
  });
});
