const request = require("supertest");
const bcrypt = require("bcryptjs");
 
// 1) Reemplazamos la base de datos real por un "doble de prueba" (mock).
jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");
 
// Hash de la contraseña "admin", igual al que guardaría la base de datos
const HASH_ADMIN = bcrypt.hashSync("admin", 4);
 
beforeEach(() => {
  pool.query.mockReset();
});
 
describe("POST /autenticacion/login", () => {
  test("400 si faltan datos obligatorios", async () => {
    const res = await request(app).post("/autenticacion/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Error de validación");
    expect(pool.query).not.toHaveBeenCalled();
  });
 
  test("401 si el usuario no existe", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post("/autenticacion/login")
      .send({ nombre_usuario: "fantasma", password: "x" });
    expect(res.status).toBe(401);
  });
 
  test("401 si la contraseña es incorrecta", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: HASH_ADMIN }],
    });
    const res = await request(app)
      .post("/autenticacion/login")
      .send({ nombre_usuario: "admin", password: "otra" });
    expect(res.status).toBe(401);
  });
 
  test("200 y entrega un token si las credenciales son correctas", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: HASH_ADMIN }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, empresa_id: 1, rol_id: 1, rol_nombre: "administrador" }],
      })
      .mockResolvedValueOnce({ rows: [] }); // INSERT en auditoría
 
    const res = await request(app)
      .post("/autenticacion/login")
      .send({ nombre_usuario: "admin", password: "admin" });
 
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });
});