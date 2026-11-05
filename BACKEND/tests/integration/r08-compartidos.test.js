const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("../../src/db", () => ({ pool: { query: jest.fn() } }));
const { pool } = require("../../src/db");
const app = require("../../src/app");

const SECRET = process.env.JWT_SECRET;
const CLAVE = "claveSegura1";
const HASH = bcrypt.hashSync(CLAVE, 4);
const ENLACE = "enlace-de-prueba";

const tokenDueno = jwt.sign(
  { usuarioId: 1, nombreUsuario: "admin", empresaId: 1, rolNombre: "administrador" },
  SECRET
);

// Muestra en la terminal lo que devolvió la API (evidencia para el informe)
const mostrar = (titulo, res) =>
  process.stdout.write(
    `\n>>> ${titulo}\n    Estado HTTP: ${res.status}\n    Respuesta: ${JSON.stringify(res.body)}\n`
  );

beforeEach(() => pool.query.mockReset());

describe("R-08: crear el enlace compartido (POST /contratos/:id/share)", () => {
  test("400 si la clave tiene menos de 8 caracteres", async () => {
    const res = await request(app)
      .post("/contratos/5/share")
      .set("Authorization", `Bearer ${tokenDueno}`)
      .send({ password: "1234567" });

    mostrar("Clave de 7 caracteres", res);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("la clave se guarda como hash bcrypt, nunca en texto plano", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, titulo: "Servicio anual" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/contratos/5/share")
      .set("Authorization", `Bearer ${tokenDueno}`)
      .send({ password: CLAVE });

    const guardado = pool.query.mock.calls[1][1][1];
    process.stdout.write(
      `\n>>> Clave enviada: ${CLAVE}\n    Valor guardado en la base: ${guardado}\n`
    );
    expect(res.status).toBe(200);
    expect(guardado).not.toBe(CLAVE);
    expect(guardado.startsWith("$2")).toBe(true);
    expect(bcrypt.compareSync(CLAVE, guardado)).toBe(true);
  });
});

describe("R-08: verificar la clave (POST /public/contratos/:token/verify)", () => {
  const contrato = {
    id: 5,
    titulo: "Servicio anual",
    share_password_hash: HASH,
    share_enabled: true,
  };

  test("401 con clave incorrecta", async () => {
    pool.query.mockResolvedValueOnce({ rows: [contrato] });

    const res = await request(app)
      .post(`/public/contratos/${ENLACE}/verify`)
      .send({ password: "claveIncorrecta" });

    mostrar("Clave incorrecta", res);
    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });

  test("200 con clave correcta y entrega un token temporal de 15 minutos", async () => {
    pool.query.mockResolvedValueOnce({ rows: [contrato] });

    const res = await request(app)
      .post(`/public/contratos/${ENLACE}/verify`)
      .send({ password: CLAVE });

    const payload = jwt.verify(res.body.accessToken, SECRET);
    mostrar("Clave correcta", {
      status: res.status,
      body: { ...res.body, accessToken: res.body.accessToken.slice(0, 25) + "..." },
    });
    process.stdout.write(`    Duración del token: ${(payload.exp - payload.iat) / 60} minutos\n`);
    expect(res.status).toBe(200);
    expect(payload.tipo).toBe("compartido");
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  test("403 si el enlace fue desactivado", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...contrato, share_enabled: false }] });

    const res = await request(app)
      .post(`/public/contratos/${ENLACE}/verify`)
      .send({ password: CLAVE });

    mostrar("Enlace desactivado", res);
    expect(res.status).toBe(403);
  });
});

describe("R-08: archivos del contrato compartido (GET /public/contratos/:token/files)", () => {
  const tokenAcceso = jwt.sign(
    { tipo: "compartido", contratoId: 5, token: ENLACE },
    SECRET,
    { expiresIn: "15m" }
  );

  test("401 sin token de acceso (la clave ya no sirve en la URL)", async () => {
    const res = await request(app).get(`/public/contratos/${ENLACE}/files?password=${CLAVE}`);

    mostrar("Sin token, con ?password= en la URL", res);
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("401 con un token que pertenece a otro enlace", async () => {
    const tokenOtroEnlace = jwt.sign(
      { tipo: "compartido", contratoId: 5, token: "otro-enlace" },
      SECRET
    );

    const res = await request(app)
      .get(`/public/contratos/${ENLACE}/files`)
      .set("Authorization", `Bearer ${tokenOtroEnlace}`);

    mostrar("Token de otro enlace", res);
    expect(res.status).toBe(401);
  });

  test("200 y lista los archivos con el token correcto", async () => {
    const archivos = [{ id: 1, nombre_archivo: "contrato.pdf" }];
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, share_enabled: true }] })
      .mockResolvedValueOnce({ rows: archivos });

    const res = await request(app)
      .get(`/public/contratos/${ENLACE}/files`)
      .set("Authorization", `Bearer ${tokenAcceso}`);

    mostrar("Token correcto", res);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(archivos);
  });
});
