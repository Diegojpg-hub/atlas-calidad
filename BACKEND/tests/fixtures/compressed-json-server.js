const assert = require("node:assert/strict");
const { once } = require("node:events");
const http = require("node:http");
const zlib = require("node:zlib");

const app = require("../../src/app");
const { pool } = require("../../src/db");

function request(port, path, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, agent: false, ...options },
      (res) => {
        let response = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          response += chunk;
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({ status: res.statusCode, body: response })
        );
      }
    );
    req.on("error", reject);
    req.setTimeout(3000, () => req.destroy(new Error("Request timed out")));
    req.end(body);
  });
}

async function main() {
  const encoding = process.argv[2];
  const compressors = { gzip: zlib.gzipSync, deflate: zlib.deflateSync };
  assert.ok(compressors[encoding], `Unsupported encoding: ${encoding}`);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const port = server.address().port;
    const compressed = compressors[encoding](Buffer.from('{"a":1}'));
    for (const body of [
      compressed,
      Buffer.concat([compressed, Buffer.from([0]), Buffer.alloc(100 * 1024, 0x58)]),
    ]) {
      const response = await request(
        port,
        "/autenticacion/login",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-encoding": encoding,
            "content-length": body.length,
          },
        },
        body
      );
      assert.equal(response.status, 400);
      assert.equal(JSON.parse(response.body).error, "Error de validación");
      await new Promise((resolve) => setTimeout(resolve, 300));
      const health = await request(port, "/");
      assert.equal(health.status, 200);
      assert.deepEqual(JSON.parse(health.body), { name: "Atlas", status: "ok" });
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
