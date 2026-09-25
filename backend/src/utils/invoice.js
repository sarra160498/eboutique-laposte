const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Facture en noir & blanc : uniquement des niveaux de gris (aucune couleur).
const INK = '#111111';    // texte principal (noir)
const GREY = '#555555';   // texte secondaire
const LIGHT = '#8a8a8a';  // mentions discrètes
const RULE = '#cccccc';   // filets
const HEADER = '#f2f2f2'; // fond d'en-tête de tableau

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-poste.png');

/** Formate un montant en dinars (3 décimales). */
function money(n) {
  return `${Number(n).toFixed(3)} DT`;
}

/**
 * Génère la facture PDF d'une commande payée en ligne et renvoie un Buffer.
 *
 * @param {object} data
 *   - reference, label, type ('order' | 'deposit'), amount, date
 *   - customerName, email, cin
 *   - lines: string[]
 */
function generateInvoicePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = 50;            // marge gauche
      const R = 545;           // marge droite
      const d = data.date ? new Date(data.date) : new Date();
      const dateStr = `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      // ── En-tête : logo officiel (gauche) + FACTURE (droite) ────────────────
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, L, 45, { width: 132 });
      }
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text('FACTURE', 340, 48, { width: R - 340, align: 'right' });
      doc.fillColor(GREY).font('Helvetica').fontSize(10)
        .text(`N° ${data.reference}`, 300, 80, { width: R - 300, align: 'right' })
        .text(`Date : ${dateStr}`, 300, 94, { width: R - 300, align: 'right' })
        .text('Statut : Payée', 300, 108, { width: R - 300, align: 'right' });

      doc.moveTo(L, 140).lineTo(R, 140).lineWidth(1).strokeColor(RULE).stroke();

      // ── Émetteur (gauche) / Facturé à (droite) ─────────────────────────────
      let yL = 158;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('ÉMETTEUR', L, yL, { characterSpacing: 0.5 });
      yL += 16;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text('La Poste Tunisienne', L, yL);
      yL += 15;
      doc.fillColor(GREY).font('Helvetica').fontSize(9.5)
        .text('e-Boutique — Service courrier & colis', L, yL)
        .text('Rue Hédi Nouira, 1030 Tunis', L, yL + 13)
        .text('Tunisie', L, yL + 26);

      let yR = 158;
      const cx = 320;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('FACTURÉ À', cx, yR, { characterSpacing: 0.5 });
      yR += 16;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(data.customerName || '', cx, yR, { width: R - cx });
      yR += 15;
      doc.fillColor(GREY).font('Helvetica').fontSize(9.5);
      if (data.email) { doc.text(data.email, cx, yR, { width: R - cx }); yR += 13; }
      if (data.cin) { doc.text(`CIN : ${data.cin}`, cx, yR, { width: R - cx }); }

      // ── Tableau des désignations ───────────────────────────────────────────
      let y = 252;
      const amountX = 410;
      doc.rect(L, y, R - L, 24).fillAndStroke(HEADER, RULE);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
        .text('Désignation', L + 12, y + 7)
        .text('Montant', amountX, y + 7, { width: R - amountX - 12, align: 'right' });
      y += 24;

      const mainLabel = data.label || (data.type === 'deposit' ? 'Dépôt de colis' : 'Commande boutique');
      const rowTop = y;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
        .text(mainLabel, L + 12, y + 9, { width: amountX - L - 24 });
      doc.font('Helvetica').text(money(data.amount), amountX, y + 9, { width: R - amountX - 12, align: 'right' });
      y = doc.y + 6;

      const lines = Array.isArray(data.lines) ? data.lines : [];
      for (const line of lines) {
        doc.fillColor(GREY).font('Helvetica').fontSize(9)
          .text(`•  ${line}`, L + 20, y, { width: amountX - L - 30 });
        y = doc.y + 4;
      }
      y += 6;
      doc.rect(L, rowTop, R - L, y - rowTop).lineWidth(1).strokeColor(RULE).stroke();

      // ── Totaux (TVA 19 %) ──────────────────────────────────────────────────
      const ttc = Number(data.amount);
      const ht = ttc / 1.19;
      const tva = ttc - ht;
      const totalsX = 300;
      let ty = y + 18;
      const totalLine = (label, value, strong = false) => {
        doc.fillColor(INK)
          .font(strong ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(strong ? 12 : 10)
          .text(label, totalsX, ty, { width: 130 })
          .text(value, amountX, ty, { width: R - amountX - 12, align: 'right' });
        ty += strong ? 22 : 16;
      };
      totalLine('Sous-total (HT)', money(ht));
      totalLine('TVA (19 %)', money(tva));
      doc.moveTo(totalsX, ty).lineTo(R, ty).lineWidth(1).strokeColor(RULE).stroke();
      ty += 8;
      totalLine('Total TTC', money(ttc), true);

      doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(9.5)
        .text('Réglé — Paiement en ligne (e-Dinar)', totalsX, ty, { width: R - totalsX, align: 'right' });

      // ── Pied de page ──────────────────────────────────────────────────────
      doc.moveTo(L, 770).lineTo(R, 770).lineWidth(1).strokeColor(RULE).stroke();
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(
        'La Poste Tunisienne — e-Boutique · Rue Hédi Nouira, 1030 Tunis, Tunisie',
        L, 778, { width: R - L, align: 'center' });
      doc.fillColor(LIGHT).fontSize(8).text(
        'Facture générée automatiquement. Merci de votre confiance.',
        L, 790, { width: R - L, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
