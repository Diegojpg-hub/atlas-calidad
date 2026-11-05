const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { getUserFromAuthHeader } = require('../middleware/auth');

router.post('/', async (req, res) => {
  const { nombre } = req.body;
  try {
    const result = await pool.query('INSERT INTO roles (nombre) VALUES ($1) RETURNING *', [nombre]);

    const authUser = getUserFromAuthHeader(req);
    await pool.query('INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)', [
      authUser?.nombreUsuario || null,
      `ROLES_CREAR: creó rol ${nombre}`,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear rol', glosa: "Ocurrió un error interno" });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar roles', glosa: "Ocurrió un error interno" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener rol', glosa: "Ocurrió un error interno" });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre } = req.body;
  try {
    const result = await pool.query('UPDATE roles SET nombre=$1 WHERE id=$2 RETURNING *', [nombre, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const authUser = getUserFromAuthHeader(req);
    await pool.query('INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)', [
      authUser?.nombreUsuario || null,
      `ROLES_ACTUALIZAR: actualizó rol ID ${req.params.id}`,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar rol', glosa: "Ocurrió un error interno" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM roles WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const authUser = getUserFromAuthHeader(req);
    await pool.query('INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)', [
      authUser?.nombreUsuario || null,
      `ROLES_ELIMINAR: eliminó rol ID ${req.params.id}`,
    ]);

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar rol', glosa: "Ocurrió un error interno" });
  }
});

module.exports = router;


