const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Facture = sequelize.define('Facture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Format: FAC-YYYY-NNNNNN ou AVO-YYYY-NNNNNN'
    },
    type_document: {
      type: DataTypes.ENUM('facture', 'avoir', 'proforma'),
      allowNull: false,
      defaultValue: 'facture'
    },
    // Client
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    // Informations client dénormalisées (pour archivage légal)
    client_nom: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    client_prenom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    client_adresse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    client_code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    client_ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    client_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Dates
    date_emission: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_echeance: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    // Montants
    montant_ht: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_tva: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_ttc: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_regle: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Statut
    statut: {
      type: DataTypes.ENUM('brouillon', 'emise', 'partiellement_reglee', 'reglee', 'annulee'),
      allowNull: false,
      defaultValue: 'brouillon'
    },
    // Références
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cotisations',
        key: 'id'
      },
      comment: 'Si la facture provient d\'une cotisation'
    },
    facture_avoir_reference_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'factures',
        key: 'id'
      },
      comment: 'Pour les avoirs: facture d\'origine'
    },
    // Métadonnées
    objet: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Objet/titre de la facture'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes'
    },
    conditions_paiement: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conditions de paiement'
    },
    mentions_legales: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Comptabilité
    exercice: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Exercice comptable'
    },
    ecriture_comptable_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ecritures_comptables',
        key: 'id'
      }
    },
    // Traçabilité
    cree_par_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    }
  }, {
    tableName: 'factures',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Méthodes statiques
  Facture.genererNumero = async function(type = 'facture') {
    const prefixe = type === 'avoir' ? 'AVO' : type === 'proforma' ? 'PRO' : 'FAC';
    const annee = new Date().getFullYear();
    const pattern = `${prefixe}-${annee}-%`;

    const derniere = await this.findOne({
      where: {
        numero: {
          [sequelize.Sequelize.Op.like]: pattern
        }
      },
      order: [['numero', 'DESC']]
    });

    let sequence = 1;
    if (derniere) {
      const parts = derniere.numero.split('-');
      sequence = parseInt(parts[2]) + 1;
    }

    return `${prefixe}-${annee}-${String(sequence).padStart(6, '0')}`;
  };

  /**
   * Calcule et met à jour les totaux de la facture
   */
  Facture.prototype.calculerTotaux = async function() {
    const LigneFacture = sequelize.models.LigneFacture;
    const lignes = await LigneFacture.findAll({
      where: { facture_id: this.id }
    });

    let montantHT = 0;
    let montantTVA = 0;
    let montantTTC = 0;

    lignes.forEach(ligne => {
      montantHT += parseFloat(ligne.montant_ht);
      montantTVA += parseFloat(ligne.montant_tva);
      montantTTC += parseFloat(ligne.montant_ttc);
    });

    await this.update({
      montant_ht: montantHT,
      montant_tva: montantTVA,
      montant_ttc: montantTTC
    });

    return { montantHT, montantTVA, montantTTC };
  };

  /**
   * Met à jour le statut en fonction du montant réglé
   */
  Facture.prototype.mettreAJourStatut = async function() {
    const montantRegle = parseFloat(this.montant_regle);
    const montantTTC = parseFloat(this.montant_ttc);

    let nouveauStatut = this.statut;

    if (this.statut !== 'brouillon' && this.statut !== 'annulee') {
      if (montantRegle >= montantTTC) {
        nouveauStatut = 'reglee';
      } else if (montantRegle > 0) {
        nouveauStatut = 'partiellement_reglee';
      } else {
        nouveauStatut = 'emise';
      }

      if (nouveauStatut !== this.statut) {
        await this.update({ statut: nouveauStatut });
      }
    }

    return nouveauStatut;
  };

  /**
   * Émet la facture (passe de brouillon à émise)
   */
  Facture.prototype.emettre = async function() {
    if (this.statut !== 'brouillon') {
      throw new Error('Seule une facture en brouillon peut être émise');
    }

    await this.update({
      statut: 'emise',
      date_emission: new Date()
    });

    return this;
  };

  /**
   * Annule la facture
   */
  Facture.prototype.annuler = async function() {
    if (this.statut === 'annulee') {
      throw new Error('Cette facture est déjà annulée');
    }

    if (parseFloat(this.montant_regle) > 0) {
      throw new Error('Impossible d\'annuler une facture avec des règlements. Créez un avoir.');
    }

    await this.update({ statut: 'annulee' });
    return this;
  };

  return Facture;
};
