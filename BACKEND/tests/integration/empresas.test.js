const request = require("supertest");

jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /empresas", () => {
  test("200 y lista las empresas", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: "Atlas" }] });

    const res = await request(app).get("/empresas");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, nombre: "Atlas" }]);
  });

  test("500 si falla la consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).get("/empresas");

    expect(res.status).toBe(500);
  });
});

describe("GET /empresas/:id", () => {
  test("200 y devuelve la empresa encontrada", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 3, nombre: "Atlas" }] });

    const res = await request(app).get("/empresas/3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 3, nombre: "Atlas" });
  });

  test("404 si la empresa no existe", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/empresas/999");

    expect(res.status).toBe(404);
  });

  test("500 si falla la consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).get("/empresas/3");

    expect(res.status).toBe(500);
  });
});

describe("POST /empresas", () => {
  test("400 si los datos de la empresa no son válidos", async () => {
    const res = await request(app)
      .post("/empresas")
      .send({ nombre: "A", correo: "inválido" });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("201 crea una empresa y registra la auditoría", async () => {
    const empresa = { id: 4, nombre: "Atlas", correo: "atlas@example.com" };
    pool.query
      .mockResolvedValueOnce({ rows: [empresa] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/empresas").send({
      nombre: "Atlas",
      correo: "atlas@example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(empresa);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("500 si falla la creación de la empresa", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).post("/empresas").send({
      nombre: "Atlas",
      correo: "atlas@example.com",
    });

    expect(res.status).toBe(500);
  });

  test("400 si los datos de empresa y usuario no son válidos", async () => {
    const res = await request(app).post("/empresas").send({
      usuario: { nombre_usuario: "x" },
      empresa: { nombre: "A", correo: "inválido" },
    });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("201 crea una empresa junto con su usuario", async () => {
    const usuario = {
      id: 7,
      nombre_usuario: "diego",
      correo: "diego@example.com",
      created_at: "2026-10-18",
    };
    const empresa = { id: 8, nombre: "Atlas", correo: "atlas@example.com" };
    pool.query
      .mockResolvedValueOnce({ rows: [usuario] })
      .mockResolvedValueOnce({ rows: [empresa] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/empresas").send({
      usuario: {
        nombre_usuario: "diego",
        contrasena_hash: "Clave123!",
        correo: "diego@example.com",
      },
      empresa: {
        nombre: "Atlas",
        correo: "atlas@example.com",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ usuario, empresa });
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls[0][1][1]).not.toBe("Clave123!");
  });

  test("500 si falla la creación conjunta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).post("/empresas").send({
      usuario: {
        nombre_usuario: "diego",
        contrasena_hash: "Clave123!",
        correo: "diego@example.com",
      },
      empresa: {
        nombre: "Atlas",
        correo: "atlas@example.com",
      },
    });

    expect(res.status).toBe(500);
  });
});

describe("PUT /empresas/:id", () => {
  test("400 si los datos no son válidos", async () => {
    const res = await request(app)
      .put("/empresas/3")
      .send({ nombre: "A", correo: "inválido" });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("200 actualiza la empresa y registra la auditoría", async () => {
    const empresa = { id: 3, nombre: "Atlas actualizada" };
    pool.query
      .mockResolvedValueOnce({ rows: [empresa] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put("/empresas/3").send({
      nombre: "Atlas actualizada",
      correo: "atlas@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(empresa);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("404 si la empresa que se actualiza no existe", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put("/empresas/999").send({
      nombre: "Atlas",
      correo: "atlas@example.com",
    });

    expect(res.status).toBe(404);
  });

  test("500 si falla la actualización", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).put("/empresas/3").send({
      nombre: "Atlas",
      correo: "atlas@example.com",
    });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /empresas/:id", () => {
  test("200 elimina la empresa y registra la auditoría", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/empresas/3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("404 si la empresa que se elimina no existe", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/empresas/999");

    expect(res.status).toBe(404);
  });

  test("500 si falla la eliminación", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).delete("/empresas/3");

    expect(res.status).toBe(500);
  });
});
