import db from '../config/db.js';

export const crearConsulta = async (req, res) => {
  try {
    const { id_propiedad, mensaje } = req.body;

    await db.query(
      "INSERT INTO consultas (id_propiedad, id_usuario, mensaje) VALUES (?, ?, ?)",
      [id_propiedad, req.user.id, mensaje]
    );

    res.json({ message: "Consulta enviada" });

  } catch (error) {
    res.status(500).json({ error: "Error al enviar consulta" });
  }
};

export const obtenerConsultas = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM consultas WHERE id_propiedad = ? ORDER BY fecha DESC",
      [req.params.id_propiedad]
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener consultas" });
  }
};
