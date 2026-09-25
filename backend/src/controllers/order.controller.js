const pool = require('../config/db');
const { sendMailAsync, orderStatusTemplate, invoiceEmailTemplate } = require('../utils/mailer');
const { generateInvoicePdf } = require('../utils/invoice');

/** Statuts qu'un rôle a le droit de poser sur une commande. */
const STATUS_PERMISSIONS = {
  agent: ['paid', 'received', 'in_transit'],
  livreur: ['out_for_delivery', 'delivered'],
  admin: ['pending', 'paid', 'received', 'in_transit', 'out_for_delivery', 'delivered'],
};

/** Transforme une ligne SQL en commande (forme attendue par le front). */
function toOrder(row) {
  return {
    id: row.id,
    bureauId: row.bureau_id ?? null,
    reference: row.reference,
    type: row.type,
    label: row.label,
    date: row.created_at,
    amount: Number(row.amount),
    status: row.status,
    paymentMethod: row.payment_method,
    lines: JSON.parse(row.lines_json || '[]'),
  };
}

/** Ajoute le nom du client et le bureau (vue gestion). */
function toManagedOrder(row) {
  return {
    ...toOrder(row),
    customer: `${row.first_name} ${row.last_name}`,
    bureauName: row.bureau_name ?? null,
  };
}

/** GET /api/orders — commandes et dépôts de l'utilisateur connecté. */
async function list(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.id],
    );
    return res.json(rows.map(toOrder));
  } catch (error) {
    console.error('orders list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/orders — enregistre une commande/un dépôt pour l'utilisateur. */
async function create(req, res) {
  const { reference, type, label, amount, status, paymentMethod, lines, bureauId } = req.body;
  if (!reference || !type || !label || amount == null || !status || !paymentMethod) {
    return res.status(400).json({ message: 'Données de commande incomplètes.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO orders
         (user_id, bureau_id, reference, type, label, amount, status, payment_method, lines_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, bureauId ?? null, reference, type, label, amount, status, paymentMethod, JSON.stringify(lines || [])],
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);

    // Paiement en ligne réussi : on envoie la facture PDF par e-mail au client
    // (en arrière-plan, sans retarder la réponse de l'API).
    if (paymentMethod === 'online') {
      sendInvoiceEmail(result.insertId, req.user.id).catch(err =>
        console.error('sendInvoiceEmail error:', err.message));
    }

    return res.status(201).json(toOrder(rows[0]));
  } catch (error) {
    console.error('orders create error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * Génère la facture PDF d'une commande payée en ligne et l'envoie au client
 * en pièce jointe. Appelée en arrière-plan après l'enregistrement.
 */
async function sendInvoiceEmail(orderId, userId) {
  const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (orders.length === 0) return;
  const order = orders[0];

  const [users] = await pool.query(
    'SELECT first_name, last_name, email, cin FROM users WHERE id = ?', [userId]);
  if (users.length === 0 || !users[0].email) return;
  const user = users[0];

  const pdf = await generateInvoicePdf({
    reference: order.reference,
    label: order.label,
    type: order.type,
    amount: Number(order.amount),
    date: order.created_at,
    customerName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    cin: user.cin,
    lines: JSON.parse(order.lines_json || '[]'),
  });

  sendMailAsync(
    user.email,
    `Votre facture — ${order.reference} — e-Boutique La Poste`,
    invoiceEmailTemplate(user.first_name, order.reference, Number(order.amount)),
    [{ filename: `facture-${order.reference}.pdf`, content: pdf, contentType: 'application/pdf' }],
  );
}

/**
 * GET /api/orders/manage — file de travail du personnel, selon le rôle :
 *  - admin   : toutes les commandes ;
 *  - agent   : les dépôts de SON bureau ;
 *  - livreur : les colis en transit / en cours de livraison.
 */
async function manage(req, res) {
  const base = `
    SELECT o.*, u.first_name, u.last_name, b.name AS bureau_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN bureaux b ON b.id = o.bureau_id
  `;
  const { role, bureauId, regionId } = req.user;
  try {
    let rows;
    if (role === 'admin_general') {
      // Tout le réseau.
      [rows] = await pool.query(`${base} ORDER BY o.created_at DESC`);
    } else if (role === 'admin_regional') {
      // Les colis des bureaux de sa région.
      [rows] = await pool.query(`${base} WHERE b.region_id = ? ORDER BY o.created_at DESC`, [regionId]);
    } else if (role === 'admin_bureau' || role === 'agent') {
      // Les colis de son bureau.
      [rows] = await pool.query(`${base} WHERE o.bureau_id = ? ORDER BY o.created_at DESC`, [bureauId]);
    } else {
      // Livreur : les colis en cours d'acheminement / de livraison.
      [rows] = await pool.query(
        `${base} WHERE o.status IN ('in_transit', 'out_for_delivery') ORDER BY o.created_at DESC`);
    }
    return res.json(rows.map(toManagedOrder));
  } catch (error) {
    console.error('orders manage error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** PATCH /api/orders/:id/status — change le statut (selon le rôle). */
async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = STATUS_PERMISSIONS[req.user.role] || [];
  if (!allowed.includes(status)) {
    return res.status(403).json({ message: 'Vous ne pouvez pas appliquer ce statut.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    // Un agent n'agit que sur les commandes de son bureau.
    if (req.user.role === 'agent' && rows[0].bureau_id !== req.user.bureauId) {
      return res.status(403).json({ message: 'Cette commande ne dépend pas de votre bureau.' });
    }
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);

    // Notification automatique : on prévient le client par e-mail du nouveau
    // statut de son colis (envoi en arrière-plan, sans bloquer la réponse).
    notifyStatusChange(req.params.id, status).catch(err =>
      console.error('notifyStatusChange error:', err.message));

    return res.json(toOrder(updated[0]));
  } catch (error) {
    console.error('orders updateStatus error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * Envoie au client une notification e-mail décrivant le nouveau statut de son
 * colis. Récupère l'e-mail du client et le nom de son bureau de dépôt.
 */
async function notifyStatusChange(orderId, status) {
  const [rows] = await pool.query(
    `SELECT o.reference, u.first_name, u.email, b.name AS bureau_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN bureaux b ON b.id = o.bureau_id
     WHERE o.id = ?`,
    [orderId],
  );
  if (rows.length === 0) return;
  const { reference, first_name, email, bureau_name } = rows[0];
  if (!email) return;
  sendMailAsync(
    email,
    `Votre colis ${reference} — mise à jour du statut`,
    orderStatusTemplate(first_name, reference, status, bureau_name),
  );
}

module.exports = { list, create, manage, updateStatus };
