const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const bwipjs = require('bwip-js');

/**
 * Service de génération de documents PDF
 */
class PDFService {
  constructor() {
    // Créer le dossier uploads/recus s'il n'existe pas
    this.recusDir = path.join(__dirname, '../../uploads/recus');
    this.ensureDirectoryExists();
  }

  /**
   * Assure que le dossier de destination existe
   */
  ensureDirectoryExists() {
    const uploadsDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!fs.existsSync(this.recusDir)) {
      fs.mkdirSync(this.recusDir, { recursive: true });
    }
  }

  /**
   * Formate une date au format français
   * @param {Date|string} date - Date à formater
   * @returns {string} - Date formatée (jj/mm/aaaa)
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formate un montant en euros
   * @param {number} montant - Montant à formater
   * @returns {string} - Montant formaté (ex: 25,00 €)
   */
  formatMontant(montant) {
    return `${parseFloat(montant).toFixed(2).replace('.', ',')} €`;
  }

  /**
   * Formate le mode de paiement pour affichage
   * @param {string} mode - Mode de paiement
   * @returns {string} - Mode formaté
   */
  formatModePaiement(mode) {
    const modes = {
      'especes': 'Espèces',
      'cheque': 'Chèque',
      'carte_bancaire': 'Carte bancaire',
      'virement': 'Virement',
      'prelevement': 'Prélèvement',
      'autre': 'Autre'
    };
    return modes[mode] || mode;
  }

  /**
   * Génère un reçu de cotisation au format PDF
   * @param {Object} cotisation - Objet cotisation avec relations (adherent, tarif)
   * @param {Object} structure - Paramètres de la structure
   * @returns {Promise<{filepath: string, filename: string}>}
   */
  async genererRecuCotisation(cotisation, structure) {
    return new Promise((resolve, reject) => {
      try {
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const filename = `recu_cotisation_${cotisation.id}_${timestamp}.pdf`;
        const filepath = path.join(this.recusDir, filename);

        // Créer le document PDF
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        // Créer le flux d'écriture
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Variables pour le positionnement
        let yPos = 50;

        // ===== EN-TÊTE =====
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(structure.nom_structure || 'Ludothèque', 50, yPos);

        yPos += 25;
        doc.fontSize(10)
           .font('Helvetica');

        if (structure.adresse) {
          doc.text(structure.adresse, 50, yPos);
          yPos += 15;
        }

        if (structure.code_postal && structure.ville) {
          doc.text(`${structure.code_postal} ${structure.ville}`, 50, yPos);
          yPos += 15;
        }

        if (structure.siret) {
          doc.text(`SIRET: ${structure.siret}`, 50, yPos);
          yPos += 15;
        }

        if (structure.telephone) {
          doc.text(`Tél: ${structure.telephone}`, 50, yPos);
          yPos += 15;
        }

        if (structure.email) {
          doc.text(`Email: ${structure.email}`, 50, yPos);
          yPos += 15;
        }

        // Ligne de séparation
        yPos += 10;
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 30;

        // ===== TITRE =====
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('REÇU DE COTISATION', 50, yPos, { align: 'center' });

        yPos += 20;

        if (cotisation.numero_piece_comptable) {
          doc.fontSize(10)
             .font('Helvetica')
             .text(`N° pièce: ${cotisation.numero_piece_comptable}`, 50, yPos, { align: 'center' });
          yPos += 15;
        }

        yPos += 20;

        // ===== INFORMATIONS ADHÉRENT =====
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Adhérent:', 50, yPos);

        yPos += 20;
        doc.fontSize(10)
           .font('Helvetica');

        if (cotisation.adherent) {
          const adherent = cotisation.adherent;
          doc.text(`${adherent.prenom} ${adherent.nom}`, 70, yPos);
          yPos += 15;

          if (adherent.code_barre) {
            doc.text(`Code adhérent: ${adherent.code_barre}`, 70, yPos);
            yPos += 15;
          }

          if (adherent.adresse) {
            doc.text(adherent.adresse, 70, yPos);
            yPos += 15;
          }

          if (adherent.code_postal && adherent.ville) {
            doc.text(`${adherent.code_postal} ${adherent.ville}`, 70, yPos);
            yPos += 15;
          }
        }

        yPos += 20;

        // ===== DÉTAILS DE LA COTISATION =====
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Détails de la cotisation:', 50, yPos);

        yPos += 20;
        doc.fontSize(10)
           .font('Helvetica');

        doc.text(`Date de paiement: ${this.formatDate(cotisation.date_paiement)}`, 70, yPos);
        yPos += 15;

        doc.text(`Période: du ${this.formatDate(cotisation.periode_debut)} au ${this.formatDate(cotisation.periode_fin)}`, 70, yPos);
        yPos += 15;

        if (cotisation.tarif) {
          doc.text(`Type de tarif: ${cotisation.tarif.libelle}`, 70, yPos);
          yPos += 15;
        }

        yPos += 20;

        // ===== TABLEAU DES MONTANTS =====
        const tableTop = yPos;
        const col1 = 70;   // Désignation
        const col2 = 320;  // Montant de base
        const col3 = 420;  // Réduction
        const col4 = 490;  // Total

        // En-tête du tableau
        doc.fontSize(10)
           .font('Helvetica-Bold');

        doc.text('Désignation', col1, tableTop);
        doc.text('Montant', col2, tableTop, { width: 90, align: 'right' });
        doc.text('Réduction', col3, tableTop, { width: 60, align: 'right' });
        doc.text('Total', col4, tableTop, { width: 55, align: 'right' });

        yPos = tableTop + 15;

        // Ligne de séparation
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 10;

        // Contenu du tableau
        doc.font('Helvetica');

        const designation = cotisation.tarif ? cotisation.tarif.libelle : 'Cotisation';
        doc.text(designation, col1, yPos, { width: 240 });
        doc.text(this.formatMontant(cotisation.montant_base), col2, yPos, { width: 90, align: 'right' });
        doc.text(this.formatMontant(cotisation.reduction_appliquee), col3, yPos, { width: 60, align: 'right' });
        doc.text(this.formatMontant(cotisation.montant_paye), col4, yPos, { width: 55, align: 'right' });

        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 10;

        // Total à payer
        doc.fontSize(12)
           .font('Helvetica-Bold');
        doc.text('Total payé:', col3, yPos, { width: 60, align: 'right' });
        doc.text(this.formatMontant(cotisation.montant_paye), col4, yPos, { width: 55, align: 'right' });

        yPos += 30;

        // ===== MODE DE RÈGLEMENT =====
        doc.fontSize(10)
           .font('Helvetica-Bold');
        doc.text('Mode de règlement:', 50, yPos);
        yPos += 15;

        doc.font('Helvetica');
        doc.text(this.formatModePaiement(cotisation.mode_paiement), 70, yPos);
        yPos += 15;

        if (cotisation.reference_paiement) {
          doc.text(`Référence: ${cotisation.reference_paiement}`, 70, yPos);
          yPos += 15;
        }

        yPos += 20;

        // ===== MENTIONS LÉGALES =====
        if (structure.mentions_legales) {
          doc.fontSize(8)
             .font('Helvetica')
             .text(structure.mentions_legales, 50, yPos, { width: 495, align: 'left' });
          yPos += 30;
        }

        // TVA non applicable
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .text('TVA non applicable - Article 293 B du CGI', 50, yPos, { align: 'center' });

        yPos += 20;

        // ===== PIED DE PAGE =====
        const footerY = 750;
        doc.fontSize(8)
           .font('Helvetica')
           .text(`Document généré le ${this.formatDate(new Date())}`, 50, footerY, { align: 'center' });

        // Finaliser le PDF
        doc.end();

        // Attendre que le flux soit terminé
        stream.on('finish', () => {
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère une facture au format PDF
   * @param {Object} facture - Objet facture avec relations (lignes, reglements, client)
   * @param {Object} structure - Paramètres de la structure
   * @returns {Promise<Buffer>} - Buffer du PDF
   */
  async genererFacturePDF(facture, structure) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let yPos = 40;
        const pageWidth = 595.28;
        const leftMargin = 50;
        const rightMargin = 545;

        // Déterminer le type de document
        const isAvoir = facture.type_document === 'avoir';
        const isProforma = facture.type_document === 'proforma';
        const titlePrefix = isAvoir ? 'AVOIR' : (isProforma ? 'FACTURE PROFORMA' : 'FACTURE');

        // ===== EN-TÊTE ÉMETTEUR (gauche) =====
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(structure.nom_structure || 'Ludothèque', leftMargin, yPos);

        yPos += 22;
        doc.fontSize(9).font('Helvetica');

        if (structure.adresse) {
          doc.text(structure.adresse, leftMargin, yPos);
          yPos += 12;
        }

        if (structure.code_postal && structure.ville) {
          doc.text(`${structure.code_postal} ${structure.ville}`, leftMargin, yPos);
          yPos += 12;
        }

        if (structure.siret) {
          doc.text(`SIRET: ${structure.siret}`, leftMargin, yPos);
          yPos += 12;
        }

        if (structure.telephone) {
          doc.text(`Tél: ${structure.telephone}`, leftMargin, yPos);
          yPos += 12;
        }

        if (structure.email) {
          doc.text(`Email: ${structure.email}`, leftMargin, yPos);
          yPos += 12;
        }

        // ===== CLIENT (droite) =====
        let clientY = 40;
        const clientX = 350;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(isAvoir ? '#dc3545' : '#333333')
           .text(titlePrefix, clientX, clientY, { width: 195, align: 'right' });

        clientY += 16;
        doc.fontSize(12)
           .text(`N° ${facture.numero}`, clientX, clientY, { width: 195, align: 'right' });

        clientY += 18;
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#333333')
           .text(`Date: ${this.formatDate(facture.date_emission || facture.created_at)}`, clientX, clientY, { width: 195, align: 'right' });

        if (facture.date_echeance && !isAvoir) {
          clientY += 12;
          doc.text(`Échéance: ${this.formatDate(facture.date_echeance)}`, clientX, clientY, { width: 195, align: 'right' });
        }

        clientY += 25;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Client:', clientX, clientY);

        clientY += 14;
        doc.fontSize(9).font('Helvetica');
        doc.text(facture.client_nom || '', clientX, clientY);
        clientY += 12;

        if (facture.client_adresse) {
          doc.text(facture.client_adresse, clientX, clientY);
          clientY += 12;
        }

        if (facture.client_code_postal && facture.client_ville) {
          doc.text(`${facture.client_code_postal} ${facture.client_ville}`, clientX, clientY);
          clientY += 12;
        }

        if (facture.client_email) {
          doc.text(facture.client_email, clientX, clientY);
        }

        // Référence avoir
        if (isAvoir && facture.factureOrigine) {
          clientY += 16;
          doc.fontSize(9)
             .font('Helvetica-Oblique')
             .fillColor('#666666')
             .text(`Réf. facture: ${facture.factureOrigine.numero}`, clientX, clientY);
          doc.fillColor('#333333');
        }

        // ===== LIGNE DE SÉPARATION =====
        yPos = Math.max(yPos, clientY) + 25;
        doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke('#CCCCCC');
        yPos += 20;

        // ===== TABLEAU DES LIGNES =====
        const col1 = leftMargin;       // Description
        const col2 = 280;              // Qté
        const col3 = 330;              // P.U. HT
        const col4 = 400;              // TVA
        const col5 = 450;              // Remise
        const col6 = 495;              // Total TTC

        // En-tête du tableau
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF');

        // Fond de l'en-tête
        doc.rect(leftMargin, yPos - 3, rightMargin - leftMargin, 18).fill('#4a5568');

        doc.fillColor('#FFFFFF')
           .text('Description', col1 + 5, yPos, { width: 220 })
           .text('Qté', col2, yPos, { width: 45, align: 'right' })
           .text('P.U. HT', col3, yPos, { width: 60, align: 'right' })
           .text('TVA', col4, yPos, { width: 45, align: 'right' })
           .text('Rem.', col5, yPos, { width: 35, align: 'right' })
           .text('Total TTC', col6, yPos, { width: 50, align: 'right' });

        yPos += 20;
        doc.fillColor('#333333');

        // Lignes de la facture
        const lignes = facture.lignes || [];
        lignes.forEach((ligne, index) => {
          const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
          doc.rect(leftMargin, yPos - 3, rightMargin - leftMargin, 18).fill(bgColor);

          doc.fontSize(8).font('Helvetica');
          doc.fillColor('#333333')
             .text(ligne.description || '', col1 + 5, yPos, { width: 220 })
             .text(parseFloat(ligne.quantite).toFixed(2), col2, yPos, { width: 45, align: 'right' })
             .text(this.formatMontant(ligne.prix_unitaire_ht).replace(' €', ''), col3, yPos, { width: 60, align: 'right' })
             .text(`${parseFloat(ligne.taux_tva).toFixed(1)}%`, col4, yPos, { width: 45, align: 'right' })
             .text(parseFloat(ligne.remise_pourcent) > 0 ? `${parseFloat(ligne.remise_pourcent).toFixed(0)}%` : '-', col5, yPos, { width: 35, align: 'right' })
             .text(this.formatMontant(ligne.montant_ttc).replace(' €', ''), col6, yPos, { width: 50, align: 'right' });

          yPos += 18;
        });

        // Ligne de séparation
        yPos += 5;
        doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke('#CCCCCC');
        yPos += 15;

        // ===== TOTAUX =====
        const totauxX = 380;
        const totauxWidth = rightMargin - totauxX;

        doc.fontSize(9).font('Helvetica');
        doc.text('Total HT:', totauxX, yPos, { width: 80 });
        doc.text(this.formatMontant(facture.montant_ht), totauxX + 80, yPos, { width: totauxWidth - 80, align: 'right' });
        yPos += 14;

        doc.text('Total TVA:', totauxX, yPos, { width: 80 });
        doc.text(this.formatMontant(facture.montant_tva), totauxX + 80, yPos, { width: totauxWidth - 80, align: 'right' });
        yPos += 14;

        // Ligne de séparation totaux
        doc.moveTo(totauxX, yPos).lineTo(rightMargin, yPos).stroke('#333333');
        yPos += 8;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Total TTC:', totauxX, yPos, { width: 80 });
        doc.text(this.formatMontant(facture.montant_ttc), totauxX + 80, yPos, { width: totauxWidth - 80, align: 'right' });
        yPos += 20;

        // Montant réglé et reste à payer (si applicable)
        if (!isAvoir && parseFloat(facture.montant_regle) > 0) {
          doc.fontSize(9).font('Helvetica');
          doc.text('Déjà réglé:', totauxX, yPos, { width: 80 });
          doc.text(this.formatMontant(facture.montant_regle), totauxX + 80, yPos, { width: totauxWidth - 80, align: 'right' });
          yPos += 14;

          const resteAPayer = parseFloat(facture.montant_ttc) - parseFloat(facture.montant_regle);
          if (resteAPayer > 0.01) {
            doc.font('Helvetica-Bold')
               .fillColor('#dc3545')
               .text('Reste à payer:', totauxX, yPos, { width: 80 })
               .text(this.formatMontant(resteAPayer), totauxX + 80, yPos, { width: totauxWidth - 80, align: 'right' });
            doc.fillColor('#333333');
          }
          yPos += 20;
        }

        // ===== RÈGLEMENTS =====
        const reglements = (facture.reglements || []).filter(r => !r.annule);
        if (reglements.length > 0) {
          yPos += 10;
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('Règlements:', leftMargin, yPos);
          yPos += 15;

          doc.fontSize(8).font('Helvetica');
          reglements.forEach(reg => {
            doc.text(`• ${this.formatDate(reg.date_reglement)} - ${this.formatModePaiement(reg.mode_paiement)} - ${this.formatMontant(reg.montant)}`, leftMargin + 10, yPos);
            if (reg.reference) {
              doc.text(`  (Réf: ${reg.reference})`, leftMargin + 300, yPos);
            }
            yPos += 12;
          });
        }

        // ===== STATUT =====
        yPos += 15;
        const statutLabels = {
          'brouillon': 'BROUILLON',
          'emise': 'ÉMISE',
          'partiellement_reglee': 'PARTIELLEMENT RÉGLÉE',
          'reglee': 'RÉGLÉE',
          'annulee': 'ANNULÉE'
        };
        const statutColors = {
          'brouillon': '#6c757d',
          'emise': '#0d6efd',
          'partiellement_reglee': '#fd7e14',
          'reglee': '#198754',
          'annulee': '#dc3545'
        };

        if (facture.statut === 'annulee') {
          doc.save();
          doc.rotate(-30, { origin: [pageWidth / 2, 400] });
          doc.fontSize(60)
             .font('Helvetica-Bold')
             .fillColor('#dc354533')
             .text('ANNULÉE', 100, 400);
          doc.restore();
        }

        // ===== CONDITIONS DE PAIEMENT =====
        yPos += 10;
        if (facture.conditions_paiement) {
          doc.fontSize(8)
             .font('Helvetica')
             .text(`Conditions: ${facture.conditions_paiement}`, leftMargin, yPos);
          yPos += 12;
        }

        // ===== MENTIONS LÉGALES =====
        const footerY = 750;
        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#666666');

        if (structure.mentions_legales_facture) {
          doc.text(structure.mentions_legales_facture, leftMargin, footerY, { width: rightMargin - leftMargin, align: 'center' });
        } else if (structure.mentions_legales) {
          doc.text(structure.mentions_legales, leftMargin, footerY, { width: rightMargin - leftMargin, align: 'center' });
        }

        // TVA
        doc.fontSize(7)
           .font('Helvetica-Oblique')
           .text('TVA non applicable - Article 293 B du CGI', leftMargin, footerY + 20, { align: 'center', width: rightMargin - leftMargin });

        // Date de génération
        doc.text(`Document généré le ${this.formatDate(new Date())}`, leftMargin, footerY + 35, { align: 'center', width: rightMargin - leftMargin });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère et sauvegarde une facture PDF dans un fichier
   * @param {Object} facture - Objet facture
   * @param {Object} structure - Paramètres de la structure
   * @returns {Promise<{filepath: string, filename: string}>}
   */
  async genererFactureFichier(facture, structure) {
    const facturesDir = path.join(__dirname, '../../uploads/factures');
    if (!fs.existsSync(facturesDir)) {
      fs.mkdirSync(facturesDir, { recursive: true });
    }

    const timestamp = Date.now();
    const typePrefix = facture.type_document === 'avoir' ? 'avoir' : 'facture';
    const filename = `${typePrefix}_${facture.numero.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    const filepath = path.join(facturesDir, filename);

    const pdfBuffer = await this.genererFacturePDF(facture, structure);
    fs.writeFileSync(filepath, pdfBuffer);

    return { filepath, filename };
  }

  /**
   * Génère un PNG du code-barre
   * @param {string} codeBarre - Code-barre à générer
   * @returns {Promise<Buffer>} - Image PNG du code-barre
   */
  async generateBarcodeImage(codeBarre) {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer({
        bcid: 'code128',
        text: codeBarre,
        scale: 3,
        height: 10,
        includetext: false
      }, (err, png) => {
        if (err) {
          reject(err);
        } else {
          resolve(png);
        }
      });
    });
  }

  /**
   * Génère un PDF d'étiquettes codes-barres pour un lot
   * Format: A4 avec 10 étiquettes (2 colonnes x 5 lignes)
   * @param {Object} lot - Objet lot avec ses codes
   * @returns {Promise<Buffer>} - Buffer du PDF
   */
  async generateBarcodeLabels(lot) {
    return new Promise(async (resolve, reject) => {
      try {
        // Récupérer le nom de la structure
        const { ParametresStructure } = require('../models');
        let structureName = 'Ludothèque';
        try {
          const params = await ParametresStructure.findOne();
          if (params?.nom_structure) {
            structureName = params.nom_structure;
          }
        } catch (e) {
          // Utiliser le nom par défaut
        }

        // Configuration de la page A4
        const pageWidth = 595.28;   // A4 width in points
        const pageHeight = 841.89;  // A4 height in points
        const margin = 30;

        // Configuration des étiquettes (2 colonnes x 5 lignes = 10 par page)
        const cols = 2;
        const rows = 5;
        const labelsPerPage = cols * rows;

        // Calculer les dimensions des étiquettes
        const labelWidth = (pageWidth - margin * 2 - 20) / cols;  // 20 = espace entre colonnes
        const labelHeight = (pageHeight - margin * 2 - 40) / rows; // 40 = espaces entre lignes

        // Créer le document PDF
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: margin, bottom: margin, left: margin, right: margin }
        });

        // Buffer pour stocker le PDF
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Informations du module (pour l'en-tête de page uniquement)
        const moduleLabels = {
          utilisateur: 'Usagers',
          jeu: 'Jeux',
          livre: 'Livres',
          film: 'Films',
          disque: 'Disques'
        };
        const moduleLabel = moduleLabels[lot.module] || lot.module;

        // Couleurs par module pour le bandeau
        const moduleColors = {
          utilisateur: '#0d6efd',  // Bleu
          jeu: '#6f42c1',          // Violet
          livre: '#20c997',        // Turquoise
          film: '#fd7e14',         // Orange
          disque: '#e83e8c'        // Rose
        };
        const moduleColor = moduleColors[lot.module] || '#6c757d';

        // Filtrer les codes à imprimer (seulement les reserves)
        const codesToPrint = lot.codes.filter(c => c.statut === 'reserve');

        // Générer les étiquettes
        let currentIndex = 0;
        let pageNum = 0;
        const totalPages = Math.ceil(codesToPrint.length / labelsPerPage);

        while (currentIndex < codesToPrint.length) {
          // Ajouter une nouvelle page (sauf pour la première)
          if (pageNum > 0) {
            doc.addPage();
          }
          pageNum++;

          // En-tête de page
          const headerLeft = `${structureName} - ${moduleLabel} - Lot #${lot.id}`;
          const headerRight = `Page ${pageNum}/${totalPages} - ${codesToPrint.length} étiquettes - ${this.formatDate(new Date())}`;

          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#666666')
             .text(headerLeft, margin, margin - 15)
             .text(headerRight, margin, margin - 15, { align: 'right', width: pageWidth - margin * 2 });

          // Générer les étiquettes de cette page
          for (let row = 0; row < rows && currentIndex < codesToPrint.length; row++) {
            for (let col = 0; col < cols && currentIndex < codesToPrint.length; col++) {
              const code = codesToPrint[currentIndex];
              const x = margin + col * (labelWidth + 10);
              const y = margin + row * (labelHeight + 8);

              await this.drawLabel(doc, code.code_barre, structureName, moduleColor, x, y, labelWidth, labelHeight);

              currentIndex++;
            }
          }
        }

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Dessine une étiquette de code-barre
   * @param {PDFDocument} doc - Document PDF
   * @param {string} codeBarre - Code-barre
   * @param {string} structureName - Nom de la structure
   * @param {string} accentColor - Couleur d'accent pour le bandeau
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   */
  async drawLabel(doc, codeBarre, structureName, accentColor, x, y, width, height) {
    const padding = 10;
    const headerHeight = 22;

    // Fond blanc avec ombre légère (simulée par un rectangle gris décalé)
    doc.save();
    doc.rect(x + 2, y + 2, width, height)
       .fill('#E8E8E8');
    doc.restore();

    // Fond blanc principal
    doc.save();
    doc.roundedRect(x, y, width, height, 6)
       .fill('#FFFFFF');
    doc.restore();

    // Cadre de l'étiquette
    doc.roundedRect(x, y, width, height, 6)
       .stroke('#DDDDDD');

    // Bandeau coloré en haut
    doc.save();
    doc.roundedRect(x, y, width, headerHeight, 6)
       .clip();
    doc.rect(x, y, width, headerHeight)
       .fill(accentColor);
    doc.restore();

    // Nom de la structure dans le bandeau (blanc)
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#FFFFFF')
       .text(structureName, x + padding, y + 6, {
         width: width - padding * 2,
         align: 'center'
       });

    // Générer l'image du code-barre
    try {
      const barcodeImage = await this.generateBarcodeImage(codeBarre);

      // Position du code-barre (centré horizontalement)
      const barcodeWidth = width - padding * 2 - 10;
      const barcodeHeight = 45;
      const barcodeX = x + (width - barcodeWidth) / 2;
      const barcodeY = y + headerHeight + 12;

      doc.image(barcodeImage, barcodeX, barcodeY, {
        width: barcodeWidth,
        height: barcodeHeight
      });

      // Texte du code-barre en dessous (monospace style)
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text(codeBarre, x + padding, barcodeY + barcodeHeight + 8, {
           width: width - padding * 2,
           align: 'center',
           characterSpacing: 1
         });

    } catch (err) {
      // Si erreur de génération du code-barre, afficher juste le texte
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text(codeBarre, x + padding, y + height / 2, {
           width: width - padding * 2,
           align: 'center'
         });
    }
  }

  /**
   * Génère un PDF d'étiquettes codes-barres personnalisées
   * @param {Array} codes - Liste des codes à imprimer
   * @param {Object} options - Options (module, format, etc.)
   * @returns {Promise<Buffer>} - Buffer du PDF
   */
  async generateCustomBarcodeLabels(codes, options = {}) {
    const {
      module = 'article',
      format = 'A4_10',  // A4_10 = 10 étiquettes par page
      includeDate = true
    } = options;

    // Construire un lot virtuel
    const virtualLot = {
      id: 'custom',
      module,
      codes: codes.map(c => ({
        code_barre: typeof c === 'string' ? c : c.code_barre,
        statut: 'reserve'
      }))
    };

    return this.generateBarcodeLabels(virtualLot);
  }
}

// Export singleton
module.exports = new PDFService();
