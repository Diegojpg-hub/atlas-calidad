const express = require("express");
const { pool } = require("../db");
const router = express.Router();
const { getUserFromAuthHeader } = require("../middleware/auth");

router.post("/", async (req, res) => {
  const { accion, detalles } = req.body;
  try {
    const authUser = getUserFromAuthHeader(req);
    if (!authUser) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Debe iniciar sesión para registrar acciones",
      });
    }
    const actionText = detalles ? `${accion}: ${detalles}` : accion;
    const result = await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2) RETURNING *",
      [authUser?.nombreUsuario || null, actionText]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar log", glosa: "Ocurrió un error interno" });
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
      `SELECT a.* FROM auditoria a
       INNER JOIN usuarios u ON u.nombre_usuario = a.usuario_id
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1
       ORDER BY a.id DESC`,
      [authUser.empresaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar logs", glosa: "Ocurrió un error interno" });
  }
});

module.exports = router;
