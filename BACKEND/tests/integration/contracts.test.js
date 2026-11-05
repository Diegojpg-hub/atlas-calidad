const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");

const token = jwt.sign(
  { usuarioId: 1, nombreUsuario: "admin", empresaId: 1, rolNombre: "administrador" },
  process.env.JWT_SECRET
);

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /contratos", () => {
  test("401 sin un token válido", async () => {
    const res = await request(app).get("/contratos");

    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("200 lista los contratos de la empresa del usuario", async () => {
    const contrato = { id: 1, titulo: "Servicio anual", cliente_nombre: "Biotec" };
    pool.query.mockResolvedValueOnce({ rows: [contrato] });

    const res = await request(app)
      .get("/contratos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([contrato]);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });

  test("500 si falla la consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app)
      .get("/contratos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /contratos/estados", () => {
  test("401 sin empresa asociada al token", async () => {
    const tokenSinEmpresa = jwt.sign(
      { usuarioId: 2, nombreUsuario: "usuario" },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/contratos/estados")
      .set("Authorization", `Bearer ${tokenSinEmpresa}`);

    expect(res.status).toBe(401);
  });

  test("200 combina contratos por vencer y vencidos", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, titulo: "Por vencer" }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, titulo: "Vencido" }] });

    const res = await request(app)
      .get("/contratos/estados")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, titulo: "Por vencer", estado: "por_vencer" },
      { id: 2, titulo: "Vencido", estado: "vencido" },
    ]);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("500 si falla una consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app)
      .get("/contratos/estados")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /contratos/dashboard", () => {
  test("200 devuelve los totales y los vencimientos", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: "2" }] })
      .mockResolvedValueOnce({ rows: [{ total: "5" }] })
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({ rows: [{ total: "3" }] })
      .mockResolvedValueOnce({ rows: [{ total: "4" }] });

    const res = await request(app)
      .get("/contratos/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalUsuarios: 2,
      totalClientes: 5,
      contratosVencen7Dias: 1,
      contratosVencen15Dias: 3,
      contratosVencen30Dias: 4,
    });
    expect(pool.query).toHaveBeenCalledTimes(5);
  });

  test("500 si falla una consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app)
      .get("/contratos/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });
});

describe("GET /contratos/:id", () => {
  test("200 devuelve el contrato encontrado", async () => {
    const contrato = { id: 12, titulo: "Servicio anual" };
    pool.query.mockResolvedValueOnce({ rows: [contrato] });

    const res = await request(app).get("/contratos/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(contrato);
  });

  test("404 si no existe el contrato", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/contratos/999");

    expect(res.status).toBe(404);
  });

  test("500 si falla la consulta", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).get("/contratos/12");

    expect(res.status).toBe(500);
  });
});

describe("POST /contratos", () => {
  test("400 si los datos no cumplen la validación", async () => {
    const res = await request(app).post("/contratos").send({ titulo: "A" });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("201 crea un contrato válido y registra auditoría", async () => {
    const contrato = { id: 15, cliente_id: 3, titulo: "Servicio anual" };
    pool.query
      .mockResolvedValueOnce({ rows: [contrato] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/contratos").send({
      cliente_id: 3,
      titulo: "Servicio anual",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-12-31",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(contrato);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("500 si falla la inserción", async () => {
    pool.query.mockRejectedValueOnce(new Error("conexión perdida"));

    const res = await request(app).post("/contratos").send({
      cliente_id: 3,
      titulo: "Servicio anual",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-12-31",
    });

    expect(res.status).toBe(500);
  });
});
