"use strict";

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const { pathToFileURL } = require("node:url");

const npmRoot = process.env.TEST_NPM_ROOT;
if (!npmRoot) throw new Error("TEST_NPM_ROOT must identify the npm installation");
const managedRoot = path.resolve(npmRoot, "../..");
const modules = path.join(npmRoot, "node_modules");
const adapter = require(path.join(npmRoot, "atlas-compat/brace-expansion.cjs"));
const npmRequire = createRequire(path.join(npmRoot, "package.json"));
const installer = path.join(managedRoot, "atlas-tools/patch-brace-expansion.cjs");
const temporary = [];

function tempDirectory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-brace-check-"));
  temporary.push(dir);
  return dir;
}

function fixtureCopy() {
  const root = tempDirectory();
  const target = path.join(root, "node_modules/npm");
  fs.mkdirSync(path.join(target, "node_modules"), { recursive: true });
  fs.copyFileSync(path.join(npmRoot, "package.json"), path.join(target, "package.json"));
  for (const dir of ["glob", "minimatch", "balanced-match"]) {
    fs.cpSync(path.join(modules, dir), path.join(target, "node_modules", dir), { recursive: true });
  }
  fs.cpSync(path.join(npmRoot, "atlas-compat"), path.join(target, "atlas-compat"), { recursive: true });
  return { root, npm: target };
}

function runInstaller(root) {
  return spawnSync(process.execPath, [installer, root], { encoding: "utf8", timeout: 30000 });
}

function snapshot(root) {
  const files = [
    "node_modules/minimatch/package.json",
    "node_modules/minimatch/dist/commonjs/index.js",
    "node_modules/minimatch/dist/esm/index.js",
    "node_modules/glob/dist/commonjs/index.min.js",
    "node_modules/glob/dist/esm/index.min.js",
    "atlas-compat/brace-expansion.cjs",
    "atlas-compat/brace-expansion.mjs",
  ];
  return files.map((file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex"));
}

function writeFixture(root, name) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "");
}

after(() => {
  for (const dir of temporary) fs.rmSync(dir, { recursive: true, force: true });
});

test("expands normal, nested, escaped and numeric patterns", async () => {
  const examples = [
    ["{a,{b,c}}", ["a", "b", "c"]],
    ["a{b,c}d", ["abd", "acd"]],
    ["foo{,bar}", ["foo", "foobar"]],
    ["{-03..1}", ["-03", "-02", "-01", "000", "001"]],
    ["{z..v..2}", ["z", "x", "v"]],
    ["{{a,b}}", ["{a}", "{b}"]],
    ["${a,b}", ["${a,b}"]],
    ["{}a", ["{}a"]],
    ["{1..2..0}", ["1", "2"]],
  ];
  const esm = await import(pathToFileURL(path.join(npmRoot, "atlas-compat/brace-expansion.mjs")));
  for (const mode of ["expand", "expandGlob"]) {
    for (const [pattern, expected] of examples) {
      assert.deepEqual(adapter[mode](pattern), expected);
      assert.deepEqual(esm[mode](pattern), expected);
    }
    assert.deepEqual(adapter[mode]("{a,b,c}", { max: 2 }), ["a", "b"]);
    assert.deepEqual(adapter[mode]("{a,b,c}", { max: "2" }), ["a", "b"]);
    assert.deepEqual(adapter[mode]("{aa,bb}", { maxLength: 3 }), ["aa"]);
    for (const options of [{ max: Infinity }, { max: NaN }, { maxLength: Infinity }]) {
      assert.throws(() => adapter[mode]("{a,b}", options), /limits must be finite/);
    }
  }
  assert.deepEqual(adapter.expand("\\x"), ["\\x"]);
  assert.deepEqual(adapter.expandGlob("\\x"), ["."]);
});

test("enforces exact default limits and safely handles large comma groups", { timeout: 30000 }, () => {
  assert.equal(adapter.EXPANSION_MAX, 100000);
  assert.equal(adapter.EXPANSION_MAX_LENGTH, 4000000);
  assert.equal(adapter.EXPANSION_MAX_DEPTH, 256);
  assert.equal(adapter.EXPANSION_MAX_REWRITES, 256);
  assert.equal(adapter.EXPANSION_MAX_PATTERN_LENGTH, 65536);
  for (const mode of ["expand", "expandGlob"]) {
    const expand = adapter[mode];
    assert.equal(expand("{a,b}".repeat(17)).length, 100000);
    const longResults = expand("{a,b}".repeat(500));
    assert.equal(longResults.length, 8000);
    assert.equal(longResults.reduce((sum, item) => sum + item.length, 0), 4000000);
    assert.equal(expand("{" + "{x},".repeat(10000) + "z}").length, 10001);
    assert.deepEqual(expand("{" + ",".repeat(60000) + "}"), []);
    assert.equal(expand("x".repeat(65536))[0].length, 65536);
    assert.throws(() => expand("x".repeat(65537)), /maximum length/);
    const nested = (depth) => "{a,".repeat(depth) + "z" + "}".repeat(depth);
    assert.equal(expand(nested(256)).length, 257);
    assert.throws(() => expand(nested(257)), /maximum nesting depth/);
  }
  const malformed = (count) => "{a}" + "}".repeat(count) + ",z}";
  assert.equal(adapter.expand(malformed(255)).length, 2);
  assert.throws(() => adapter.expand(malformed(256)), /maximum number of rewrites/);
});

test("minimatch CommonJS and ESM retain expansion and configurable result limits", async () => {
  const commonjs = npmRequire("minimatch");
  const esm = await import(pathToFileURL(path.join(modules, "minimatch/dist/esm/index.js")));
  for (const minimatch of [commonjs, esm]) {
    assert.deepEqual(minimatch.braceExpand("a{b,c}{1..2}"), ["ab1", "ab2", "ac1", "ac2"]);
    assert.deepEqual(minimatch.braceExpand("{a,b,c}", { braceExpandMax: 2 }), ["a", "b"]);
    assert.throws(() => minimatch.braceExpand("{a,b}", { braceExpandMax: Infinity }),
      /limits must be finite/);
    assert.equal(minimatch.minimatch("src/a.js", "{src,test}/**/*.js"), true);
    assert.equal(minimatch.minimatch("docs/a.js", "{src,test}/**/*.js"), false);
    assert.throws(() => minimatch.braceExpand("{a,".repeat(257) + "z" + "}".repeat(257)),
      /maximum nesting depth/);
  }
});

test("glob and glob/raw work through CommonJS and ESM", async () => {
  const dir = tempDirectory();
  for (const name of ["src/a.js", "src/nested/b.ts", "test/c.js", "test/d.txt", "range/01.txt",
    "range/02.txt", "literal/{a,b}.txt"]) {
    writeFixture(dir, name);
  }
  const variants = [
    npmRequire("glob"),
    npmRequire("glob/raw"),
    await import(pathToFileURL(path.join(modules, "glob/dist/esm/index.min.js"))),
    await import(pathToFileURL(path.join(modules, "glob/dist/esm/index.js"))),
  ];
  const pattern = "{src,test}/**/*.{js,ts}";
  const expected = ["src/a.js", "src/nested/b.ts", "test/c.js"];
  for (const glob of variants) {
    assert.deepEqual(glob.globSync(pattern, { cwd: dir }).sort(), expected);
    assert.deepEqual((await glob.glob(pattern, { cwd: dir })).sort(), expected);
    assert.deepEqual([...glob.globIterateSync(pattern, { cwd: dir })].sort(), expected);
    assert.deepEqual(glob.globSync("range/{01..03}.txt", { cwd: dir }).sort(),
      ["range/01.txt", "range/02.txt"]);
    assert.deepEqual(glob.globSync("literal/\\{a,b\\}.txt", { cwd: dir }), ["literal/{a,b}.txt"]);
    assert.throws(() => glob.hasMagic("{a,".repeat(257) + "z" + "}".repeat(257)),
      /maximum nesting depth/);
  }
});

test("npm workspaces with brace patterns install, query and pack offline", { timeout: 30000 }, () => {
  const dir = tempDirectory();
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    name: "atlas-workspace-test",
    private: true,
    version: "1.0.0",
    workspaces: ["packages/{alpha,beta}"],
  }));
  for (const name of ["alpha", "beta", "ignored"]) {
    const workspace = path.join(dir, "packages", name);
    fs.mkdirSync(workspace, { recursive: true });
    fs.writeFileSync(path.join(workspace, "package.json"), JSON.stringify({
      name: `fixture-${name}`, version: "1.0.0",
    }));
    fs.writeFileSync(path.join(workspace, "index.js"), `module.exports = "${name}";\n`);
  }
  const env = {
    ...process.env,
    npm_config_offline: "true",
    npm_config_cache: path.join(dir, "cache"),
    npm_config_logs_max: "0",
  };
  const run = (args) => execFileSync(process.execPath, [path.join(npmRoot, "bin/npm-cli.js"), ...args], {
    cwd: dir, env, encoding: "utf8", timeout: 25000,
  });
  run(["install", "--ignore-scripts", "--no-audit", "--fund=false", "--silent"]);
  const names = JSON.parse(run(["query", ".workspace", "--json"])).map((item) => item.name).sort();
  const packed = JSON.parse(run(["pack", "--dry-run", "--workspaces", "--json"])).map((item) => item.name).sort();
  assert.deepEqual(names, ["fixture-alpha", "fixture-beta"]);
  assert.deepEqual(packed, names);
});

test("installer is idempotent and removes the old package", () => {
  assert.equal(fs.existsSync(path.join(modules, "brace-expansion")), false);
  const before = snapshot(npmRoot);
  const result = runInstaller(managedRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(snapshot(npmRoot), before);
});

test("installer rejects changed files and an altered adapter without modifying npm", () => {
  for (const file of [
    "node_modules/minimatch/dist/commonjs/index.js",
    "atlas-compat/brace-expansion.cjs",
  ]) {
    const fixture = fixtureCopy();
    fs.appendFileSync(path.join(fixture.npm, file), "\n// unexpected change\n");
    const before = snapshot(fixture.npm);
    const result = runInstaller(fixture.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Contenido inesperado|no coincide/);
    assert.deepEqual(snapshot(fixture.npm), before);
  }
});

test("installer rejects dependencies linked outside their expected location", () => {
  const fixture = fixtureCopy();
  const glob = path.join(fixture.npm, "node_modules/glob");
  const moved = path.join(fixture.root, "external-glob");
  fs.renameSync(glob, moved);
  fs.symlinkSync(moved, glob, "dir");
  const before = snapshot(fixture.npm);
  const result = runInstaller(fixture.root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Ubicación inesperada/);
  assert.deepEqual(snapshot(fixture.npm), before);
});
