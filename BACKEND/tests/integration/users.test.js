const request = require("supertest");
 
jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");
 
beforeEach(() => pool.query.mockReset());
 
describe("POST /usuarios (control de acceso)", () => {
  // Esta prueba describe el comportamiento ESPERADO (requisito de seguridad).
  // Con el código original FALLA: la API crea usuarios sin pedir token.
  test("debe responder 401 si no se envía token", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99, nombre_usuario: "intruso" }] });
    const res = await request(app)
      .post("/usuarios")
      .send({ nombre_usuario: "intruso", contrasena_hash: "Clave123!", correo: "x@x.cl" });
    expect(res.status).toBe(401);
  });
});