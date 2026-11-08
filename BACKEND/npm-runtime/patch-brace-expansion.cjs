"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.length !== 3) {
  throw new Error("Indique la ubicación de npm administrado");
}

const root = path.resolve(process.argv[2]);
if (fs.realpathSync(root) !== root) {
  throw new Error("npm administrado no puede estar enlazado a otra ubicación");
}
const npmRoot = path.join(root, "node_modules/npm");
const modules = path.join(npmRoot, "node_modules");
const compatDir = path.join(npmRoot, "atlas-compat");
const braceRoot = path.join(modules, "brace-expansion");

const fixedFiles = {
  "package.json": "f6478d5600180a23f73e4217610c7709a71cedb4ae13f6c3e15ecb457f5d4fd6",
  "node_modules/balanced-match/package.json": "c984e6ae5c41fac085a07a732b665b22e0a26f28b61c692ba18ff458a8ecc95a",
  "node_modules/balanced-match/dist/commonjs/index.js": "180549ef6f34f31e245f3060395dc453a602849558fd6657d11c28509b33347c",
  "node_modules/balanced-match/dist/esm/index.js": "3070c820855fe9e6596fc2a00effd7a18882dff166d6326903e1940d6eb4082a",
  "node_modules/glob/package.json": "5a28ef9a1f5252feb47ffe288a6350fe99b18311462e6a9cdacbdd0bb4be6be9",
  "node_modules/glob/dist/commonjs/index.js": "be0581401dff74824abe8ecd4f177d96535fdc1fe1b6698a9b4a4a9c4448bb61",
  "node_modules/glob/dist/esm/index.js": "c1c6edeb1f365b61dba99c88592aba8bf36fde8bc6d9f7c515e78086d87e2380",
  "node_modules/glob/dist/commonjs/glob.js": "3c707e4e8f27c17247412789ddbea9f70fbbcc1570f5dd79e25037ebe6e4404f",
  "node_modules/glob/dist/esm/glob.js": "bd01ce3815a4745b5a357936f8d82a01d3275deb22b093de3ce4b41e8e46d676",
};
const patchedFiles = {
  "node_modules/minimatch/package.json": [
    "4b3a08a7ad20dead8bbe4b4fe97a2746bded7c51d218ef3034eb4e330ad31f08",
    "01e01e09f0c6e82bfd8e10647c0d94f790e0414faf77ac611b2eef9351247599",
  ],
  "node_modules/minimatch/dist/commonjs/index.js": [
    "b28ba241b1303aac698e7a458d0e098f136c46ca368165a1f748d0a188493c81",
    "13cc0af16ab89a540247a4c3021f19b87bfe4832e87f3d3e22bb882db05c298c",
  ],
  "node_modules/minimatch/dist/esm/index.js": [
    "76a8124bb801de35395c078338fbd083ba5a6858d40e9b5038808048fdd58202",
    "999b38bee8911a6fc799792fc0a135d4ca2f9eaa76d3bd627f376f2626504399",
  ],
  "node_modules/glob/dist/commonjs/index.min.js": [
    "3178e109aa75b45d6970a51a718f01e5b5b8f87150563ee6cb4c0e75ec215617",
    "d603dfa556559e27cd5ebe78abb2e8d9b3364b4f3fbcf871f122af6cb5560ec5",
  ],
  "node_modules/glob/dist/esm/index.min.js": [
    "9eff492e16fdf9ea47a5f3c3d64784f9238b607f95a278101eb5a4e882f6ea85",
    "bdca436da3133a3c4112f8f32ef8e349bd5942118d14112a5c929bf26017c852",
  ],
};
const braceFiles = {
  "LICENSE": "9c63a23124d68cd30cd316a94a1a0bca34f032786df6df69fc4b5f136bac8d2e",
  "dist/commonjs/index.js": "8d1ea713e1dd03f52783bbceea9d85815a3587134d1936ea16257dea83884f15",
  "dist/commonjs/package.json": "8005a3491db7d92f36ac66369861589f9c47123d3a7c71e643fc2c06168cd45a",
  "dist/esm/index.js": "af0e6438163b5ef866c52680ec58756bcf00cff330729c0d6a3a44ee57bde9d1",
  "dist/esm/package.json": "3ca9d4afd21425087cf31893b8f9f63c81b0b8408db5e343ca76e5f8aa26ab9a",
  "package.json": "f8a0e0d0a6cbb58106ce6832205e0939a00b9583637011bf8ef4167f4a52fbda",
};

function digest(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function readRealFile(file) {
  if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) {
    throw new Error(`Ubicación inesperada: ${file}`);
  }
  return fs.readFileSync(file);
}

function readExpected(file, expected) {
  const content = readRealFile(file);
  if (digest(content) !== expected) {
    throw new Error(`Contenido inesperado: ${file}`);
  }
  return content;
}

function assertResolution(request, from, expected) {
  const actual = require.resolve(request, { paths: [from] });
  if (actual !== expected || fs.realpathSync(actual) !== expected) {
    throw new Error(`Resolución inesperada de ${request}: ${actual}`);
  }
}

function replaceOnce(source, before, after, file) {
  if (source.split(before).length !== 2 || source.includes(after)) {
    throw new Error(`No se puede redirigir ${file}`);
  }
  return source.replace(before, after);
}

function replaceRange(source, start, end, replacement, file) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin + start.length);
  if (begin < 0 || finish < 0 || source.indexOf(start, begin + start.length) !== -1 ||
      source.indexOf(end, finish + end.length) !== -1) {
    throw new Error(`No se puede sustituir la expansión integrada en ${file}`);
  }
  return source.slice(0, begin) + replacement + source.slice(finish);
}

function relativeImport(file, target) {
  const relative = path.relative(path.dirname(file), target).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

for (const [file, hash] of Object.entries(fixedFiles)) {
  readExpected(path.join(npmRoot, file), hash);
}
const versions = [
  ["package.json", "npm", "11.19.1"],
  ["node_modules/minimatch/package.json", "minimatch", "10.2.5"],
  ["node_modules/glob/package.json", "glob", "13.0.6"],
  ["node_modules/balanced-match/package.json", "balanced-match", "4.0.4"],
];
for (const [file, name, version] of versions) {
  const manifest = JSON.parse(readRealFile(path.join(npmRoot, file)));
  if (manifest.name !== name || manifest.version !== version) {
    throw new Error(`Versión inesperada de ${name}: ${manifest.version}`);
  }
}
const minimatchRoot = path.join(modules, "minimatch");
const globRoot = path.join(modules, "glob");
assertResolution("balanced-match", npmRoot, path.join(modules, "balanced-match/dist/commonjs/index.js"));
assertResolution("minimatch", globRoot, path.join(minimatchRoot, "dist/commonjs/index.js"));
assertResolution("glob", npmRoot, path.join(globRoot, "dist/commonjs/index.min.js"));
assertResolution("glob/raw", npmRoot, path.join(globRoot, "dist/commonjs/index.js"));

const sources = new Map();
for (const [file, hashes] of Object.entries(patchedFiles)) {
  const content = readRealFile(path.join(npmRoot, file));
  const hash = digest(content);
  if (!hashes.includes(hash)) throw new Error(`Contenido inesperado: ${file}`);
  sources.set(file, content);
}
const allOriginal = Object.entries(patchedFiles).every(([file, hashes]) => digest(sources.get(file)) === hashes[0]);
const allPatched = Object.entries(patchedFiles).every(([file, hashes]) => digest(sources.get(file)) === hashes[1]);
if (!allOriginal && !allPatched) {
  throw new Error("La instalación de expansión de llaves está parcialmente modificada");
}

const compatCjs = path.join(compatDir, "brace-expansion.cjs");
const compatEsm = path.join(compatDir, "brace-expansion.mjs");
const adapterCjs = readRealFile(path.join(__dirname, "brace-expansion-compat.cjs"));
const adapterEsm = readRealFile(path.join(__dirname, "brace-expansion-compat.mjs"));

if (allPatched) {
  if (fs.existsSync(braceRoot) ||
      !readRealFile(compatCjs).equals(adapterCjs) || !readRealFile(compatEsm).equals(adapterEsm)) {
    throw new Error("La instalación existente del adaptador no coincide con su configuración");
  }
} else {
  if (fs.existsSync(compatDir) || fs.realpathSync(braceRoot) !== braceRoot ||
      !fs.lstatSync(braceRoot).isDirectory()) {
    throw new Error("Ubicación inesperada del adaptador o de brace-expansion");
  }
  for (const [dir, names] of Object.entries({
    ".": ["LICENSE", "dist", "package.json"],
    "dist": ["commonjs", "esm"],
    "dist/commonjs": ["index.js", "package.json"],
    "dist/esm": ["index.js", "package.json"],
  })) {
    const absolute = path.resolve(braceRoot, dir);
    if (fs.realpathSync(absolute) !== absolute || !fs.lstatSync(absolute).isDirectory() ||
        JSON.stringify(fs.readdirSync(absolute).sort()) !== JSON.stringify(names)) {
      throw new Error(`Contenido inesperado de brace-expansion: ${absolute}`);
    }
  }
  for (const [file, hash] of Object.entries(braceFiles)) {
    readExpected(path.join(braceRoot, file), hash);
  }
  assertResolution("brace-expansion", minimatchRoot, path.join(braceRoot, "dist/commonjs/index.js"));

  const changes = new Map();
  const manifestPath = "node_modules/minimatch/package.json";
  const manifest = JSON.parse(sources.get(manifestPath));
  if (manifest.dependencies["brace-expansion"] !== "^5.0.5" ||
      Object.hasOwn(manifest.dependencies, "balanced-match")) {
    throw new Error("Dependencias inesperadas de minimatch");
  }
  delete manifest.dependencies["brace-expansion"];
  manifest.dependencies["balanced-match"] = "4.0.4";
  changes.set(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const minimatchCjs = "node_modules/minimatch/dist/commonjs/index.js";
  const minimatchEsm = "node_modules/minimatch/dist/esm/index.js";
  changes.set(minimatchCjs, replaceOnce(sources.get(minimatchCjs).toString(),
    'const brace_expansion_1 = require("brace-expansion");',
    `const brace_expansion_1 = require(${JSON.stringify(relativeImport(path.join(npmRoot, minimatchCjs), compatCjs))});`,
    minimatchCjs));
  changes.set(minimatchEsm, replaceOnce(sources.get(minimatchEsm).toString(),
    "import { expand } from 'brace-expansion';",
    `import { expand } from ${JSON.stringify(relativeImport(path.join(npmRoot, minimatchEsm), compatEsm))};`,
    minimatchEsm));

  const globCjs = "node_modules/glob/dist/commonjs/index.min.js";
  const globEsm = "node_modules/glob/dist/esm/index.min.js";
  changes.set(globCjs, replaceRange(sources.get(globCjs).toString(),
    'var Ke=R(it=>{"use strict";Object.defineProperty(it,"__esModule",{value:!0});it.EXPANSION_MAX=void 0;it.expand=ei;',
    'var Xe=R(Ct=>{"use strict";Object.defineProperty(Ct,"__esModule",{value:!0});Ct.assertValidPattern=void 0;',
    `var Ke=R(it=>{Object.assign(it,require(${JSON.stringify(relativeImport(path.join(npmRoot, globCjs), compatCjs))}));it.expand=it.expandGlob});`,
    globCjs));
  changes.set(globEsm, replaceRange(sources.get(globEsm).toString(),
    'var fe="\\0SLASH"+Math.random()+"\\0",ue="\\0OPEN"',
    'var at=n=>{if(typeof n!="string")throw new TypeError("invalid pattern");',
    `import { expandGlob as ge } from ${JSON.stringify(relativeImport(path.join(npmRoot, globEsm), compatEsm))};`,
    globEsm));

  for (const [file, content] of changes) {
    if (digest(content) !== patchedFiles[file][1]) {
      throw new Error(`Resultado inesperado al sustituir ${file}`);
    }
  }

  const staged = [];
  try {
    fs.mkdirSync(compatDir);
    for (const [file, content] of [
      [compatCjs, adapterCjs],
      [compatEsm, adapterEsm],
      ...[...changes].map(([file, content]) => [path.join(npmRoot, file), content]),
    ]) {
      const temporary = `${file}.atlas-${process.pid}.tmp`;
      fs.writeFileSync(temporary, content, { flag: "wx" });
      staged.push([temporary, file]);
    }
    for (const [temporary, file] of staged) fs.renameSync(temporary, file);
    fs.rmSync(braceRoot, { recursive: true });
  } finally {
    for (const [temporary] of staged) {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
}
