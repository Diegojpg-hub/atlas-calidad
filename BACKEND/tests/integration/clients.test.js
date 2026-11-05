const request = require("supertest");
const jwt = require("jsonwebtoken");
 
jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");
 
// Mismo secreto que definimos en tests/setup-env.js
const SECRET = process.env.JWT_SECRET;
const tokenValido = jwt.sign(
  { usuarioId: 1, nombreUsuario: "admin", empresaId: 1, rolNombre: "administrador" },
  SECRET
);
 
beforeEach(() => pool.query.mockReset());
 
describe("GET /clientes", () => {
  test("401 sin token", async () => {
    const res = await request(app).get("/clientes");
    expect(res.status).toBe(401);
  });
 
  test("401 con un token firmado con otro secreto", async () => {
    const falso = jwt.sign({ empresaId: 1 }, "otro-secreto");
    const res = await request(app)
      .get("/clientes")
      .set("Authorization", `Bearer ${falso}`);
    expect(res.status).toBe(401);
  });
 
  test("200 y lista solo los clientes de la empresa del token", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: "María González" }] });
    const res = await request(app)
      .get("/clientes")
      .set("Authorization", `Bearer ${tokenValido}`);
 
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // Verificamos que la consulta filtró por la empresa del usuario (empresaId = 1)
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});
 
describe("GET /clientes/:id", () => {
  test("404 si el cliente no existe o es de otra empresa", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/clientes/999")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.status).toBe(404);
  });
});
 
describe("Manejo de errores", () => {
  test("500 cuando la base de datos falla", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));
    const res = await request(app)
      .get("/clientes")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.status).toBe(500);
  });
});