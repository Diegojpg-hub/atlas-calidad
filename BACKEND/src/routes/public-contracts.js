const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { JWT_SECRET } = require("../config");

const router = express.Router();

// Token temporal que se entrega tras verificar la contraseña; así la contraseña
// no vuelve a viajar (ni queda en la URL ni en el historial del navegador)
function exigirAccesoCompartido(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Acceso requerido",
      glosa: "Debe verificar la contraseña del enlace compartido",
    });
  }
  try {
    const payload = jwt.verify(auth.substring(7), JWT_SECRET);
    if (payload.tipo !== "compartido" || payload.token !== req.params.token) {
      throw new Error("token no corresponde");
    }
    req.contratoId = payload.contratoId;
    next();
  } catch {
    return res.status(401).json({
      error: "Acceso expirado",
      glosa: "Vuelva a ingresar la contraseña del enlace compartido",
    });
  }
}

// Endpoint público para verificar contraseña y obtener información del contrato
router.post("/:token/verify", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Contraseña requerida",
        glosa: "Debe proporcionar una contraseña",
      });
    }

    const result = await pool.query(
      `SELECT 
        c.id, 
        c.titulo, 
        c.descripcion, 
        c.fecha_inicio, 
        c.fecha_fin, 
        c.share_password_hash,
        c.share_enabled,
        cl.nombre AS cliente_nombre
      FROM contratos c
      INNER JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.share_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido o ha sido desactivado",
      });
    }

    const contrato = result.rows[0];

    if (!contrato.share_enabled) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    if (
      typeof password !== "string" ||
      !(await bcrypt.compare(password, contrato.share_password_hash || ""))
    ) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
        glosa: "La contraseña proporcionada no es correcta",
      });
    }

    const accessToken = jwt.sign(
      { tipo: "compartido", contratoId: contrato.id, token },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Retornar información del contrato (sin datos sensibles)
    res.json({
      id: contrato.id,
      titulo: contrato.titulo,
      descripcion: contrato.descripcion,
      fecha_inicio: contrato.fecha_inicio,
      fecha_fin: contrato.fecha_fin,
      cliente_nombre: contrato.cliente_nombre,
      accessToken,
      verified: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al verificar contraseña",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint público para listar archivos del contrato compartido (requiere verificación previa)
router.get("/:token/files", exigirAccesoCompartido, async (req, res) => {
  try {
    const { token } = req.params;

    // Verificar que el enlace siga activo y corresponda al contrato autorizado
    const contratoCheck = await pool.query(
      `SELECT c.id, c.share_enabled
       FROM contratos c
       WHERE c.share_token = $1`,
      [token]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido",
      });
    }

    const contrato = contratoCheck.rows[0];

    if (!contrato.share_enabled || contrato.id !== req.contratoId) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    // Obtener archivos del contrato
    const docs = await pool.query(
      "SELECT id, nombre_archivo, created_at FROM documentos_contrato WHERE contract_id=$1 ORDER BY created_at DESC",
      [contrato.id]
    );

    res.json(docs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener archivos",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint público para descargar un archivo específico del contrato compartido
router.get("/:token/file/:fileId", exigirAccesoCompartido, async (req, res) => {
  try {
    const { token, fileId } = req.params;

    // Verificar que el enlace siga activo y corresponda al contrato autorizado
    const contratoCheck = await pool.query(
      `SELECT c.id, c.share_enabled
       FROM contratos c
       WHERE c.share_token = $1`,
      [token]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido",
      });
    }

    const contrato = contratoCheck.rows[0];

    if (!contrato.share_enabled || contrato.id !== req.contratoId) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    // Verificar que el archivo pertenece al contrato
    const doc = await pool.query(
      "SELECT document, nombre_archivo FROM documentos_contrato WHERE id=$1 AND contract_id=$2",
      [fileId, contrato.id]
    );

    if (doc.rows.length === 0) {
      return res.status(404).json({
        error: "Archivo no encontrado",
        glosa: "El archivo solicitado no existe o no pertenece a este contrato",
      });
    }

    const buffer = doc.rows[0].document;
    const nombreArchivo = doc.rows[0].nombre_archivo || "contrato.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener archivo",
      glosa: "Ocurrió un error interno",
    });
  }
});

module.exports = router;

