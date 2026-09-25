const pool = require('../config/db');

/** GET /api/regions — liste des régions (pour l'affectation des admins régionaux). */
async function list(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM regions ORDER BY id');
    return res.json(rows.map(r => ({ id: r.id, name: r.name })));
  } catch (error) {
    console.error('regions list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { list };
