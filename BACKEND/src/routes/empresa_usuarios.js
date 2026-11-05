const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const validate = require("../middleware/validate");
const {
  createEmpresaUsuarioSchema,
  updateEmpresaUsuarioSchema,
} = require("../validations/empresa_usuarios");

const router = express.Router();
const { getUserFromAuthHeader } = require("../middleware/auth");

router.post("/", validate(createEmpresaUsuarioSchema), async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    let usuarioId;
    const { usuario_id, rol_id, nombre_usuario, contrasena_hash, correo } =
      req.body;

    if (usuario_id) {
      usuarioId = usuario_id;
    } else if (nombre_usuario && contrasena_hash && correo) {
      const usuarioResult = await pool.query(
        "INSERT INTO usuarios (nombre_usuario, contrasena_hash, correo) VALUES ($1, $2, $3) RETURNING id, nombre_usuario, correo, created_at",
        [nombre_usuario, await bcrypt.hash(contrasena_hash, 10), correo]
      );
      usuarioId = usuarioResult.rows[0].id;
    } else {
      return res.status(400).json({
        error: "Datos inválidos",
        glosa:
          "Debe proporcionar usuario_id o los datos del usuario (nombre_usuario, contrasena_hash, correo)",
      });
    }

    if (!rol_id) {
      return res.status(400).json({
        error: "Datos inválidos",
        glosa: "El campo rol_id es requerido",
      });
    }

    const result = await pool.query(
      "INSERT INTO empresa_usuarios (empresa_id, usuario_id, rol_id) VALUES ($1, $2, $3) RETURNING *",
      [empresaId, usuarioId, rol_id]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `EMPRESA_USUARIOS_CREAR: vinculó usuario ${usuarioId} a empresa ${empresaId} con rol ${rol_id}`,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al crear vínculo",
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

    const empresaId = authUser.empresaId;
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.nombre_usuario,
        u.correo,
        eu.created_at,
        eu.rol_id,
        r.nombre AS rol_nombre
      FROM empresa_usuarios eu
      INNER JOIN usuarios u ON u.id = eu.usuario_id
      LEFT JOIN roles r ON r.id = eu.rol_id
      WHERE eu.empresa_id = $1
      ORDER BY eu.created_at DESC
    `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al listar usuarios",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM empresa_usuarios WHERE id=$1",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener vínculo",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.put("/:id", validate(updateEmpresaUsuarioSchema), async (req, res) => {
  const { empresa_id, usuario_id, rol_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE empresa_usuarios SET empresa_id=$1, usuario_id=$2, rol_id=$3 WHERE id=$4 RETURNING *",
      [empresa_id, usuario_id, rol_id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `EMPRESA_USUARIOS_ACTUALIZAR: actualizó vínculo ID ${req.params.id}`,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al actualizar vínculo",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM empresa_usuarios WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `EMPRESA_USUARIOS_ELIMINAR: eliminó vínculo ID ${req.params.id}`,
      ]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al eliminar vínculo",
      glosa: "Ocurrió un error interno",
    });
  }
});

module.exports = router;
