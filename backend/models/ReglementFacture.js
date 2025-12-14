const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReglementFacture = sequelize.define('ReglementFacture', {
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
    date_reglement: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    mode_paiement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'modes_paiement',
        key: 'id'
      }
    },
    mode_paiement_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'especes',
      comment: 'Code du mode de paiement (especes, cb, cheque, virement)'
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Numéro de chèque, référence CB, etc.'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Lien avec la caisse
    mouvement_caisse_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'mouvements_caisse',
        key: 'id'
      },
      comment: 'Mouvement de caisse associé'
    },
    // Lien avec le compte bancaire (pour virements/prélèvements)
    compte_bancaire_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comptes_bancaires',
        key: 'id'
      }
    },
    // Traçabilité
    enregistre_par_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    // Statut
    statut: {
      type: DataTypes.ENUM('valide', 'annule'),
      allowNull: false,
      defaultValue: 'valide'
    },
    date_annulation: {
      type: DataTypes.DATE,
      allowNull: true
    },
    motif_annulation: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'reglements_facture',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Après création d'un règlement, mettre à jour le montant réglé de la facture
  ReglementFacture.addHook('afterCreate', async (reglement, options) => {
    const Facture = sequelize.models.Facture;
    const facture = await Facture.findByPk(reglement.facture_id);
    if (facture) {
      const nouveauMontantRegle = parseFloat(facture.montant_regle) + parseFloat(reglement.montant);
      await facture.update({ montant_regle: nouveauMontantRegle }, { transaction: options.transaction });
      await facture.mettreAJourStatut();
    }
  });

  // Méthodes statiques
  ReglementFacture.getTotalByFacture = async function(factureId) {
    const result = await this.sum('montant', {
      where: { facture_id: factureId, statut: 'valide' }
    });
    return result || 0;
  };

  /**
   * Annule un règlement
   */
  ReglementFacture.prototype.annuler = async function(motif) {
    if (this.statut === 'annule') {
      throw new Error('Ce règlement est déjà annulé');
    }

    const Facture = sequelize.models.Facture;

    // Mettre à jour le règlement
    await this.update({
      statut: 'annule',
      date_annulation: new Date(),
      motif_annulation: motif
    });

    // Mettre à jour le montant réglé de la facture
    const facture = await Facture.findByPk(this.facture_id);
    if (facture) {
      const nouveauMontantRegle = parseFloat(facture.montant_regle) - parseFloat(this.montant);
      await facture.update({ montant_regle: Math.max(0, nouveauMontantRegle) });
      await facture.mettreAJourStatut();
    }

    return this;
  };

  return ReglementFacture;
};
