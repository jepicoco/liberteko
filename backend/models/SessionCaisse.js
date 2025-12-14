const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SessionCaisse = sequelize.define('SessionCaisse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    caisse_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'caisses',
        key: 'id'
      }
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur qui a ouvert la session'
    },
    date_ouverture: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_cloture: {
      type: DataTypes.DATE,
      allowNull: true
    },
    utilisateur_cloture_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur qui a cloture la session'
    },
    solde_ouverture: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Solde au moment de l\'ouverture'
    },
    solde_cloture_theorique: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Solde calcule automatiquement'
    },
    solde_cloture_reel: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Solde compte par l\'utilisateur'
    },
    ecart: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Difference entre theorique et reel'
    },
    // Statistiques de la session
    nb_mouvements: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_entrees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_sorties: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Detail du comptage par mode de paiement (JSON)
    detail_comptage: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Comptage detaille: {"especes": 150.00, "cheques": 200.00, ...}'
    },
    commentaire_ouverture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    commentaire_cloture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('ouverte', 'cloturee', 'annulee'),
      allowNull: false,
      defaultValue: 'ouverte'
    }
  }, {
    tableName: 'sessions_caisse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  SessionCaisse.getOuverte = async function(caisseId) {
    return await this.findOne({
      where: {
        caisse_id: caisseId,
        statut: 'ouverte'
      },
      include: [
        { model: sequelize.models.Utilisateur, as: 'utilisateur' },
        { model: sequelize.models.Caisse, as: 'caisse' }
      ]
    });
  };

  SessionCaisse.getHistorique = async function(caisseId, options = {}) {
    const { limit = 30, offset = 0 } = options;
    return await this.findAll({
      where: { caisse_id: caisseId },
      include: [
        { model: sequelize.models.Utilisateur, as: 'utilisateur' },
        { model: sequelize.models.Utilisateur, as: 'utilisateurCloture' }
      ],
      order: [['date_ouverture', 'DESC']],
      limit,
      offset
    });
  };

  /**
   * Calcule le solde theorique
   */
  SessionCaisse.prototype.calculerSoldeTheorique = async function() {
    const MouvementCaisse = sequelize.models.MouvementCaisse;
    const mouvements = await MouvementCaisse.findAll({
      where: { session_caisse_id: this.id }
    });

    let totalEntrees = 0;
    let totalSorties = 0;

    mouvements.forEach(m => {
      if (m.type_mouvement === 'entree') {
        totalEntrees += parseFloat(m.montant);
      } else if (m.type_mouvement === 'sortie') {
        totalSorties += parseFloat(m.montant);
      }
    });

    return parseFloat(this.solde_ouverture) + totalEntrees - totalSorties;
  };

  /**
   * Met a jour les statistiques de la session
   */
  SessionCaisse.prototype.mettreAJourStats = async function() {
    const MouvementCaisse = sequelize.models.MouvementCaisse;
    const mouvements = await MouvementCaisse.findAll({
      where: { session_caisse_id: this.id }
    });

    let totalEntrees = 0;
    let totalSorties = 0;

    mouvements.forEach(m => {
      if (m.type_mouvement === 'entree') {
        totalEntrees += parseFloat(m.montant);
      } else if (m.type_mouvement === 'sortie') {
        totalSorties += parseFloat(m.montant);
      }
    });

    await this.update({
      nb_mouvements: mouvements.length,
      total_entrees: totalEntrees,
      total_sorties: totalSorties
    });
  };

  return SessionCaisse;
};
