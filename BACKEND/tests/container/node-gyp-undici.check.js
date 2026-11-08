const assert = require("node:assert/strict");
const { execFile, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const dns = require("node:dns");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { promisify } = require("node:util");
const zlib = require("node:zlib");

const execFileAsync = promisify(execFile);
const npmRoot = process.env.TEST_NPM_ROOT;
if (!npmRoot) throw new Error("TEST_NPM_ROOT must identify the npm installation");
const managedRoot = path.resolve(npmRoot, "../..");
const gypRoot = path.join(npmRoot, "node_modules/node-gyp");
const { download, readCAFile } = require(path.join(gypRoot, "lib/download"));
const version = process.versions.node;
const gypVersion = require(path.join(gypRoot, "package.json")).version;
const npmVersion = require(path.join(npmRoot, "package.json")).version;
const undiciRoot = path.join(managedRoot, "node_modules/undici");
const fixtures = "/test-fixtures";
const cert = fs.readFileSync(path.join(fixtures, "cert.pem"));
const key = fs.readFileSync(path.join(fixtures, "key.pem"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gyp-download-check-"));
const nodeDir = `node-v${version}`;
const archiveName = `${nodeDir}-headers.tar.gz`;
const archivePath = path.join(temp, archiveName);
const fakeHeader = "/* node-gyp download test fixture */\n";
const archiveRoot = path.join(temp, "archive");
fs.mkdirSync(path.join(archiveRoot, nodeDir, "include/node"), { recursive: true });
fs.writeFileSync(path.join(archiveRoot, nodeDir, "include/node/node.h"), fakeHeader);
execFileSync("tar", ["-czf", archivePath, nodeDir], { cwd: archiveRoot });
const archive = fs.readFileSync(archivePath);
const checksum = crypto.createHash("sha256").update(archive).digest("hex");

dns.setDefaultResultOrder("ipv4first");
for (const name of ["HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy"]) {
  delete process.env[name];
}

let proxyConnections = 0;
let attempts = 0;
let lastUserAgent;
const proxySockets = new Set();
const handler = (req, res) => {
  lastUserAgent = req.headers["user-agent"];
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "/data" });
    res.end();
  } else if (req.url === "/gzip") {
    res.writeHead(200, { "content-encoding": "gzip" });
    res.end(zlib.gzipSync("compressed response"));
  } else if (req.url === "/retry") {
    attempts += 1;
    res.writeHead(attempts < 3 ? 503 : 200);
    res.end(attempts < 3 ? "retry" : "recovered");
  } else if (req.url.endsWith(`/${archiveName}`)) {
    res.writeHead(200, { "content-type": "application/octet-stream" });
    res.end(archive);
  } else if (req.url.endsWith("/SHASUMS256.txt")) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`${req.url.startsWith("/bad/") ? "0".repeat(64) : checksum}  ${archiveName}\n`);
  } else if (req.url === "/data") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("response body");
  } else {
    res.writeHead(404);
    res.end("not found");
  }
};

const server = http.createServer(handler);
const tlsServer = https.createServer({ cert, key }, handler);
const proxyHandler = (req, res) => {
  res.writeHead(500);
  res.end("unexpected non-CONNECT proxy request");
};
const proxy = http.createServer(proxyHandler);
const tlsProxy = https.createServer({ cert, key }, proxyHandler);
for (const instance of [proxy, tlsProxy]) {
  instance.on("connection", (socket) => {
    proxySockets.add(socket);
    socket.on("close", () => proxySockets.delete(socket));
  });
  instance.on("connect", (req, client, head) => {
    proxyConnections += 1;
    const [host, port] = req.url.split(":");
    if (!["localhost", "127.0.0.1"].includes(host)) {
      client.destroy(new Error(`Unexpected proxy target: ${req.url}`));
      return;
    }
    const upstream = net.connect(Number(port), host, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  });
}

const listen = (instance) => new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
const endpoint = () => `http://127.0.0.1:${server.address().port}`;
const secureEndpoint = (host = "localhost") => `https://${host}:${tlsServer.address().port}`;
const proxyEndpoint = () => `http://127.0.0.1:${proxy.address().port}`;
const gyp = (opts = {}) => ({ version: gypVersion, opts });

before(async () => {
  await Promise.all([listen(server), listen(tlsServer), listen(proxy), listen(tlsProxy)]);
});

after(async () => {
  for (const socket of proxySockets) socket.destroy();
  for (const instance of [server, tlsServer, proxy, tlsProxy]) instance.closeAllConnections();
  await Promise.all([server, tlsServer, proxy, tlsProxy].map((instance) => new Promise((resolve) => instance.close(resolve))));
  fs.rmSync(temp, { recursive: true, force: true });
});

test("npm and npx retain local and global package operations", { timeout: 30000 }, async () => {
  const cache = path.join(temp, "npm-cache");
  const env = { ...process.env, npm_config_offline: "true", npm_config_cache: cache, npm_config_logs_max: "0" };
  const run = (command, args) => execFileAsync(command, args, { env, timeout: 25000, maxBuffer: 5 * 1024 * 1024 });
  assert.equal((await run("npm", ["--version"])).stdout.trim(), npmVersion);
  assert.equal((await run("npx", ["--version"])).stdout.trim(), npmVersion);
  assert.equal((await run("npx", ["--no-install", "node", "--version"])).stdout.trim(), `v${version}`);
  await run("npm", ["ls", "--prefix", managedRoot, "--all", "--json"]);
  const globalTree = JSON.parse((await run("npm", ["ls", "--global", "--all", "--json"])).stdout);
  assert.equal(globalTree.dependencies?.npm, undefined);

  const undiciVersion = require(path.join(undiciRoot, "package.json")).version;
  assert.equal(undiciVersion, "7.30.2");
  const packed = await run("npm", ["pack", "--ignore-scripts", "--pack-destination", temp, "--quiet", undiciRoot]);
  const tarball = path.join(temp, packed.stdout.trim());
  const project = path.join(temp, "project");
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({
    private: true,
    dependencies: { undici: `file:${tarball}` },
  }));
  await run("npm", ["install", "--prefix", project, "--ignore-scripts", "--no-audit", "--fund=false"]);
  await run("npm", ["ci", "--prefix", project, "--ignore-scripts", "--no-audit", "--fund=false"]);
  assert.equal(require(path.join(project, "node_modules/undici/package.json")).version, undiciVersion);

  const globalPrefix = path.join(temp, "global");
  await run("npm", ["install", "--global", "--prefix", globalPrefix, "--ignore-scripts", "--no-audit", "--fund=false", tarball]);
  const installed = JSON.parse((await run("npm", ["ls", "--global", "--prefix", globalPrefix, "--all", "--json"])).stdout);
  assert.equal(installed.dependencies.undici.version, undiciVersion);
});

test("downloads responses and preserves node-gyp headers", async () => {
  const result = await download(gyp(), `${endpoint()}/data`);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "response body");
  assert.equal(lastUserAgent, `node-gyp v${gypVersion} (node v${version})`);
});

test("follows redirects and returns non-success responses", async () => {
  const redirected = await download(gyp(), `${endpoint()}/redirect`);
  assert.equal(redirected.url, `${endpoint()}/data`);
  assert.equal(await redirected.text(), "response body");
  const missing = await download(gyp(), `${endpoint()}/missing`);
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), "not found");
});

test("handles compressed responses and retries transient failures", async () => {
  const compressed = await download(gyp(), `${endpoint()}/gzip`);
  assert.equal(await compressed.text(), "compressed response");
  const recovered = await download(gyp(), `${endpoint()}/retry`);
  assert.equal(recovered.status, 200);
  assert.equal(await recovered.text(), "recovered");
  assert.equal(attempts, 3);
});

test("requires a trusted certificate and validates its hostname", async () => {
  await assert.rejects(download(gyp(), `${secureEndpoint()}/data`), (err) =>
    ["DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"].includes(err.code));
  const cafile = path.join(fixtures, "cert.pem");
  const certificates = await readCAFile(cafile);
  assert.equal(certificates.length, 1);
  const trusted = await download(gyp({ cafile }), `${secureEndpoint()}/data`);
  assert.equal(await trusted.text(), "response body");
  await assert.rejects(download(gyp({ cafile }), `${secureEndpoint("127.0.0.1")}/data`), (err) =>
    err.code === "ERR_TLS_CERT_ALTNAME_INVALID");
});

test("supports explicitly configured HTTP and HTTPS proxies", async () => {
  const count = proxyConnections;
  const httpResult = await download(gyp({ proxy: proxyEndpoint() }), `${endpoint()}/data`);
  assert.equal(await httpResult.text(), "response body");
  const tlsResult = await download(gyp({ proxy: proxyEndpoint(), cafile: path.join(fixtures, "cert.pem") }), `${secureEndpoint()}/data`);
  assert.equal(await tlsResult.text(), "response body");
  assert.ok(proxyConnections >= count + 2);
  const secureProxy = `https://localhost:${tlsProxy.address().port}`;
  const tunneled = await download(gyp({ proxy: secureProxy, cafile: path.join(fixtures, "cert.pem") }), `${secureEndpoint()}/data`);
  assert.equal(await tunneled.text(), "response body");
  assert.ok(proxyConnections >= count + 3);
});

test("supports proxy environment variables and no-proxy configuration", async () => {
  process.env.HTTP_PROXY = proxyEndpoint();
  try {
    const count = proxyConnections;
    const proxied = await download(gyp(), `${endpoint()}/data`);
    assert.equal(await proxied.text(), "response body");
    assert.ok(proxyConnections > count);
    const afterProxy = proxyConnections;
    const direct = await download(gyp({ noproxy: "127.0.0.1" }), `${endpoint()}/data`);
    assert.equal(await direct.text(), "response body");
    assert.equal(proxyConnections, afterProxy);
  } finally {
    delete process.env.HTTP_PROXY;
  }
});

test("node-gyp installs and checksums headers from an HTTP server", { timeout: 30000 }, async () => {
  const devdir = path.join(temp, "dev");
  await execFileAsync(process.execPath, [
    path.join(gypRoot, "bin/node-gyp.js"),
    "install",
    version,
    "--devdir",
    devdir,
    "--dist-url",
    endpoint(),
  ], { env: process.env, timeout: 25000 });
  assert.equal(fs.readFileSync(path.join(devdir, version, "include/node/node.h"), "utf8"), fakeHeader);
});

test("node-gyp rejects headers with an invalid checksum", { timeout: 30000 }, async () => {
  await assert.rejects(execFileAsync(process.execPath, [
    path.join(gypRoot, "bin/node-gyp.js"),
    "install",
    version,
    "--devdir",
    path.join(temp, "invalid"),
    "--dist-url",
    `${endpoint()}/bad`,
  ], { env: process.env, timeout: 25000 }), (error) => {
    assert.notEqual(error.code, 0);
    assert.match(error.stderr, /checksum|SHASUM/i);
    return true;
  });
});
