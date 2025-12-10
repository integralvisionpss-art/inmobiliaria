import db from '../config/db.js';

export const subirFoto = async (req, res) => {
  try {
    const { id_propiedad } = req.body;

    const url = `/uploads/${req.file.filename}`;

    await db.query(
      "INSERT INTO fotos_propiedad (id_propiedad, url) VALUES (?, ?)",
      [id_propiedad, url]
    );

    res.json({ message: "Foto subida", url });
  } catch (error) {
    res.status(500).json({ error: "Error al subir foto" });
  }
};
