const proxyAddress = require("../../src/proxy-addr-compat");

describe("Adaptador de direcciones detrás de proxies", () => {
  test.each([
    ["10.0.0.0/8", "10.1.2.3", true],
    ["10.0.0.0/8", "::ffff:10.1.2.3", true],
    ["10.0.0.0/8", "203.0.113.1", false],
    ["10.0.0.0/8", "fe80::1", false],
    ["192.168.1.1/255.255.255.0", "192.168.1.20", true],
    ["0177.0.0.1", "127.0.0.1", true],
    ["::ffff:10.0.0.1", "10.0.0.1", true],
    ["::ffff:10.0.0.0/8", "8.8.8.8", false],
    ["::ffff:10.0.0.0/8", "::ffff:10.0.0.1", false],
    ["::ffff:10.0.0.0/8", "::1", false],
    ["::ffff:0.0.0.0/95", "8.8.8.8", false],
    ["::ffff:0.0.0.0/96", "8.8.8.8", true],
    ["::ffff:10.0.0.0/104", "10.1.2.3", true],
    ["::ffff:10.0.0.0/104", "::ffff:8.8.8.8", false],
    ["::/1", "::ffff:10.0.0.1", false],
    ["fc00::/7", "fc00::1", true],
    ["fe80::1%eth0/64", "fe80::2%eth0", true],
    ["loopback", "::1", true],
    ["linklocal", "169.254.1.2", true],
    ["uniquelocal", "192.168.1.2", true],
    ["loopback", "no-es-una-ip", false],
  ])("evalúa %s para %s", (subnet, address, expected) => {
    expect(proxyAddress.compile(subnet)(address)).toBe(expected);
  });

  test("combina rangos sin modificar la configuración recibida", () => {
    const ranges = ["::ffff:10.0.0.0/8", "10.0.0.0/8", "loopback"];
    const trust = proxyAddress.compile(ranges);
    expect(trust("10.0.0.1")).toBe(true);
    expect(trust("8.8.8.8")).toBe(false);
    expect(ranges).toEqual(["::ffff:10.0.0.0/8", "10.0.0.0/8", "loopback"]);
    expect(proxyAddress.compile([])("127.0.0.1")).toBe(false);
  });

  test.each([
    ["linklocal", "169.254.0.0", true],
    ["linklocal", "169.254.255.255", true],
    ["linklocal", "169.255.0.0", false],
    ["linklocal", "fe80::", true],
    ["linklocal", "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["linklocal", "fec0::", false],
    ["loopback", "127.0.0.0", true],
    ["loopback", "127.255.255.255", true],
    ["loopback", "128.0.0.0", false],
    ["loopback", "::1", true],
    ["loopback", "::2", false],
    ["uniquelocal", "10.0.0.0", true],
    ["uniquelocal", "10.255.255.255", true],
    ["uniquelocal", "11.0.0.0", false],
    ["uniquelocal", "172.16.0.0", true],
    ["uniquelocal", "172.31.255.255", true],
    ["uniquelocal", "172.32.0.0", false],
    ["uniquelocal", "192.168.0.0", true],
    ["uniquelocal", "192.168.255.255", true],
    ["uniquelocal", "192.169.0.0", false],
    ["uniquelocal", "fc00::", true],
    ["uniquelocal", "fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["uniquelocal", "fe00::", false],
  ])("conserva el límite de %s para %s", (subnet, address, expected) => {
    expect(proxyAddress.compile(subnet)(address)).toBe(expected);
  });

  test.each([
    undefined, null, "", 42, "no-es-una-ip", "10.0.0.1/",
    "10.0.0.1/0", "10.0.0.1/33", "10.0.0.1/255.0.255.0",
    "10.0.0.1/::1", "::1/129", "::1/-1", [undefined], new Array(1),
  ].map((value) => [value]))("rechaza una configuración inválida: %p", (value) => {
    expect(() => proxyAddress.compile(value)).toThrow(TypeError);
  });

  test("procesa la cadena de proxies hasta la primera dirección no confiable", () => {
    const req = {
      socket: { remoteAddress: "127.0.0.1" },
      headers: { "x-forwarded-for": "203.0.113.1, 10.1.2.3" },
    };
    expect(proxyAddress.all(req)).toEqual(["127.0.0.1", "10.1.2.3", "203.0.113.1"]);
    expect(proxyAddress(req, ["loopback", "10.0.0.0/8"])).toBe("203.0.113.1");

    const calls = [];
    expect(proxyAddress.all(req, (address, index) => {
      calls.push([address, index]);
      return index === 0;
    })).toEqual(["127.0.0.1", "10.1.2.3"]);
    expect(calls).toEqual([["127.0.0.1", 0], ["10.1.2.3", 1]]);
  });

  test("exige la solicitud y el criterio de confianza", () => {
    expect(() => proxyAddress()).toThrow(/req.*required/);
    expect(() => proxyAddress({})).toThrow(/trust.*required/);
    expect(() => proxyAddress.all()).toThrow(/req.*required/);
  });
});
