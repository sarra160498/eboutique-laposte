const { getMissions } = require('./teamAccess');

/**
 * Fabrique un middleware qui n'autorise que certains rôles.
 * À utiliser APRÈS le middleware `auth` (qui pose `req.user`).
 *
 * En plus des rôles listés, un utilisateur membre d'une équipe de mission
 * 'admin' est TOUJOURS autorisé (super-utilisateur). Les restrictions propres
 * à la gestion des administrateurs restent appliquées dans les contrôleurs.
 *
 * Exemple : router.post('/', auth, requireRole('admin_general'), controller.create)
 */
module.exports = function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    // Repli : une équipe de mission 'admin' donne accès à tout.
    try {
      const missions = await getMissions(req.user.id);
      req.user.missions = missions;
      if (missions.includes('admin')) {
        return next();
      }
    } catch (error) {
      console.error('requireRole missions error:', error);
    }
    return res.status(403).json({ message: 'Accès refusé : droits insuffisants.' });
  };
};
