const pool = require('../config/db');

/** GET /api/wallet — solde e-Dinar du compte + historique des virements. */
async function getWallet(req, res) {
  try {
    const [u] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    const [rows] = await pool.query(
      `SELECT t.id, t.amount, t.created_at, t.sender_id, t.recipient_id,
              s.first_name AS s_fn, s.last_name AS s_ln,
              r.first_name AS r_fn, r.last_name AS r_ln
       FROM transfers t
       JOIN users s ON s.id = t.sender_id
       JOIN users r ON r.id = t.recipient_id
       WHERE t.sender_id = ? OR t.recipient_id = ?
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT 50`,
      [req.user.id, req.user.id],
    );
    const history = rows.map(t => {
      const out = t.sender_id === req.user.id;
      return {
        id: t.id,
        amount: Number(t.amount),
        date: t.created_at,
        direction: out ? 'out' : 'in',
        counterpart: out ? `${t.r_fn} ${t.r_ln}` : `${t.s_fn} ${t.s_ln}`,
      };
    });
    return res.json({ balance: Number(u[0]?.balance ?? 0), history });
  } catch (error) {
    console.error('wallet get error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * POST /api/wallet/transfer — vire un montant vers un autre compte.
 * Le destinataire est identifié par son e-mail, son téléphone ou son code e-Dinar.
 * Débit et crédit se font dans une transaction (tout ou rien).
 */
async function transfer(req, res) {
  const recipient = (req.body.recipient || '').trim();
  const amount = Number(req.body.amount);

  if (!recipient) {
    return res.status(400).json({ message: 'Destinataire requis.' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Montant invalide.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Destinataire (par e-mail, téléphone ou code e-Dinar).
    const [rec] = await conn.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? OR edinar_code = ? LIMIT 1',
      [recipient, recipient, recipient]);
    if (rec.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Destinataire introuvable.' });
    }
    const recipientId = rec[0].id;
    if (recipientId === req.user.id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Vous ne pouvez pas vous virer de l\'argent à vous-même.' });
    }

    // Verrou sur la ligne de l'expéditeur pour lire un solde à jour.
    const [me] = await conn.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
    if (Number(me[0].balance) < amount) {
      await conn.rollback();
      return res.status(400).json({ message: 'Solde insuffisant.' });
    }

    await conn.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.user.id]);
    await conn.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, recipientId]);
    await conn.query('INSERT INTO transfers (sender_id, recipient_id, amount) VALUES (?, ?, ?)',
      [req.user.id, recipientId, amount]);

    await conn.commit();

    const [now] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    return res.status(201).json({
      balance: Number(now[0].balance),
      message: 'Virement effectué avec succès.',
    });
  } catch (error) {
    await conn.rollback();
    console.error('wallet transfer error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    conn.release();
  }
}

module.exports = { getWallet, transfer };
