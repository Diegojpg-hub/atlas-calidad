const { loginSchema } = require("../../src/validations/auth");
const { clienteSchema } = require("../../src/validations/clients");
 
// Datos de un cliente válido (clase de equivalencia válida)
const clienteValido = {
  nombre: "María González",
  correo: "maria@biotec.cl",
  telefono: "912345678",
  rut: "12345678-5",
  nombre_fantasia: "Biotec",
  giro_actividad_economica: "Biotecnología",
  nombre_representante: "Ana Pérez",
  cargo_representante: "Gerenta",
  correo_representante: "ana@biotec.cl",
  telefono_representante: "998877665",
  relacion_representante: "Apoderada",
  direccion_calle: "Av. Macul",
  direccion_numero: "4660",
  direccion_ciudad: "Santiago",
  direccion_region: "Región Metropolitana",
  sitio_web: "https://www.biotec.cl",
  telefono_corporativo: "221234567",
  nombre_banco: "Banco Estado",
  numero_cuenta: "123456789",
  titular_cuenta: "Biotec SpA",
  metodo_pago: "transferencia",
  dia_pago: "5",
  moneda: "CLP",
};
 
describe("loginSchema", () => {
  test("acepta credenciales con formato válido", async () => {
    await expect(
      loginSchema.isValid({ nombre_usuario: "admin", password: "admin" })
    ).resolves.toBe(true);
  });
 
  test("rechaza nombre de usuario de 2 caracteres (valor límite inferior - 1)", async () => {
    await expect(
      loginSchema.isValid({ nombre_usuario: "ad", password: "x" })
    ).resolves.toBe(false);
  });
 
  test("acepta nombre de usuario de 3 caracteres (valor límite inferior)", async () => {
    await expect(
      loginSchema.isValid({ nombre_usuario: "ana", password: "x" })
    ).resolves.toBe(true);
  });
 
  test("rechaza nombre de usuario de 51 caracteres (valor límite superior + 1)", async () => {
    await expect(
      loginSchema.isValid({ nombre_usuario: "a".repeat(51), password: "x" })
    ).resolves.toBe(false);
  });
});
 
describe("clienteSchema", () => {
  test("acepta un cliente completo y válido", async () => {
    await expect(clienteSchema.isValid(clienteValido)).resolves.toBe(true);
  });
 
  test("rechaza un correo con formato inválido", async () => {
    await expect(
      clienteSchema.isValid({ ...clienteValido, correo: "maria.biotec.cl" })
    ).resolves.toBe(false);
});
 
  test.each(["CLP", "USD", "EUR"])("acepta la moneda %s", async (moneda) => {
    await expect(
      clienteSchema.isValid({ ...clienteValido, moneda })
    ).resolves.toBe(true);
  });
 
  test("rechaza una moneda fuera de la lista (ARS)", async () => {
    await expect(
      clienteSchema.isValid({ ...clienteValido, moneda: "ARS" })
    ).resolves.toBe(false);
  });
});