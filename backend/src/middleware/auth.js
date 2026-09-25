const jwt = require('jsonwebtoken');

/**
 * Middleware qui protège une route : il exige un jeton JWT valide dans
 * l'en-tête « Authorization: Bearer <token> ». Si le jeton est bon, on attache
 * les infos de l'utilisateur à `req.user` et on laisse passer la requête.
 */
module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expirée ou invalide.' });
  }
};
