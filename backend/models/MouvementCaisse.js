const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MouvementCaisse = sequelize.define('MouvementCaisse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_caisse_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sessions_caisse',
        key: 'id'
      }
    },
    type_mouvement: {
      type: DataTypes.ENUM('entree', 'sortie'),
      allowNull: false
    },
    categorie: {
      type: DataTypes.ENUM(
        'cotisation',
        'location',
        'retard',
        'amende',
        'vente',
        'don',
        'caution',
        'remboursement_caution',
        'remise_banque',
        'approvisionnement',
        'retrait',
        'autre'
      ),
      allowNull: false,
      defaultValue: 'autre'
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    mode_paiement: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'especes',
      comment: 'especes, cheque, cb, virement, etc.'
    },
    // Références optionnelles vers les opérations sources
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cotisations',
        key: 'id'
      }
    },
    emprunt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emprunts',
        key: 'id'
      }
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur concerne par le mouvement (adherent)'
    },
    operateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur qui a saisi le mouvement (benevole/admin)'
    },
    reference: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numero de cheque, reference transaction CB, etc.'
    },
    libelle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Description du mouvement'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_mouvement: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Lien avec la comptabilite
    ecriture_comptable_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ecritures_comptables',
        key: 'id'
      }
    },
    // Pour les remises en banque
    remise_banque_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference vers une remise en banque groupee'
    },
    statut: {
      type: DataTypes.ENUM('valide', 'annule'),
      allowNull: false,
      defaultValue: 'valide'
    }
  }, {
    tableName: 'mouvements_caisse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Méthodes statiques
  MouvementCaisse.getBySession = async function(sessionId, options = {}) {
    const { limit = 100, offset = 0 } = options;
    return await this.findAll({
      where: { session_caisse_id: sessionId, statut: 'valide' },
      include: [
        { model: sequelize.models.Utilisateur, as: 'utilisateur' },
        { model: sequelize.models.Utilisateur, as: 'operateur' },
        { model: sequelize.models.Cotisation, as: 'cotisation' },
        { model: sequelize.models.Emprunt, as: 'emprunt' }
      ],
      order: [['date_mouvement', 'DESC']],
      limit,
      offset
    });
  };

  MouvementCaisse.getTotalsBySession = async function(sessionId) {
    const mouvements = await this.findAll({
      where: { session_caisse_id: sessionId, statut: 'valide' },
      attributes: ['type_mouvement', 'mode_paiement', 'montant']
    });

    const totaux = {
      entrees: 0,
      sorties: 0,
      par_mode_paiement: {}
    };

    mouvements.forEach(m => {
      const montant = parseFloat(m.montant);
      if (m.type_mouvement === 'entree') {
        totaux.entrees += montant;
      } else {
        totaux.sorties += montant;
      }

      if (!totaux.par_mode_paiement[m.mode_paiement]) {
        totaux.par_mode_paiement[m.mode_paiement] = { entrees: 0, sorties: 0 };
      }
      if (m.type_mouvement === 'entree') {
        totaux.par_mode_paiement[m.mode_paiement].entrees += montant;
      } else {
        totaux.par_mode_paiement[m.mode_paiement].sorties += montant;
      }
    });

    return totaux;
  };

  return MouvementCaisse;
};
