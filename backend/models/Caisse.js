const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Caisse = sequelize.define('Caisse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom de la caisse (ex: Caisse principale, Caisse annexe)'
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code unique (ex: CAISSE_PRINC)'
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      comment: 'Site associe a cette caisse'
    },
    solde_actuel: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Solde actuel de la caisse'
    },
    solde_initial: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Fond de caisse initial'
    },
    compte_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '5300',
      comment: 'Compte comptable associe (classe 53)'
    },
    devise: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    utilisateur_responsable_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur responsable de la caisse'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'caisses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  Caisse.getActives = async function() {
    return await this.findAll({
      where: { actif: true },
      include: [
        { model: sequelize.models.Site, as: 'site' },
        { model: sequelize.models.Utilisateur, as: 'responsable' }
      ],
      order: [['nom', 'ASC']]
    });
  };

  Caisse.getByCode = async function(code) {
    return await this.findOne({
      where: { code },
      include: [
        { model: sequelize.models.Site, as: 'site' }
      ]
    });
  };

  /**
   * Verifie si la caisse a une session ouverte
   */
  Caisse.prototype.aSessionOuverte = async function() {
    const SessionCaisse = sequelize.models.SessionCaisse;
    const session = await SessionCaisse.findOne({
      where: {
        caisse_id: this.id,
        statut: 'ouverte'
      }
    });
    return !!session;
  };

  /**
   * Recupere la session ouverte
   */
  Caisse.prototype.getSessionOuverte = async function() {
    const SessionCaisse = sequelize.models.SessionCaisse;
    return await SessionCaisse.findOne({
      where: {
        caisse_id: this.id,
        statut: 'ouverte'
      },
      include: [
        { model: sequelize.models.Utilisateur, as: 'utilisateur' }
      ]
    });
  };

  return Caisse;
};
