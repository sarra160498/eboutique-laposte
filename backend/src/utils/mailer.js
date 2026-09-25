const crypto = require('crypto');

/**
 * Envoi d'e-mails (vérification de compte, réinitialisation de mot de passe,
 * code de connexion 2FA).
 *
 * Deux modes, choisis automatiquement :
 *  - Si des variables SMTP_* sont définies dans .env, on envoie de vrais e-mails
 *    via nodemailer (ex. Gmail avec un « mot de passe d'application », ou un
 *    compte de test Ethereal/Mailtrap).
 *  - Sinon (mode démo/jury), on N'envoie rien mais on AFFICHE le contenu du
 *    message dans la console du serveur. Le lien de vérification ou le code OTP
 *    y sont donc lisibles, ce qui permet de faire la démonstration sans devoir
 *    configurer un serveur d'e-mail.
 */

let transporter = null;
let mode = 'console';

// On tente d'initialiser nodemailer uniquement si un hôte SMTP est fourni.
if (process.env.SMTP_HOST) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE) === 'true', // true = port 465
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      // Certains PC (antivirus/pare-feu type Kaspersky, ESET… ou proxy réseau)
      // interceptent le TLS et présentent un certificat auto-signé, ce qui fait
      // échouer l'envoi (« self-signed certificate in certificate chain »).
      // En développement uniquement, mettre SMTP_ALLOW_SELF_SIGNED=true pour
      // ignorer cette vérification. NE PAS activer en production.
      ...(String(process.env.SMTP_ALLOW_SELF_SIGNED) === 'true'
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });
    mode = 'smtp';
  } catch (err) {
    console.warn('[mailer] nodemailer indisponible, repli sur le mode console :', err.message);
  }
}

/** Adresse d'expéditeur affichée. */
const FROM = process.env.SMTP_FROM || 'e-Boutique La Poste Tunisienne <no-reply@laposte.tn>';

/**
 * Envoie un e-mail. Ne lève jamais d'erreur bloquante : en cas d'échec SMTP,
 * on bascule sur l'affichage console pour ne pas casser le parcours utilisateur.
 */
async function sendMail(to, subject, html, attachments = null) {
  // Version texte brut (améliore la délivrabilité et réduit le score spam,
  // donc moins de retard de « greylisting » côté destinataire).
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (mode === 'smtp' && transporter) {
    try {
      await transporter.sendMail({
        from: FROM, to, subject, html, text,
        ...(attachments && attachments.length ? { attachments } : {}),
      });
      console.log(`[mailer] E-mail envoyé à ${to} — « ${subject} »`);
      return;
    } catch (err) {
      console.error('[mailer] Échec de l\'envoi SMTP, repli console :', err.message);
    }
  }
  // Mode console (démo) : on affiche le message dans le terminal du serveur.
  console.log('\n──────────────── E-MAIL (mode démo) ────────────────');
  console.log(`À      : ${to}`);
  console.log(`Objet  : ${subject}`);
  if (attachments && attachments.length) {
    console.log(`Pièces jointes : ${attachments.map(a => a.filename).join(', ')}`);
  }
  console.log(`Contenu:\n${text}`);
  console.log('────────────────────────────────────────────────────\n');
}

/**
 * Envoie un e-mail « en arrière-plan » : ne bloque pas l'appelant. Utile pour
 * que l'API réponde immédiatement (inscription, connexion 2FA…) sans attendre
 * l'accusé de réception de Gmail.
 */
function sendMailAsync(to, subject, html, attachments = null) {
  sendMail(to, subject, html, attachments).catch(err =>
    console.error('[mailer] Envoi arrière-plan échoué :', err.message));
}

/** Génère un jeton aléatoire (URL-safe) pour la vérification / réinitialisation. */
function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Génère un code OTP numérique à 6 chiffres (pour la 2FA). */
function randomOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// ── Modèles d'e-mails ────────────────────────────────────────────────────────

function verifyEmailTemplate(firstName, link) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">Bienvenue sur l'e-Boutique La Poste Tunisienne</h2>
      <p>Bonjour ${firstName},</p>
      <p>Merci pour votre inscription. Pour activer votre compte, veuillez confirmer votre adresse e-mail :</p>
      <p><a href="${link}" style="background:#1B2D6B;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">Confirmer mon adresse e-mail</a></p>
      <p style="color:#666;font-size:13px">Ou copiez ce lien dans votre navigateur :<br>${link}</p>
      <p style="color:#666;font-size:13px">Ce lien expire dans 24 heures.</p>
    </div>`;
}

function resetPasswordTemplate(firstName, link) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">Réinitialisation de votre mot de passe</h2>
      <p>Bonjour ${firstName},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
      <p><a href="${link}" style="background:#C0392B;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">Choisir un nouveau mot de passe</a></p>
      <p style="color:#666;font-size:13px">Ou copiez ce lien :<br>${link}</p>
      <p style="color:#666;font-size:13px">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    </div>`;
}

/** E-mail accompagnant la facture PDF après un paiement en ligne réussi. */
function invoiceEmailTemplate(firstName, reference, amount) {
  const total = `${Number(amount).toFixed(3)} DT`;
  const ordersUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/mes-commandes`;
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">Merci pour votre paiement</h2>
      <p>Bonjour ${firstName},</p>
      <p>Votre paiement en ligne a bien été confirmé. Vous trouverez votre <b>facture en pièce jointe (PDF)</b>.</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 14px;background:#f3f5fb;font-weight:bold">Référence</td><td style="padding:6px 14px;background:#f3f5fb">${reference}</td></tr>
        <tr><td style="padding:6px 14px;font-weight:bold">Montant payé</td><td style="padding:6px 14px;color:#1f7a52;font-weight:bold">${total}</td></tr>
      </table>
      <p><a href="${ordersUrl}" style="background:#1B2D6B;color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none;display:inline-block">Voir mes commandes</a></p>
      <p style="color:#666;font-size:13px">e-Boutique La Poste Tunisienne</p>
    </div>`;
}

function otpTemplate(firstName, code) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">Votre code de connexion</h2>
      <p>Bonjour ${firstName},</p>
      <p>Voici votre code de vérification à usage unique :</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1B2D6B">${code}</p>
      <p style="color:#666;font-size:13px">Ce code est valable 5 minutes. Ne le communiquez à personne.</p>
    </div>`;
}

/** Libellé + phrase de notification pour chaque statut de colis. */
const STATUS_INFO = {
  paid:             { label: 'Paiement confirmé',      line: 'Votre paiement a bien été enregistré.' },
  received:         { label: 'Pris en charge',         line: 'Votre colis a été pris en charge{lieu}.' },
  in_transit:       { label: 'En transit',             line: 'Votre colis est en cours d\'acheminement.' },
  out_for_delivery: { label: 'En cours de livraison',  line: 'Votre colis a été remis au livreur et arrive bientôt.' },
  delivered:        { label: 'Livré',                  line: 'Votre colis a été livré au destinataire. Merci de votre confiance !' },
  pending:          { label: 'En attente',             line: 'Votre commande est en attente de traitement.' },
};

/** E-mail envoyé au client à chaque changement de statut de son colis. */
function orderStatusTemplate(firstName, reference, status, bureauName) {
  const info = STATUS_INFO[status] || { label: status, line: 'Le statut de votre colis a été mis à jour.' };
  const lieu = bureauName ? ` au bureau de ${bureauName}` : '';
  const line = info.line.replace('{lieu}', lieu);
  const trackUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/suivi`;
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">Suivi de votre colis</h2>
      <p>Bonjour ${firstName},</p>
      <p>${line}</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 14px;background:#f3f5fb;font-weight:bold">Référence</td><td style="padding:6px 14px;background:#f3f5fb">${reference}</td></tr>
        <tr><td style="padding:6px 14px;font-weight:bold">Nouveau statut</td><td style="padding:6px 14px;color:#1B2D6B;font-weight:bold">${info.label}</td></tr>
      </table>
      <p><a href="${trackUrl}" style="background:#1B2D6B;color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none;display:inline-block">Suivre mon colis</a></p>
      <p style="color:#666;font-size:13px">e-Boutique La Poste Tunisienne</p>
    </div>`;
}

/** Libellés des types de réclamation (pour l'e-mail). */
const CLAIM_TYPE_LABEL = {
  damaged: 'Colis abîmé',
  lost: 'Colis perdu',
  other: 'Réclamation',
};

/** Message + couleur selon le nouveau statut de la réclamation. */
const CLAIM_STATUS_INFO = {
  in_review: {
    title: 'Votre réclamation est en cours de traitement',
    line: 'Nos services ont pris en charge votre réclamation et la traitent actuellement.',
    label: 'En cours de traitement',
    color: '#1B2D6B',
  },
  resolved: {
    title: 'Votre réclamation a été résolue',
    line: 'Nous vous informons que votre réclamation a été résolue. Merci de votre patience.',
    label: 'Résolue',
    color: '#1f7a52',
  },
};

/**
 * E-mail envoyé au client quand sa réclamation évolue : changement de statut
 * et/ou réponse écrite du service après-vente (`message`, facultatif).
 */
function claimStatusTemplate(firstName, type, reference, status, message = null) {
  const info = CLAIM_STATUS_INFO[status]
    || { title: 'Mise à jour de votre réclamation', line: 'Le statut de votre réclamation a été mis à jour.', label: status, color: '#1B2D6B' };
  const title = message ? 'Réponse à votre réclamation' : info.title;
  const label = CLAIM_TYPE_LABEL[type] || 'Réclamation';
  const refLine = reference
    ? `<tr><td style="padding:6px 14px;background:#f3f5fb;font-weight:bold">Colis concerné</td><td style="padding:6px 14px;background:#f3f5fb">${reference}</td></tr>`
    : '';
  // Bloc « réponse du service » (échappé, sauts de ligne conservés).
  const safeMessage = message
    ? String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    : '';
  const messageBlock = message
    ? `<div style="margin:14px 0;padding:14px 16px;background:#f3f5fb;border-left:4px solid #1B2D6B">
         <p style="margin:0 0 6px;font-weight:bold;color:#1B2D6B">Message du service après-vente</p>
         <p style="margin:0;white-space:pre-line">${safeMessage}</p>
       </div>`
    : '';
  const claimsUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/reclamations`;
  return `
    <div style="font-family:Arial,sans-serif;color:#222">
      <h2 style="color:#1B2D6B">${title}</h2>
      <p>Bonjour ${firstName},</p>
      <p>${info.line}</p>
      ${messageBlock}
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 14px;font-weight:bold">Type</td><td style="padding:6px 14px">${label}</td></tr>
        ${refLine}
        <tr><td style="padding:6px 14px;font-weight:bold">Statut</td><td style="padding:6px 14px;color:${info.color};font-weight:bold">${info.label}</td></tr>
      </table>
      <p><a href="${claimsUrl}" style="background:#1B2D6B;color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none;display:inline-block">Voir mes réclamations</a></p>
      <p style="color:#666;font-size:13px">e-Boutique La Poste Tunisienne</p>
    </div>`;
}

module.exports = {
  sendMail,
  sendMailAsync,
  randomToken,
  randomOtp,
  verifyEmailTemplate,
  resetPasswordTemplate,
  otpTemplate,
  orderStatusTemplate,
  claimStatusTemplate,
  invoiceEmailTemplate,
  mode,
};
