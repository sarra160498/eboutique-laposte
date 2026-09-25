const pool = require('../config/db');

/** Une équipe avec son responsable et le nombre de membres. */
/** Missions (fonctions) valides pour une équipe. */
const TEAM_MISSIONS = ['none', 'admin', 'sav'];

function toTeam(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mission: row.mission ?? 'none',
    responsibleUserId: row.responsible_user_id ?? null,
    responsibleName: row.responsible_name ?? null,
    memberCount: Number(row.member_count ?? 0),
  };
}

function toMember(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
  };
}

/** GET /api/teams — liste des équipes (responsable + effectif). */
async function list(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.*,
             CONCAT(r.first_name, ' ', r.last_name) AS responsible_name,
             (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
      FROM teams t
      LEFT JOIN users r ON r.id = t.responsible_user_id
      ORDER BY t.id`);
    return res.json(rows.map(toTeam));
  } catch (error) {
    console.error('teams list error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/teams/:id/members — membres d'une équipe. */
async function members(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.* FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
      ORDER BY u.first_name`, [req.params.id]);
    return res.json(rows.map(toMember));
  } catch (error) {
    console.error('team members error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/teams/mine — équipes auxquelles l'utilisateur courant est affecté. */
async function mine(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.id, t.name, t.description, t.responsible_user_id,
             CONCAT(resp.first_name, ' ', resp.last_name) AS responsible_name
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      LEFT JOIN users resp ON resp.id = t.responsible_user_id
      WHERE tm.user_id = ?
      ORDER BY t.name`, [req.user.id]);
    return res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      responsibleName: row.responsible_name ?? null,
      isResponsible: row.responsible_user_id === req.user.id,
    })));
  } catch (error) {
    console.error('team mine error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/teams — crée une équipe (admin général). */
async function create(req, res) {
  const { name, description } = req.body;
  const mission = TEAM_MISSIONS.includes(req.body.mission) ? req.body.mission : 'none';
  if (!name) {
    return res.status(400).json({ message: 'Le nom de l\'équipe est requis.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO teams (name, description, mission) VALUES (?, ?, ?)',
      [name, description || null, mission]);
    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [result.insertId]);
    return res.status(201).json(toTeam(rows[0]));
  } catch (error) {
    console.error('team create error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** PUT /api/teams/:id — met à jour nom/description/mission/responsable. */
async function update(req, res) {
  const { name, description, responsibleUserId } = req.body;
  const mission = TEAM_MISSIONS.includes(req.body.mission) ? req.body.mission : 'none';
  try {
    await pool.query(
      'UPDATE teams SET name = ?, description = ?, mission = ?, responsible_user_id = ? WHERE id = ?',
      [name, description || null, mission, responsibleUserId ?? null, req.params.id]);
    // Le responsable est automatiquement membre de l'équipe.
    if (responsibleUserId) {
      await pool.query(
        'INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)',
        [req.params.id, responsibleUserId]);
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('team update error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** DELETE /api/teams/:id */
async function remove(req, res) {
  try {
    await pool.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('team delete error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/teams/:id/members — ajoute un membre. */
async function addMember(req, res) {
  const { userId } = req.body;
  try {
    await pool.query('INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)', [req.params.id, userId]);
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('team addMember error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** DELETE /api/teams/:id/members/:userId — retire un membre. */
async function removeMember(req, res) {
  try {
    await pool.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
    return res.status(204).send();
  } catch (error) {
    console.error('team removeMember error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { list, mine, members, create, update, remove, addMember, removeMember };
