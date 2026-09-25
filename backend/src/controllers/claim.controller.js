const pool = require('../config/db');
const { sendMailAsync, claimStatusTemplate } = require('../utils/mailer');

/** Types de réclamation autorisés. */
const CLAIM_TYPES = ['damaged', 'lost', 'other'];
/** Statuts autorisés (traitement par le personnel). */
const CLAIM_STATUSES = ['open', 'in_review', 'resolved'];

/** Transforme une ligne SQL en réclamation (forme attendue par le front). */
function toClaim(row) {
  return {
    id: row.id,
    reference: row.reference ?? null,
    type: row.type,
    description: row.description,
    status: row.status,
    date: row.created_at,
    response: row.response ?? null,
    respondedAt: row.responded_at ?? null,
  };
}

/** GET /api/claims — réclamations de l'utilisateur connecté. */
async function listMine(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.id],
    );
    return res.json(rows.map(toClaim));
  } catch (error) {
    console.error('claims list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/claims — déclare une réclamation (colis abîmé / perdu…). */
async function create(req, res) {
  const { reference, type, description } = req.body;

  if (!type || !CLAIM_TYPES.includes(type)) {
    return res.status(400).json({ message: 'Type de réclamation invalide.' });
  }
  if (!description || description.trim().length < 5) {
    return res.status(400).json({ message: 'Merci de décrire le problème (au moins 5 caractères).' });
  }

  try {
    // Si une référence est fournie, on vérifie qu'elle correspond à un colis
    // existant (sans bloquer : la réclamation reste possible sinon).
    let ref = reference ? String(reference).trim().toUpperCase() : null;
    if (ref) {
      const [found] = await pool.query('SELECT id FROM orders WHERE reference = ?', [ref]);
      if (found.length === 0) ref = reference.trim().toUpperCase();
    }

    const [result] = await pool.query(
      'INSERT INTO claims (user_id, reference, type, description) VALUES (?, ?, ?, ?)',
      [req.user.id, ref, type, description.trim()],
    );
    const [rows] = await pool.query('SELECT * FROM claims WHERE id = ?', [result.insertId]);
    return res.status(201).json(toClaim(rows[0]));
  } catch (error) {
    console.error('claims create error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/claims/manage — toutes les réclamations (personnel). */
async function manage(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.email
       FROM claims c JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`,
    );
    return res.json(rows.map(r => ({
      ...toClaim(r),
      customer: `${r.first_name} ${r.last_name}`,
      email: r.email,
    })));
  } catch (error) {
    console.error('claims manage error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * PATCH /api/claims/:id/status — traitement d'une réclamation par le personnel :
 * changement de statut ET/OU réponse écrite au client. Au moins l'un des deux
 * doit être fourni. La réponse est enregistrée et envoyée au client par e-mail.
 */
async function updateStatus(req, res) {
  const { status } = req.body;
  const response = typeof req.body.response === 'string' ? req.body.response.trim() : '';
  const hasStatus = status !== undefined && status !== null && status !== '';
  const hasResponse = response.length > 0;

  if (!hasStatus && !hasResponse) {
    return res.status(400).json({ message: 'Indiquez un statut ou un message de réponse.' });
  }
  if (hasStatus && !CLAIM_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Réclamation introuvable.' });
    }

    // On ne peut répondre au client qu'après avoir pris la réclamation en charge.
    const finalStatus = hasStatus ? status : existing[0].status;
    if (hasResponse && finalStatus === 'open') {
      return res.status(400).json({ message: 'Prenez d\'abord la réclamation en charge avant de répondre.' });
    }

    // Construit dynamiquement la mise à jour (statut et/ou réponse).
    const fields = [];
    const params = [];
    if (hasStatus) { fields.push('status = ?'); params.push(status); }
    if (hasResponse) {
      fields.push('response = ?', 'responded_at = NOW()', 'responded_by = ?');
      params.push(response, req.user.id);
    }
    params.push(req.params.id);
    await pool.query(`UPDATE claims SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM claims WHERE id = ?', [req.params.id]);
    const claim = rows[0];

    // Le client est notifié par e-mail dès qu'il y a une réponse écrite, ou
    // quand sa réclamation est prise en charge / résolue.
    if (hasResponse || claim.status === 'in_review' || claim.status === 'resolved') {
      const [users] = await pool.query(
        'SELECT first_name, email FROM users WHERE id = ?', [claim.user_id]);
      if (users.length > 0 && users[0].email) {
        let subject;
        if (hasStatus && claim.status === 'resolved') {
          subject = 'Votre réclamation a été résolue — e-Boutique La Poste';
        } else if (hasStatus && claim.status === 'in_review') {
          subject = 'Votre réclamation est en cours de traitement — e-Boutique La Poste';
        } else {
          subject = 'Réponse à votre réclamation — e-Boutique La Poste';
        }
        sendMailAsync(
          users[0].email,
          subject,
          claimStatusTemplate(users[0].first_name, claim.type, claim.reference, claim.status, hasResponse ? response : null),
        );
      }
    }

    return res.json(toClaim(claim));
  } catch (error) {
    console.error('claims updateStatus error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { listMine, create, manage, updateStatus };
