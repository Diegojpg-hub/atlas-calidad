const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");

const SECRET = process.env.JWT_SECRET;
const tokenEmpresa = (empresaId) =>
  jwt.sign(
    { usuarioId: empresaId, nombreUsuario: `usuario${empresaId}`, empresaId, rolNombre: "administrador" },
    SECRET
  );

// Base de datos simulada con clientes de DOS empresas distintas
const CLIENTES = [
  { id: 1, nombre: "Cliente de la empresa 1", empresa_id: 1 },
  { id: 2, nombre: "Cliente de la empresa 2", empresa_id: 2 },
];

// Simula a PostgreSQL: respeta el filtro "empresa_id = $N" que envía la API
function baseDeDatosSimulada(sql, params) {
  const empresaId = params[params.length - 1];
  let filas = CLIENTES.filter((c) => c.empresa_id === empresaId);
  if (sql.includes("WHERE id=$1")) {
    filas = filas.filter((c) => c.id === Number(params[0]));
  }
  return Promise.resolve({ rows: filas });
}

// Muestra en la terminal lo que devolvió la API (evidencia para el informe)
const mostrar = (titulo, res) =>
  process.stdout.write(
    `\n>>> ${titulo}\n    Estado HTTP: ${res.status}\n    Respuesta: ${JSON.stringify(res.body)}\n`
  );

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockImplementation(baseDeDatosSimulada);
});

describe("Aislamiento entre empresas (clientes)", () => {
  test("un usuario de la empresa 1 NO ve los clientes de la empresa 2", async () => {
    const res = await request(app)
      .get("/clientes")
      .set("Authorization", `Bearer ${tokenEmpresa(1)}`);

    mostrar("Usuario de la EMPRESA 1 pide GET /clientes", res);
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.empresa_id)).toEqual([1]);
    expect(res.body.some((c) => c.empresa_id === 2)).toBe(false);
    // La consulta incluye el filtro por empresa y usa el id del token
    expect(pool.query.mock.calls[0][0]).toContain("empresa_id = $1");
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });

  test("un usuario de la empresa 2 solo ve los clientes de la empresa 2", async () => {
    const res = await request(app)
      .get("/clientes")
      .set("Authorization", `Bearer ${tokenEmpresa(2)}`);

    mostrar("Usuario de la EMPRESA 2 pide GET /clientes", res);
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.empresa_id)).toEqual([2]);
    expect(pool.query.mock.calls[0][1]).toEqual([2]);
  });

  test("404 si un usuario de la empresa 1 pide por id un cliente de la empresa 2", async () => {
    const res = await request(app)
      .get("/clientes/2")
      .set("Authorization", `Bearer ${tokenEmpresa(1)}`);

    mostrar("Usuario de la EMPRESA 1 pide GET /clientes/2 (cliente de la empresa 2)", res);
    expect(res.status).toBe(404);
    expect(pool.query.mock.calls[0][1]).toEqual(["2", 1]);
  });
});
