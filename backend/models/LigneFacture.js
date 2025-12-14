const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LigneFacture = sequelize.define('LigneFacture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    facture_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'factures',
        key: 'id'
      }
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Description
    reference: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Référence article/prestation'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    // Quantité et prix
    quantite: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 1
    },
    unite: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'unité',
      comment: 'unité, heure, jour, mois, etc.'
    },
    prix_unitaire_ht: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    // Remise
    remise_pourcent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    remise_montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // TVA
    taux_tva: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Taux en pourcentage (ex: 20.00 pour 20%)'
    },
    // Montants calculés
    montant_ht: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '(quantite * prix_unitaire_ht) - remise_montant'
    },
    montant_tva: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_ttc: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    // Comptabilité
    compte_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte de produit associé'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      }
    },
    // Référence optionnelle
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cotisations',
        key: 'id'
      },
      comment: 'Si ligne issue d\'une cotisation'
    }
  }, {
    tableName: 'lignes_facture',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (ligne) => {
        // Calcul automatique des montants
        const quantite = parseFloat(ligne.quantite) || 1;
        const prixUnitaire = parseFloat(ligne.prix_unitaire_ht) || 0;
        const remisePourcent = parseFloat(ligne.remise_pourcent) || 0;
        const tauxTVA = parseFloat(ligne.taux_tva) || 0;

        // Montant brut HT
        let montantBrutHT = quantite * prixUnitaire;

        // Calcul de la remise
        let remiseMontant = 0;
        if (remisePourcent > 0) {
          remiseMontant = montantBrutHT * (remisePourcent / 100);
        }
        ligne.remise_montant = remiseMontant;

        // Montant HT après remise
        const montantHT = montantBrutHT - remiseMontant;
        ligne.montant_ht = montantHT;

        // TVA
        const montantTVA = montantHT * (tauxTVA / 100);
        ligne.montant_tva = montantTVA;

        // TTC
        ligne.montant_ttc = montantHT + montantTVA;
      }
    }
  });

  return LigneFacture;
};
