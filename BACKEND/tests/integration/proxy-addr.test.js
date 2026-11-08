const express = require("express");
const request = require("supertest");

function appWithTrust(trust) {
  const app = express();
  if (trust !== undefined) app.set("trust proxy", trust);
  app.get("/ip", (req, res) => res.json({
    ip: req.ip,
    ips: req.ips,
    socket: req.socket.remoteAddress,
    protocol: req.protocol,
    hostname: req.hostname,
  }));
  return app;
}

function forwardedRequest(app) {
  return request(app)
    .get("/ip")
    .set("X-Forwarded-For", "198.51.100.7, 10.2.3.4")
    .set("X-Forwarded-Proto", "https")
    .set("X-Forwarded-Host", "forwarded.example");
}

describe("Confianza de Express en proxies", () => {
  test.each([undefined, "::ffff:10.0.0.0/8", "::/1"])(
    "no acepta cabeceras de un socket no confiable con %p",
    async (trust) => {
      const res = await forwardedRequest(appWithTrust(trust));
      expect(res.status).toBe(200);
      expect(res.body.ip).toBe(res.body.socket);
      expect(res.body.ips).toEqual([]);
      expect(res.body.protocol).toBe("http");
      expect(res.body.hostname).not.toBe("forwarded.example");
    }
  );

  test("conserva la cadena y las cabeceras de proxies confiables", async () => {
    const res = await forwardedRequest(appWithTrust(["loopback", "10.0.0.0/8"]));
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe("198.51.100.7");
    expect(res.body.ips).toEqual(["198.51.100.7", "10.2.3.4"]);
    expect(res.body.protocol).toBe("https");
    expect(res.body.hostname).toBe("forwarded.example");
  });

  test("conserva la configuración por número de saltos", async () => {
    const res = await forwardedRequest(appWithTrust(1));
    expect(res.body.ip).toBe("10.2.3.4");
    expect(res.body.ips).toEqual(["10.2.3.4"]);
  });
});
