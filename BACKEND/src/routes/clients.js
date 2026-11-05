const express = require("express");
const { pool } = require("../db");
const validate = require("../middleware/validate");
const { clienteSchema } = require("../validations/clients");
const router = express.Router();
const { getUserFromAuthHeader } = require("../middleware/auth");

router.post("/", validate(clienteSchema), async (req, res) => {
  const {
    nombre,
    correo,
    telefono,
    direccion,
    es_empresa = false,
    nombre_banco = null,
    numero_cuenta = null,
    titular_cuenta = null,
    rut = null,
    nombre_fantasia = null,
    giro_actividad_economica = null,
    nombre_representante = null,
    cargo_representante = null,
    correo_representante = null,
    telefono_representante = null,
    relacion_representante = null,
    direccion_calle = null,
    direccion_numero = null,
    direccion_ciudad = null,
    direccion_region = null,
    sitio_web = null,
    telefono_corporativo = null,
    metodo_pago = null,
    dia_pago = null,
    moneda = null,
  } = req.body;

  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;

    const result = await pool.query(
      `INSERT INTO clientes (
        nombre, correo, telefono, direccion, es_empresa, nombre_banco, numero_cuenta, titular_cuenta,
        rut, nombre_fantasia, giro_actividad_economica,
        nombre_representante, cargo_representante, correo_representante, telefono_representante, relacion_representante,
        direccion_calle, direccion_numero, direccion_ciudad, direccion_region, sitio_web, telefono_corporativo,
        metodo_pago, dia_pago, moneda,
        empresa_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING *`,
      [
        nombre,
        correo,
        telefono,
        direccion,
        es_empresa,
        nombre_banco,
        numero_cuenta,
        titular_cuenta,
        rut,
        nombre_fantasia,
        giro_actividad_economica,
        nombre_representante,
        cargo_representante,
        correo_representante,
        telefono_representante,
        relacion_representante,
        direccion_calle,
        direccion_numero,
        direccion_ciudad,
        direccion_region,
        sitio_web,
        telefono_corporativo,
        metodo_pago,
        dia_pago,
        moneda,
        empresaId,
      ]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CLIENTES_CREAR: creó cliente ${nombre}`,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al crear cliente",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }


    const result = await pool.query(
      "SELECT * FROM clientes WHERE empresa_id = $1 ORDER BY id DESC",
      [authUser.empresaId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al listar clientes",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/search", async (req, res) => {
  const { name } = req.query;
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const result = await pool.query(
      "SELECT * FROM clientes WHERE nombre ILIKE $1 AND empresa_id = $2 ORDER BY nombre ASC",
      [`%${name || ""}%`, authUser.empresaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error en búsqueda",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const result = await pool.query(
      "SELECT * FROM clientes WHERE id=$1 AND empresa_id = $2",
      [req.params.id, authUser.empresaId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener cliente",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.put("/:id", validate(clienteSchema), async (req, res) => {
  const {
    nombre,
    correo,
    telefono,
    direccion,
    es_empresa = false,
    nombre_banco = null,
    numero_cuenta = null,
    titular_cuenta = null,
    rut = null,
    nombre_fantasia = null,
    giro_actividad_economica = null,
    nombre_representante = null,
    cargo_representante = null,
    correo_representante = null,
    telefono_representante = null,
    relacion_representante = null,
    direccion_calle = null,
    direccion_numero = null,
    direccion_ciudad = null,
    direccion_region = null,
    sitio_web = null,
    telefono_corporativo = null,
    metodo_pago = null,
    dia_pago = null,
    moneda = null,
  } = req.body;

  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const result = await pool.query(
      `UPDATE clientes SET 
        nombre=$1, correo=$2, telefono=$3, direccion=$4, es_empresa=$5, nombre_banco=$6, numero_cuenta=$7, titular_cuenta=$8,
        rut=$9, nombre_fantasia=$10, giro_actividad_economica=$11,
        nombre_representante=$12, cargo_representante=$13, correo_representante=$14, telefono_representante=$15, relacion_representante=$16,
        direccion_calle=$17, direccion_numero=$18, direccion_ciudad=$19, direccion_region=$20, sitio_web=$21, telefono_corporativo=$22,
        metodo_pago=$23, dia_pago=$24, moneda=$25
      WHERE id=$26 AND empresa_id = $27 RETURNING *`,
      [
        nombre,
        correo,
        telefono,
        direccion,
        es_empresa,
        nombre_banco,
        numero_cuenta,
        titular_cuenta,
        rut,
        nombre_fantasia,
        giro_actividad_economica,
        nombre_representante,
        cargo_representante,
        correo_representante,
        telefono_representante,
        relacion_representante,
        direccion_calle,
        direccion_numero,
        direccion_ciudad,
        direccion_region,
        sitio_web,
        telefono_corporativo,
        metodo_pago,
        dia_pago,
        moneda,
        req.params.id,
        authUser.empresaId,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CLIENTES_ACTUALIZAR: actualizó cliente ID ${req.params.id}`,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al actualizar cliente",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const result = await pool.query(
      "DELETE FROM clientes WHERE id=$1 AND empresa_id = $2 RETURNING *",
      [req.params.id, authUser.empresaId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CLIENTES_ELIMINAR: eliminó cliente ID ${req.params.id}`,
      ]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al eliminar cliente",
      glosa: "Ocurrió un error interno",
    });
  }
});

module.exports = router;
