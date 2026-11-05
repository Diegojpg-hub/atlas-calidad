const request = require("supertest");

jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");

beforeEach(() => pool.query.mockReset());

describe("POST /auditoria (control de acceso)", () => {
  // Describe el comportamiento ESPERADO (requisito de seguridad).
  // Con el código original FALLA: la API escribe en la bitácora sin pedir token.
  test("debe responder 401 si no se envía token", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: null, accion: "intruso" }] });
    const res = await request(app)
      .post("/auditoria")
      .send({ accion: "intruso", detalles: "registro sin sesión" });
    expect(res.status).toBe(401);
  });
});