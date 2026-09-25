const pool = require('../config/db');
const { RANK, ASSIGNABLE } = require('../constants/roles');

/** Vrai pour un rôle d'administration réel (bureau, régional, général). */
function isRealAdmin(role) {
  return typeof role === 'string' && role.startsWith('admin_');
}

/**
 * Un membre d'une équipe de mission 'admin' qui n'est PAS lui-même un
 * administrateur : il gère le quotidien comme un admin, mais ne peut ni gérer
 * ni nommer d'administrateurs (réservé à l'admin général).
 */
function isAdminViaMission(actor) {
  return !isRealAdmin(actor.role) && (actor.missions || []).includes('admin');
}

function toUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    bureauId: row.bureau_id ?? null,
    regionId: row.region_id ?? null,
  };
}

/**
 * GET /api/users — liste selon le périmètre de l'admin :
 *  - admin_general : tous les comptes ;
 *  - admin_regional : le personnel de sa région ;
 *  - admin_bureau : le personnel de son bureau.
 */
async function list(req, res) {
  const { role, bureauId, regionId } = req.user;
  try {
    let rows;
    if (role === 'admin_general' || isAdminViaMission(req.user)) {
      [rows] = await pool.query('SELECT * FROM users ORDER BY id');
    } else if (role === 'admin_regional') {
      [rows] = await pool.query('SELECT * FROM users WHERE region_id = ? ORDER BY id', [regionId]);
    } else {
      [rows] = await pool.query('SELECT * FROM users WHERE bureau_id = ? ORDER BY id', [bureauId]);
    }
    return res.json(rows.map(toUser));
  } catch (error) {
    console.error('users list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * PATCH /api/users/:id — change le rôle (et le rattachement) d'un compte,
 * dans la limite des droits de l'acteur :
 *  - il ne peut pas modifier un compte de rang égal ou supérieur au sien ;
 *  - il ne peut attribuer que des rôles autorisés pour son niveau ;
 *  - le bureau/la région sont contraints à son périmètre.
 */
async function updateRole(req, res) {
  const actor = req.user;
  const { role, bureauId, regionId } = req.body;

  const viaMission = isAdminViaMission(actor);
  // Un admin via équipe ne peut attribuer que des rôles non-administrateurs.
  const assignable = viaMission ? ['client', 'agent', 'livreur'] : (ASSIGNABLE[actor.role] || []);
  if (!assignable.includes(role)) {
    return res.status(403).json({ message: 'Vous ne pouvez pas attribuer ce rôle.' });
  }

  try {
    const [targets] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (targets.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    const target = targets[0];

    // Seul l'admin général peut gérer/nommer un autre administrateur.
    if (viaMission && isRealAdmin(target.role)) {
      return res.status(403).json({ message: 'Seul l\'admin général peut gérer un administrateur.' });
    }

    // On ne touche pas à un compte de rang égal ou supérieur (l'admin général
    // et l'admin via équipe gèrent librement les comptes non-administrateurs).
    const elevated = actor.role === 'admin_general' || viaMission;
    if (!elevated && RANK[target.role] >= RANK[actor.role]) {
      return res.status(403).json({ message: 'Ce compte est hors de votre périmètre.' });
    }

    const assignment = await resolveAssignment(actor, role, bureauId, regionId);
    if (assignment.error) {
      return res.status(403).json({ message: assignment.error });
    }

    await pool.query('UPDATE users SET role = ?, bureau_id = ?, region_id = ? WHERE id = ?',
      [role, assignment.bureauId, assignment.regionId, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    return res.json(toUser(updated[0]));
  } catch (error) {
    console.error('users updateRole error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** Détermine le bureau/la région finals d'une affectation, selon l'acteur. */
async function resolveAssignment(actor, role, bureauId, regionId) {
  // Rôles rattachés à un bureau : agent et chef de bureau.
  if (role === 'agent' || role === 'admin_bureau') {
    if (actor.role === 'admin_bureau') {
      return { bureauId: actor.bureauId, regionId: actor.regionId };
    }
    if (!bureauId) {
      return { error: 'Un bureau est requis pour ce rôle.' };
    }
    const [rows] = await pool.query('SELECT region_id FROM bureaux WHERE id = ?', [bureauId]);
    if (rows.length === 0) {
      return { error: 'Bureau inconnu.' };
    }
    const bureauRegion = rows[0].region_id;
    // Un admin régional ne peut affecter qu'à un bureau de SA région.
    if (actor.role === 'admin_regional' && bureauRegion !== actor.regionId) {
      return { error: "Ce bureau n'est pas dans votre région." };
    }
    return { bureauId, regionId: bureauRegion };
  }

  // Admin régional : rattaché à une région (réservé à l'admin général).
  if (role === 'admin_regional') {
    if (!regionId) {
      return { error: 'Une région est requise pour ce rôle.' };
    }
    return { bureauId: null, regionId };
  }

  // client, livreur, admin_general : pas de rattachement géographique.
  return { bureauId: null, regionId: null };
}

module.exports = { list, updateRole };
