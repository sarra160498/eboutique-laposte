const pool = require('../config/db');

/** Transforme une ligne SQL en produit (camelCase pour le front). */
function toProduct(row) {
  return {
    id: row.id,
    category: row.category,
    categoryLabel: row.category_label,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    badge: row.badge,
  };
}

/** GET /api/products — liste du catalogue. */
async function list(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id');
    return res.json(rows.map(toProduct));
  } catch (error) {
    console.error('products list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/products — crée un produit (admin). */
async function create(req, res) {
  const { category, categoryLabel, name, description, price, badge } = req.body;
  if (!category || !categoryLabel || !name || !description || price == null) {
    return res.status(400).json({ message: 'Champs produit incomplets.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO products (category, category_label, name, description, price, badge) VALUES (?, ?, ?, ?, ?, ?)',
      [category, categoryLabel, name, description, price, badge || null],
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    return res.status(201).json(toProduct(rows[0]));
  } catch (error) {
    console.error('products create error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** PUT /api/products/:id — met à jour un produit (admin). */
async function update(req, res) {
  const { category, categoryLabel, name, description, price, badge } = req.body;
  try {
    await pool.query(
      `UPDATE products SET category = ?, category_label = ?, name = ?, description = ?, price = ?, badge = ?
       WHERE id = ?`,
      [category, categoryLabel, name, description, price, badge || null, req.params.id],
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }
    return res.json(toProduct(rows[0]));
  } catch (error) {
    console.error('products update error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** DELETE /api/products/:id — supprime un produit (admin). */
async function remove(req, res) {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('products delete error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { list, create, update, remove };
