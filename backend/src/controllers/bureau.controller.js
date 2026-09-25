const pool = require('../config/db');

/** Transforme une ligne SQL en bureau (nombres pour lat/lng). */
function toBureau(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    governorate: row.governorate,
    regionId: row.region_id ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
  };
}

/** GET /api/bureaux — liste des bureaux de poste. */
async function list(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM bureaux ORDER BY id');
    return res.json(rows.map(toBureau));
  } catch (error) {
    console.error('bureaux list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/bureaux — crée un bureau (admin). */
async function create(req, res) {
  const { name, address, city, governorate, lat, lng } = req.body;
  if (!name || !address || !city || !governorate || lat == null || lng == null) {
    return res.status(400).json({ message: 'Champs bureau incomplets.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO bureaux (name, address, city, governorate, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [name, address, city, governorate, lat, lng],
    );
    const [rows] = await pool.query('SELECT * FROM bureaux WHERE id = ?', [result.insertId]);
    return res.status(201).json(toBureau(rows[0]));
  } catch (error) {
    console.error('bureaux create error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** PUT /api/bureaux/:id — met à jour un bureau (admin). */
async function update(req, res) {
  const { name, address, city, governorate, lat, lng } = req.body;
  try {
    await pool.query(
      'UPDATE bureaux SET name = ?, address = ?, city = ?, governorate = ?, lat = ?, lng = ? WHERE id = ?',
      [name, address, city, governorate, lat, lng, req.params.id],
    );
    const [rows] = await pool.query('SELECT * FROM bureaux WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Bureau introuvable.' });
    }
    return res.json(toBureau(rows[0]));
  } catch (error) {
    console.error('bureaux update error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** DELETE /api/bureaux/:id — supprime un bureau (admin). */
async function remove(req, res) {
  try {
    await pool.query('DELETE FROM bureaux WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('bureaux delete error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { list, create, update, remove };
