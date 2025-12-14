const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompteEncaissementModePaiement = sequelize.define('CompteEncaissementModePaiement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mode_paiement_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modes_paiement',
        key: 'id'
      },
      comment: 'Mode de paiement'
    },
    compte_numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Numero du compte d encaissement (ex: 5121 pour cheque/CB, 5300 pour especes)'
    },
    compte_libelle: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Libelle du compte'
    },
    journal_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Journal specifique pour ce mode (si different du journal operation)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'comptes_encaissement_modes_paiement',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['mode_paiement_id']
      }
    ]
  });

  // Methodes statiques
  CompteEncaissementModePaiement.getAll = async function() {
    return await this.findAll({
      where: { actif: true },
      include: [{
        model: sequelize.models.ModePaiement,
        as: 'modePaiement'
      }],
      order: [['id', 'ASC']]
    });
  };

  CompteEncaissementModePaiement.getByModePaiement = async function(modePaiementId) {
    return await this.findOne({
      where: { mode_paiement_id: modePaiementId, actif: true }
    });
  };

  CompteEncaissementModePaiement.getByCode = async function(codeModePaiement) {
    const ModePaiement = sequelize.models.ModePaiement;
    const mode = await ModePaiement.findOne({
      where: { code: codeModePaiement }
    });

    if (!mode) return null;

    return await this.getByModePaiement(mode.id);
  };

  /**
   * Retourne le compte d'encaissement pour un mode de paiement donne
   * avec fallback sur le compte par defaut
   * @param {string} codeModePaiement - Code du mode de paiement
   * @param {string} compteDefaut - Compte par defaut si non configure
   * @returns {Promise<{numero: string, libelle: string, journal: string|null}>}
   */
  CompteEncaissementModePaiement.getCompte = async function(codeModePaiement, compteDefaut = '5121') {
    const config = await this.getByCode(codeModePaiement);

    if (config) {
      return {
        numero: config.compte_numero,
        libelle: config.compte_libelle,
        journal: config.journal_code
      };
    }

    // Fallback: comptes par defaut selon le mode de paiement
    const comptesDefaut = {
      'especes': { numero: '5300', libelle: 'Caisse' },
      'cheque': { numero: '5121', libelle: 'Banque - Compte courant' },
      'carte_bancaire': { numero: '5121', libelle: 'Banque - Compte courant' },
      'virement': { numero: '5121', libelle: 'Banque - Compte courant' },
      'prelevement': { numero: '5121', libelle: 'Banque - Compte courant' },
      'autre': { numero: compteDefaut, libelle: 'Compte divers' }
    };

    return comptesDefaut[codeModePaiement] || { numero: compteDefaut, libelle: 'Compte par defaut', journal: null };
  };

  return CompteEncaissementModePaiement;
};
