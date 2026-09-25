const router = require('express').Router();
const {
  register, login, me, updateAvatar, updateProfile,
  verifyEmail, resendVerification,
  verifyOtp, forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

// Routes publiques — inscription / connexion
router.post('/register', register);
router.post('/login', login);

// Vérification d'e-mail
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Authentification à deux facteurs (2FA)
router.post('/verify-otp', verifyOtp);

// Réinitialisation de mot de passe
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Routes protégées : nécessitent un jeton valide
router.get('/me', authMiddleware, me);
router.patch('/me/avatar', authMiddleware, updateAvatar);
router.patch('/me/profile', authMiddleware, updateProfile);

module.exports = router;
