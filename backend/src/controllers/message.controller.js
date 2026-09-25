const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

/** Durée de rétention des messages (jours). */
const RETENTION_DAYS = 180;

/** Supprime les messages dépassant la durée de rétention. */
async function purgeOld() {
  try {
    await pool.query('DELETE FROM messages WHERE created_at < (NOW() - INTERVAL ? DAY)', [RETENTION_DAYS]);
  } catch (error) {
    console.error('messages purge error:', error);
  }
}

/** Vrai pour tout rôle d'administration (bureau, régional, général). */
function isAdmin(role) {
  return typeof role === 'string' && role.startsWith('admin_');
}

/**
 * Règle hiérarchique pour DÉMARRER une conversation :
 *  - jamais vers un client, ni vers soi-même ;
 *  - les administrateurs (chef de bureau, régional, général) peuvent écrire à
 *    tout le personnel, y compris entre eux et vers l'admin général ;
 *  - le personnel non-admin (agent, livreur) peut écrire à tout le monde SAUF
 *    l'admin général (mais pourra toujours lui répondre s'il est contacté).
 */
function canMessage(senderRole, recipientRole) {
  if (recipientRole === 'client') return false;
  if (recipientRole === 'admin_general' && !isAdmin(senderRole)) return false;
  return true;
}

/**
 * GET /api/messages/contacts — uniquement les personnes avec qui une
 * conversation existe déjà (au moins un message échangé). Les plus récentes
 * en premier. Pour trouver un nouveau collègue, voir l'annuaire ci-dessous.
 */
async function contacts(req, res) {
  const me = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.role,
             b.city AS bureau_city, r.name AS region_name,
             MAX(m.created_at) AS last_at
      FROM users u
      JOIN messages m
        ON (m.sender_id = u.id AND m.recipient_id = ?)
        OR (m.recipient_id = u.id AND m.sender_id = ?)
      LEFT JOIN bureaux b ON b.id = u.bureau_id
      LEFT JOIN regions r ON r.id = u.region_id
      WHERE u.role <> 'client' AND u.id <> ?
      GROUP BY u.id, u.first_name, u.last_name, u.role, b.city, r.name
      ORDER BY last_at DESC`, [me, me, me]);

    return res.json(rows.map(u => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      bureauCity: u.bureau_city ?? null,
      regionName: u.region_name ?? null,
    })));
  } catch (error) {
    console.error('messages contacts error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * GET /api/messages/directory — annuaire : tout le personnel que l'utilisateur
 * est autorisé à contacter (selon la hiérarchie), avec ses infos. Sert de point
 * de départ pour ouvrir une nouvelle conversation depuis la page « Annuaire ».
 */
async function directory(req, res) {
  try {
    const viewerIsAdmin = isAdmin(req.user.role);
    const [rows] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.role, u.email,
             b.city AS bureau_city, r.name AS region_name,
             GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '||') AS teams
      FROM users u
      LEFT JOIN bureaux b ON b.id = u.bureau_id
      LEFT JOIN regions r ON r.id = u.region_id
      LEFT JOIN team_members tm ON tm.user_id = u.id
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE u.role <> 'client' AND u.id <> ?
        -- L'admin général n'apparaît que pour les administrateurs.
        AND (u.role <> 'admin_general' OR ?)
      GROUP BY u.id, u.first_name, u.last_name, u.role, u.email, b.city, r.name
      ORDER BY u.first_name, u.last_name`, [req.user.id, viewerIsAdmin ? 1 : 0]);

    return res.json(rows.map(u => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      email: u.email,
      bureauCity: u.bureau_city ?? null,
      regionName: u.region_name ?? null,
      teams: u.teams ? u.teams.split('||') : [],
    })));
  } catch (error) {
    console.error('messages directory error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/messages/:userId — conversation avec un interlocuteur. */
async function conversation(req, res) {
  const me = req.user.id;
  const other = Number(req.params.userId);
  try {
    await purgeOld();
    const [rows] = await pool.query(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC`, [me, other, other, me]);

    return res.json(rows.map(m => ({
      id: m.id,
      fromMe: m.sender_id === me,
      content: decrypt({ cipher: m.content_cipher, iv: m.iv, tag: m.tag }),
      createdAt: m.created_at,
    })));
  } catch (error) {
    console.error('messages conversation error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/messages — envoie un message chiffré. */
async function send(req, res) {
  const { toUserId, content } = req.body;
  if (!toUserId || !content || !content.trim()) {
    return res.status(400).json({ message: 'Destinataire et message requis.' });
  }
  try {
    const [recipients] = await pool.query('SELECT role FROM users WHERE id = ?', [toUserId]);
    if (recipients.length === 0) {
      return res.status(404).json({ message: 'Destinataire introuvable.' });
    }
    if (!canMessage(req.user.role, recipients[0].role)) {
      // Exception : on peut toujours répondre à quelqu'un qui nous a écrit en
      // premier (ex. l'admin général initie la conversation avec un agent, qui
      // n'aurait pas eu le droit de la démarrer mais peut désormais répondre).
      const [prior] = await pool.query(
        'SELECT 1 FROM messages WHERE sender_id = ? AND recipient_id = ? LIMIT 1',
        [toUserId, req.user.id]);
      if (prior.length === 0) {
        return res.status(403).json({ message: 'Vous ne pouvez pas écrire à ce destinataire.' });
      }
    }

    const { cipher, iv, tag } = encrypt(content.trim());
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, recipient_id, content_cipher, iv, tag) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, toUserId, cipher, iv, tag]);

    return res.status(201).json({ id: result.insertId, fromMe: true, content: content.trim(), createdAt: new Date() });
  } catch (error) {
    console.error('messages send error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { contacts, directory, conversation, send, purgeOld };
