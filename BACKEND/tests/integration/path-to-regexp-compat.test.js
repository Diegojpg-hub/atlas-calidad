const express = require("express");
const request = require("supertest");

describe("Enrutamiento de Express con el adaptador", () => {
  test("resuelve parámetros separados en un mismo segmento", async () => {
    const app = express();
    app.get("/:first-:second-:third", (req, res) => res.json(req.params));

    const response = await request(app).get("/a-b-c-d").expect(200);
    expect(response.body).toEqual({ first: "a-b", second: "c", third: "d" });
  });

  test("conserva la coincidencia parcial de middleware montado", async () => {
    const app = express();
    app.use("/items/:id", (req, res) => res.json({ id: req.params.id, path: req.path }));

    const response = await request(app).get("/items/42/detail").expect(200);
    expect(response.body).toEqual({ id: "42", path: "/detail" });
  });

  test("falla al registrar rutas ambiguas", () => {
    const app = express();
    expect(() => app.get("/:a:b", (_req, res) => res.end())).toThrow(/parámetros adyacentes/);
    expect(() => app.get("/*/*", (_req, res) => res.end())).toThrow(/varios comodines/);
  });
});
