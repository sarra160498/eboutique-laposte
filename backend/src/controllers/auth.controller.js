const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const {
  sendMail, sendMailAsync, randomToken, randomOtp,
  verifyEmailTemplate, resetPasswordTemplate, otpTemplate,
} = require('../utils/mailer');
const { getMissions } = require('../middleware/teamAccess');
const { isValidCin, isValidPhone, isValidCcp, edinarCodeFor } = require('../utils/validation');

/** Crée un jeton JWT signé pour un utilisateur (rôle inclus pour l'autorisation). */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, bureauId: user.bureau_id ?? null, regionId: user.region_id ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

/** Transforme une ligne SQL en objet utilisateur SANS le mot de passe. */
function toPublicUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role || 'client',
    bureauId: row.bureau_id ?? null,
    regionId: row.region_id ?? null,
    cin: row.cin ?? null,
    phone: row.phone ?? null,
    ccp: row.ccp ?? null,
    edinarCode: row.edinar_code ?? null,
    avatar: row.avatar ?? null,
  };
}

/** Objet utilisateur public enrichi des missions de ses équipes (admin, sav…). */
async function toPublicUserWithMissions(row) {
  const user = toPublicUser(row);
  user.missions = await getMissions(row.id);
  return user;
}

/** URL de base du front (pour construire les liens des e-mails). */
function clientUrl() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:4200';
}

/** Date d'expiration : maintenant + N minutes, au format MySQL DATETIME. */
function expiresIn(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/** POST /api/auth/register — crée un compte (non vérifié) et envoie l'e-mail de confirmation. */
async function register(req, res) {
  const { firstName, lastName, email, password, cin, phone } = req.body;
  const ccp = req.body.ccp || null;

  if (!firstName || !lastName || !email || !password || !cin || !phone) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  if (!isValidCin(cin)) {
    return res.status(400).json({ message: 'Le CIN doit comporter 8 chiffres et commencer par 0 ou 1.' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Le numéro de téléphone doit comporter 8 chiffres et commencer par 52, 53, 54, 55, 40 ou 41.' });
  }
  if (ccp && !isValidCcp(ccp)) {
    return res.status(400).json({ message: 'Le numéro CCP (RIP) doit comporter 20 chiffres.' });
  }

  // Code e-Dinar rattaché à l'identité : dérivé de la CIN côté serveur
  // (source de vérité), quel que soit ce qu'envoie le client.
  const edinarCode = edinarCodeFor(cin);

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
    }

    // On ne stocke jamais le mot de passe en clair : on garde son empreinte (hash).
    const passwordHash = await bcrypt.hash(password, 10);
    const token = randomToken();
    await pool.query(
      `INSERT INTO users (first_name, last_name, cin, phone, ccp, edinar_code, email, password_hash, email_verified, verify_token, verify_expires, twofa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [firstName, lastName, cin, phone, ccp, edinarCode, email, passwordHash, token, expiresIn(24 * 60)],
    );

    const link = `${clientUrl()}/verifier-email?token=${token}`;
    sendMailAsync(email, 'Confirmez votre adresse e-mail — e-Boutique La Poste', verifyEmailTemplate(firstName, link));

    // Pas de connexion automatique : l'utilisateur doit d'abord vérifier son e-mail.
    return res.status(201).json({
      needVerification: true,
      message: 'Compte créé. Un e-mail de confirmation vous a été envoyé.',
    });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/auth/verify-email?token=... — active le compte. */
async function verifyEmail(req, res) {
  const token = req.query.token || req.body.token;
  if (!token) {
    return res.status(400).json({ message: 'Jeton manquant.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE verify_token = ?', [token]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Lien de vérification invalide ou déjà utilisé.' });
    }
    const user = rows[0];
    if (user.verify_expires && new Date(user.verify_expires) < new Date()) {
      return res.status(400).json({ message: 'Le lien de vérification a expiré. Veuillez en demander un nouveau.' });
    }
    await pool.query(
      'UPDATE users SET email_verified = 1, verify_token = NULL, verify_expires = NULL WHERE id = ?',
      [user.id],
    );
    return res.json({ message: 'Votre adresse e-mail a été confirmée. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/auth/resend-verification — renvoie l'e-mail de confirmation. */
async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis.' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    // Réponse générique pour ne pas révéler l'existence d'un compte.
    if (rows.length === 0 || rows[0].email_verified) {
      return res.json({ message: 'Si un compte non vérifié existe, un e-mail a été renvoyé.' });
    }
    const user = rows[0];
    const token = randomToken();
    await pool.query('UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?',
      [token, expiresIn(24 * 60), user.id]);
    const link = `${clientUrl()}/verifier-email?token=${token}`;
    sendMailAsync(email, 'Confirmez votre adresse e-mail — e-Boutique La Poste', verifyEmailTemplate(user.first_name, link));
    return res.json({ message: 'Si un compte non vérifié existe, un e-mail a été renvoyé.' });
  } catch (error) {
    console.error('resendVerification error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/auth/login — connecte un utilisateur (gère e-mail non vérifié et 2FA). */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const row = rows[0];
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 1) Le compte doit avoir confirmé son adresse e-mail.
    if (!row.email_verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Veuillez confirmer votre adresse e-mail avant de vous connecter.',
      });
    }

    // 2) Si la 2FA est activée : on génère un code OTP et on l'envoie par e-mail.
    if (row.twofa_enabled) {
      const code = randomOtp();
      await pool.query('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
        [code, expiresIn(5), row.id]);
      sendMailAsync(row.email, 'Votre code de connexion — e-Boutique La Poste', otpTemplate(row.first_name, code));
      return res.json({
        twoFactor: true,
        email: row.email,
        message: 'Un code de vérification vous a été envoyé par e-mail.',
      });
    }

    // 3) Connexion standard.
    return res.json({ token: signToken(row), user: await toPublicUserWithMissions(row) });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/auth/verify-otp — valide le code 2FA et ouvre la session. */
async function verifyOtp(req, res) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: 'Email et code requis.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Session invalide. Reconnectez-vous.' });
    }
    const row = rows[0];
    if (!row.otp_code || !row.otp_expires) {
      return res.status(400).json({ message: 'Aucun code en attente. Reconnectez-vous.' });
    }
    if (new Date(row.otp_expires) < new Date()) {
      return res.status(400).json({ message: 'Le code a expiré. Reconnectez-vous.' });
    }
    if (String(code).trim() !== row.otp_code) {
      return res.status(401).json({ message: 'Code incorrect.' });
    }
    // Code valide : on l'invalide et on ouvre la session.
    await pool.query('UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?', [row.id]);
    return res.json({ token: signToken(row), user: await toPublicUserWithMissions(row) });
  } catch (error) {
    console.error('verifyOtp error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/auth/forgot-password — envoie un lien de réinitialisation. */
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis.' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    // Réponse générique (anti-énumération de comptes).
    const generic = { message: 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.' };
    if (rows.length === 0) return res.json(generic);

    const user = rows[0];
    const token = randomToken();
    await pool.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expiresIn(60), user.id]);
    const link = `${clientUrl()}/reinitialiser?token=${token}`;
    sendMailAsync(email, 'Réinitialisation de votre mot de passe — e-Boutique La Poste', resetPasswordTemplate(user.first_name, link));
    return res.json(generic);
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** POST /api/auth/reset-password — définit un nouveau mot de passe via le jeton. */
async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Jeton et nouveau mot de passe requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [token]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Lien de réinitialisation invalide ou déjà utilisé.' });
    }
    const user = rows[0];
    if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ message: 'Le lien de réinitialisation a expiré.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    // Réinitialiser le mot de passe confirme aussi implicitement l'e-mail.
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, email_verified = 1 WHERE id = ?',
      [passwordHash, user.id],
    );
    return res.json({ message: 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** PATCH /api/auth/me/avatar — met à jour la photo de profil du compte courant. */
async function updateAvatar(req, res) {
  const { avatar } = req.body;
  // Photo attendue en data URL (image encodée). On limite la taille (~1,5 Mo).
  if (avatar !== null && (typeof avatar !== 'string' || !avatar.startsWith('data:image/'))) {
    return res.status(400).json({ message: 'Image invalide.' });
  }
  if (avatar && avatar.length > 2_000_000) {
    return res.status(413).json({ message: 'Image trop volumineuse (max ~1,5 Mo).' });
  }
  try {
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: await toPublicUserWithMissions(rows[0]) });
  } catch (error) {
    console.error('updateAvatar error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * PATCH /api/auth/me/profile — met à jour les informations d'identité que le
 * titulaire peut renseigner lui-même : CIN et téléphone (souvent vides au
 * départ). Le code e-Dinar est redérivé de la CIN (source de vérité serveur).
 */
async function updateProfile(req, res) {
  const { cin, phone } = req.body;
  if (!cin || !phone) {
    return res.status(400).json({ message: 'Le CIN et le téléphone sont requis.' });
  }
  if (!/^[01]\d{7}$/.test(cin)) {
    return res.status(400).json({ message: 'Le CIN doit comporter 8 chiffres et commencer par 0 ou 1.' });
  }
  if (!/^(5[2-5]|4[01])\d{6}$/.test(phone)) {
    return res.status(400).json({ message: 'Le numéro de téléphone doit comporter 8 chiffres et commencer par 52, 53, 54, 55, 40 ou 41.' });
  }
  try {
    const check = cin.split('').reduce((s, d) => s + Number(d), 0) % 10;
    const edinarCode = `EDN-17-${cin}-${check}`;
    await pool.query('UPDATE users SET cin = ?, phone = ?, edinar_code = ? WHERE id = ?',
      [cin, phone, edinarCode, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: await toPublicUserWithMissions(rows[0]) });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/** GET /api/auth/me — renvoie l'utilisateur courant (route protégée). */
async function me(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    return res.json({ user: await toPublicUserWithMissions(rows[0]) });
  } catch (error) {
    console.error('me error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = {
  register, login, me, updateAvatar, updateProfile,
  verifyEmail, resendVerification,
  verifyOtp, forgotPassword, resetPassword,
};
