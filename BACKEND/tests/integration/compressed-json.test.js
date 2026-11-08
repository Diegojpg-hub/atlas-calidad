const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const fixture = path.join(__dirname, "../fixtures/compressed-json-server.js");

describe("Cuerpos JSON comprimidos", () => {
  test.each(["gzip", "deflate"])(
    "la API sigue respondiendo tras datos adicionales en %s",
    async (encoding) => {
      await execFileAsync(process.execPath, [fixture, encoding], {
        env: process.env,
        timeout: 10000,
      });
    },
    15000
  );
});
