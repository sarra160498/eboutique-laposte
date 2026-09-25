const pool = require('../config/db');

/**
 * Missions (fonctions) des équipes auxquelles appartient l'utilisateur.
 * Ex. ['admin', 'sav']. Une équipe de mission 'none' n'est pas retournée.
 */
async function getMissions(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT t.mission
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = ? AND t.mission IS NOT NULL AND t.mission <> 'none'`,
    [userId]);
  return rows.map(r => r.mission);
}

/**
 * Autorise si le rôle de l'utilisateur figure dans `roles`, OU s'il appartient
 * à une équipe dont la mission est dans `missions`. Une équipe de mission
 * 'admin' donne toujours accès (super-utilisateur). À utiliser après `auth`.
 * Les missions résolues sont posées sur `req.user.missions` pour les contrôleurs.
 */
function requireRoleOrMission(roles, missions = []) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    if (roles.includes(req.user.role)) return next();
    try {
      const mine = await getMissions(req.user.id);
      req.user.missions = mine;
      if (mine.includes('admin') || missions.some(m => mine.includes(m))) {
        return next();
      }
    } catch (error) {
      console.error('requireRoleOrMission error:', error);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
    return res.status(403).json({ message: 'Accès refusé : droits insuffisants.' });
  };
}

module.exports = { getMissions, requireRoleOrMission };
