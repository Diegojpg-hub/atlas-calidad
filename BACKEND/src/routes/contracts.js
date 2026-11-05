const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const validate = require("../middleware/validate");
const { createContractSchema, updateContractSchema } = require("../validations/contracts");

const router = express.Router();
const { getUserFromAuthHeader } = require("../middleware/auth");
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB por archivo

router.post("/", upload.array("files", 10), validate(createContractSchema), async (req, res) => {
  const {
    cliente_id,
    titulo,
    descripcion = null,
    fecha_inicio,
    fecha_fin,
  } = req.body;
  try {
    const clientIdNum = Number(cliente_id);
    const contractInsert = await pool.query(
      "INSERT INTO contratos (cliente_id, titulo, descripcion, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [clientIdNum, titulo, descripcion, fecha_inicio, fecha_fin]
    );

    const contractId = contractInsert.rows[0].id;

    // Procesar múltiples archivos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.buffer) {
          await pool.query(
            "INSERT INTO documentos_contrato (contract_id, document, nombre_archivo) VALUES ($1, $2, $3)",
            [contractId, file.buffer, file.originalname || `archivo_${Date.now()}.pdf`]
          );
        }
      }
    }

    const result = contractInsert;
    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_CREAR: creó contrato ${titulo} para cliente ${cliente_id}`,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al crear contrato",
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
        c.id, 
        c.titulo, 
        c.descripcion, 
        c.fecha_inicio, 
        c.fecha_fin, 
        c.created_at,
        cl.nombre AS cliente_nombre
      FROM contratos c
      INNER JOIN clientes cl ON cl.id = c.cliente_id
      WHERE cl.empresa_id = $1
      ORDER BY c.id DESC
    `,
      [empresaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al listar contratos",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/estados", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const hoy = new Date();
    const hoyFormateado = hoy.toISOString().split("T")[0]; // YYYY-MM-DD
    const fecha30Dias = new Date(hoy);
    fecha30Dias.setDate(fecha30Dias.getDate() + 30);
    const fecha30DiasFormateada = fecha30Dias.toISOString().split("T")[0];

    const porVencer = await pool.query(
      `SELECT c.id, c.cliente_id, c.titulo, c.descripcion, c.fecha_inicio, c.fecha_fin, c.created_at
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE cl.empresa_id = $1 
         AND c.fecha_fin >= $2 
         AND c.fecha_fin <= $3
       ORDER BY c.fecha_fin ASC
       LIMIT 3`,
      [empresaId, hoyFormateado, fecha30DiasFormateada]
    );

    const vencidos = await pool.query(
      `SELECT c.id, c.cliente_id, c.titulo, c.descripcion, c.fecha_inicio, c.fecha_fin, c.created_at
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE cl.empresa_id = $1 
         AND c.fecha_fin < $2
       ORDER BY c.fecha_fin DESC
       LIMIT 3`,
      [empresaId, hoyFormateado]
    );

    const porVencerConEstado = porVencer.rows.map((contrato) => ({
      ...contrato,
      estado: "por_vencer",
    }));

    const vencidosConEstado = vencidos.rows.map((contrato) => ({
      ...contrato,
      estado: "vencido",
    }));

    res.json([...porVencerConEstado, ...vencidosConEstado]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener contratos por estado",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const hoy = new Date();
    const hoyFormateado = hoy.toISOString().split("T")[0];

    const fecha7Dias = new Date(hoy);
    fecha7Dias.setDate(fecha7Dias.getDate() + 7);
    const fecha7DiasFormateada = fecha7Dias.toISOString().split("T")[0];

    const fecha15Dias = new Date(hoy);
    fecha15Dias.setDate(fecha15Dias.getDate() + 15);
    const fecha15DiasFormateada = fecha15Dias.toISOString().split("T")[0];

    const fecha30Dias = new Date(hoy);
    fecha30Dias.setDate(fecha30Dias.getDate() + 30);
    const fecha30DiasFormateada = fecha30Dias.toISOString().split("T")[0];

    const totalUsuariosResult = await pool.query(
      "SELECT COUNT(*) as total FROM empresa_usuarios WHERE empresa_id = $1",
      [empresaId]
    );
    const totalUsuarios = parseInt(totalUsuariosResult.rows[0].total);

    const totalClientesResult = await pool.query(
      "SELECT COUNT(*) as total FROM clientes WHERE empresa_id = $1",
      [empresaId]
    );
    const totalClientes = parseInt(totalClientesResult.rows[0].total);

    const contratos7DiasResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE cl.empresa_id = $1 
         AND c.fecha_fin >= $2 
         AND c.fecha_fin <= $3`,
      [empresaId, hoyFormateado, fecha7DiasFormateada]
    );
    const contratos7Dias = parseInt(contratos7DiasResult.rows[0].total);

    const contratos15DiasResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE cl.empresa_id = $1 
         AND c.fecha_fin >= $2 
         AND c.fecha_fin <= $3`,
      [empresaId, hoyFormateado, fecha15DiasFormateada]
    );
    const contratos15Dias = parseInt(contratos15DiasResult.rows[0].total);

    const contratos30DiasResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE cl.empresa_id = $1 
         AND c.fecha_fin >= $2 
         AND c.fecha_fin <= $3`,
      [empresaId, hoyFormateado, fecha30DiasFormateada]
    );
    const contratos30Dias = parseInt(contratos30DiasResult.rows[0].total);

    res.json({
      totalUsuarios,
      totalClientes,
      contratosVencen7Dias: contratos7Dias,
      contratosVencen15Dias: contratos15Dias,
      contratosVencen30Dias: contratos30Dias,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener estadísticas",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, cliente_id, titulo, descripcion, fecha_inicio, fecha_fin, created_at FROM contratos WHERE id=$1",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener contrato",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.put("/:id", upload.array("files", 10), validate(updateContractSchema), async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const contratoId = req.params.id;

    const contratoExistente = await pool.query(
      `SELECT c.id, c.cliente_id, c.titulo
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND cl.empresa_id = $2`,
      [contratoId, empresaId]
    );

    if (contratoExistente.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Contrato no encontrado o no pertenece a tu empresa",
      });
    }

    const { cliente_id, titulo, descripcion, fecha_inicio, fecha_fin } =
      req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (cliente_id !== undefined) {
      updates.push(`cliente_id = $${paramIndex}`);
      values.push(Number(cliente_id));
      paramIndex++;
    }

    if (titulo !== undefined) {
      updates.push(`titulo = $${paramIndex}`);
      values.push(titulo);
      paramIndex++;
    }

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`);
      values.push(descripcion);
      paramIndex++;
    }

    if (fecha_inicio !== undefined) {
      updates.push(`fecha_inicio = $${paramIndex}`);
      values.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin !== undefined) {
      updates.push(`fecha_fin = $${paramIndex}`);
      values.push(fecha_fin);
      paramIndex++;
    }

    if (updates.length === 0 && (!req.files || req.files.length === 0)) {
      const contratoActual = await pool.query(
        "SELECT * FROM contratos WHERE id = $1",
        [contratoId]
      );
      return res.json(contratoActual.rows[0]);
    }

    if (updates.length > 0) {
      values.push(contratoId);
      const result = await pool.query(
        `UPDATE contratos 
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
    }

    // Procesar múltiples archivos nuevos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.buffer) {
          await pool.query(
            "INSERT INTO documentos_contrato (contract_id, document, nombre_archivo) VALUES ($1, $2, $3)",
            [contratoId, file.buffer, file.originalname || `archivo_${Date.now()}.pdf`]
          );
        }
      }
    }

    const result = await pool.query(
      "SELECT * FROM contratos WHERE id = $1",
      [contratoId]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_ACTUALIZAR: actualizó contrato ID ${contratoId} - ${
          titulo || contratoExistente.rows[0].titulo
        }`,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al actualizar contrato",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint para listar todos los archivos de un contrato
router.get("/:id/files", async (req, res) => {
  try {
    const docs = await pool.query(
      "SELECT id, nombre_archivo, created_at FROM documentos_contrato WHERE contract_id=$1 ORDER BY created_at DESC",
      [req.params.id]
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

// Endpoint para descargar un archivo específico
router.get("/:id/file/:fileId", async (req, res) => {
  try {
    const doc = await pool.query(
      "SELECT document, nombre_archivo FROM documentos_contrato WHERE id=$1 AND contract_id=$2",
      [req.params.fileId, req.params.id]
    );
    if (doc.rows.length === 0)
      return res.status(404).json({ error: "Documento no encontrado" });
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

// Endpoint legacy para compatibilidad (devuelve el último archivo)
router.get("/:id/file", async (req, res) => {
  try {
    const doc = await pool.query(
      "SELECT document, nombre_archivo FROM documentos_contrato WHERE contract_id=$1 ORDER BY id DESC LIMIT 1",
      [req.params.id]
    );
    if (doc.rows.length === 0)
      return res.status(404).json({ error: "Documento no encontrado" });
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

// Endpoint para eliminar un archivo específico
router.delete("/:id/file/:fileId", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const contratoId = req.params.id;
    const fileId = req.params.fileId;

    // Verificar que el contrato pertenece a la empresa del usuario
    const contratoCheck = await pool.query(
      `SELECT c.id
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND cl.empresa_id = $2`,
      [contratoId, empresaId]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Contrato no encontrado o no pertenece a tu empresa",
      });
    }

    // Verificar que el archivo pertenece al contrato
    const fileCheck = await pool.query(
      "SELECT id, nombre_archivo FROM documentos_contrato WHERE id=$1 AND contract_id=$2",
      [fileId, contratoId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Archivo no encontrado o no pertenece a este contrato",
      });
    }

    await pool.query(
      "DELETE FROM documentos_contrato WHERE id=$1",
      [fileId]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_ELIMINAR_ARCHIVO: eliminó archivo ${fileCheck.rows[0].nombre_archivo || fileId} del contrato ID ${contratoId}`,
      ]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al eliminar archivo",
      glosa: "Ocurrió un error interno",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM documentos_contrato WHERE contract_id=$1", [
      req.params.id,
    ]);
    const result = await pool.query(
      "DELETE FROM contratos WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_ELIMINAR: eliminó contrato ID ${req.params.id}`,
      ]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al eliminar contrato",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint para generar/compartir enlace con contraseña
router.post("/:id/share", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const contratoId = req.params.id;
    const { password } = req.body;

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        error: "Contraseña inválida",
        glosa: "La contraseña debe tener al menos 8 caracteres",
      });
    }

    // Verificar que el contrato pertenece a la empresa del usuario
    const contratoCheck = await pool.query(
      `SELECT c.id, c.titulo
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND cl.empresa_id = $2`,
      [contratoId, empresaId]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Contrato no encontrado o no pertenece a tu empresa",
      });
    }

    // Generar token único
    const shareToken = crypto.randomBytes(32).toString("hex");

    // La contraseña se guarda como hash bcrypt, nunca en texto plano
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE contratos 
       SET share_token = $1, share_password_hash = $2, share_enabled = true
       WHERE id = $3`,
      [shareToken, passwordHash, contratoId]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_COMPARTIR: generó enlace compartido para contrato ID ${contratoId}`,
      ]
    );

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const shareUrl = `${baseUrl}/contratos/compartido/${shareToken}`;

    res.json({
      shareUrl,
      shareToken,
      message: "Enlace compartido generado exitosamente",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al generar enlace compartido",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint para desactivar compartir
router.delete("/:id/share", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const contratoId = req.params.id;

    // Verificar que el contrato pertenece a la empresa del usuario
    const contratoCheck = await pool.query(
      `SELECT c.id
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND cl.empresa_id = $2`,
      [contratoId, empresaId]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Contrato no encontrado o no pertenece a tu empresa",
      });
    }

    await pool.query(
      `UPDATE contratos 
       SET share_token = NULL, share_password_hash = NULL, share_enabled = false
       WHERE id = $1`,
      [contratoId]
    );

    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `CONTRATOS_COMPARTIR: desactivó enlace compartido para contrato ID ${contratoId}`,
      ]
    );

    res.json({ message: "Enlace compartido desactivado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al desactivar enlace compartido",
      glosa: "Ocurrió un error interno",
    });
  }
});

// Endpoint para obtener información del enlace compartido (solo para el dueño)
router.get("/:id/share", async (req, res) => {
  try {
    const authUser = getUserFromAuthHeader(req);

    if (!authUser || !authUser.empresaId) {
      return res.status(401).json({
        error: "No autorizado",
        glosa: "Token inválido o sin empresa asociada",
      });
    }

    const empresaId = authUser.empresaId;
    const contratoId = req.params.id;

    // Verificar que el contrato pertenece a la empresa del usuario
    const contratoCheck = await pool.query(
      `SELECT c.id, c.share_token, c.share_enabled
       FROM contratos c
       INNER JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND cl.empresa_id = $2`,
      [contratoId, empresaId]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "No encontrado",
        glosa: "Contrato no encontrado o no pertenece a tu empresa",
      });
    }

    const contrato = contratoCheck.rows[0];
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const shareUrl = contrato.share_token
      ? `${baseUrl}/contratos/compartido/${contrato.share_token}`
      : null;

    res.json({
      shareEnabled: contrato.share_enabled || false,
      shareToken: contrato.share_token,
      shareUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener información de compartir",
      glosa: "Ocurrió un error interno",
    });
  }
});

module.exports = router;
