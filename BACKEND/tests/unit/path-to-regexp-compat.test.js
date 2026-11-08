const path = require("node:path");
const { spawnSync } = require("node:child_process");
const compile = require("../../src/path-to-regexp-compat");

describe("Compatibilidad del enrutador de Express", () => {
  test.each([
    ["/:id", "/ABC", ["/ABC", "ABC"], ["id"]],
    ["/:id/files", "/123/files", ["/123/files", "123"], ["id"]],
    ["/:file.:format?", "/report.pdf", ["/report.pdf", "report", "pdf"], ["file", "format"]],
    ["/:file.:format?", "/report", ["/report", "report", undefined], ["file", "format"]],
    ["/:first-:second-:third", "/a-b-c-d", ["/a-b-c-d", "a-b", "c", "d"], ["first", "second", "third"]],
    ["/:id(\\d+)", "/123", ["/123", "123"], ["id"]],
    ["/:id((\\d)+)/:name", "/123/abc", ["/123/abc", "3", "3", "abc"], ["id", 0, "name"]],
    ["/files/:file(*)", "/files/report", ["/files/report", "report", "report"], ["file", 0]],
    ["/:id*", "/one/two", ["/one/two", "one", "/two"], ["id", 0]],
    ["/files/*", "/files/one/two", ["/files/one/two", "one/two"], [0]],
    ["/:foo\\(:bar?\\)", "/hello(world)", ["/hello(world)", "hello", "world"], ["foo", "bar"]],
    ["/:foo\\\\(world)", "/hello\\world", ["/hello\\world", "hello", "world"], ["foo", 0]],
  ])("conserva las capturas de %s", (route, input, expected, names) => {
    const keys = [];
    const match = compile(route, keys).exec(input);
    expect(match && [...match]).toEqual(expected);
    expect(keys.map((key) => key.name)).toEqual(names);
  });

  test("conserva los metadatos de parámetros opcionales y sus posiciones", () => {
    const keys = [];
    const regexp = compile("/:a.:b?", keys);
    expect(keys).toEqual([
      { name: "a", optional: false, offset: 0 },
      { name: "b", optional: true, offset: 13 },
    ]);
    expect([...regexp.exec("/report")]).toEqual(["/report", "report", undefined]);
  });

  test("conserva las opciones de coincidencia", () => {
    expect(compile("/route", null, { sensitive: true }).test("/ROUTE")).toBe(false);
    expect(compile("/route", null, { strict: true }).test("/route/")).toBe(false);
    expect(compile("/:id", null, { end: false }).exec("/item/child")[0]).toBe("/item");
    expect(compile("/:id", null, { end: false, lookahead: false }).exec("/item/child")[0])
      .toBe("/item/");
    expect(compile("/route/", null, { end: false, strict: true }).exec("/route/child")[0])
      .toBe("/route/");
    expect(compile("/route", null, null).test("/route/")).toBe(true);
  });

  test("conserva arreglos de rutas y expresiones regulares", () => {
    const keys = [];
    const regexp = compile(["/:id", "/files/*"], keys);
    expect([...regexp.exec("/files/one")]).toEqual(["/files/one", undefined, "one"]);
    expect(keys.map((key) => key.name)).toEqual(["id", 0]);

    const direct = /^\/(?<name>[^/]+)\/(\d+)$/;
    const directKeys = [];
    expect(compile(direct, directKeys)).toBe(direct);
    expect(directKeys.map((key) => key.name)).toEqual(["name", 0]);
  });

  test("rechaza patrones ambiguos sin modificar los resultados silenciosamente", () => {
    expect(() => compile("/:a:b")).toThrow(/parámetros adyacentes/);
    expect(() => compile("/*/*")).toThrow(/varios comodines/);
    expect(() => compile("/:file(*)/*")).toThrow(/varios comodines/);
    expect(() => compile(() => {})).toThrow(/path must be a string/);
  });

  test("no retrocede excesivamente con tres parámetros separados", () => {
    const modulePath = path.join(__dirname, "../../src/path-to-regexp-compat.js");
    const script = `
      const compile = require(${JSON.stringify(modulePath)});
      const regexp = compile("/:a-:b-:c/end");
      if (regexp.test("/" + "a-".repeat(4096) + "z/not-end")) process.exit(1);
    `;
    const result = spawnSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      timeout: 3000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });
});
