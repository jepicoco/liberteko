/**
 * TarifTypeTarif - Association entre TarifCotisation et TypeTarif
 * Permet de definir un montant de base different par type de tarif
 * Ex: Cotisation annuelle -> Adulte: 360€, Enfant: 240€
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TarifTypeTarif = sequelize.define('TarifTypeTarif', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tarif_cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tarifs_cotisation',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tarif de cotisation parent'
    },
    type_tarif_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'types_tarifs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Type de tarif (ADULTE, ENFANT, etc.)'
    },
    montant_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Montant de base pour ce type (ex: 360€ pour adulte)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'tarifs_types_tarifs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['tarif_cotisation_id', 'type_tarif_id'],
        name: 'idx_tarif_type_unique'
      }
    ]
  });

  /**
   * Recupere le montant de base pour un tarif et un type donnes
   * @param {number} tarifCotisationId
   * @param {number} typeTarifId
   * @returns {Promise<number|null>}
   */
  TarifTypeTarif.getMontantBase = async function(tarifCotisationId, typeTarifId) {
    const association = await this.findOne({
      where: {
        tarif_cotisation_id: tarifCotisationId,
        type_tarif_id: typeTarifId,
        actif: true
      }
    });
    return association ? parseFloat(association.montant_base) : null;
  };

  /**
   * Recupere tous les types de tarifs avec leurs montants pour un tarif cotisation
   * @param {number} tarifCotisationId
   * @returns {Promise<Array>}
   */
  TarifTypeTarif.getTypesForTarif = async function(tarifCotisationId) {
    return await this.findAll({
      where: {
        tarif_cotisation_id: tarifCotisationId,
        actif: true
      },
      include: [{
        model: sequelize.models.TypeTarif,
        as: 'typeTarif'
      }],
      order: [[{ model: sequelize.models.TypeTarif, as: 'typeTarif' }, 'priorite', 'ASC']]
    });
  };

  /**
   * Definit les montants pour tous les types d'un tarif cotisation
   * @param {number} tarifCotisationId
   * @param {Array<{type_tarif_id: number, montant_base: number}>} montants
   */
  TarifTypeTarif.setMontantsForTarif = async function(tarifCotisationId, montants) {
    const t = await sequelize.transaction();

    try {
      // Desactiver les anciennes associations
      await this.update(
        { actif: false },
        {
          where: { tarif_cotisation_id: tarifCotisationId },
          transaction: t
        }
      );

      // Creer ou reactiver les nouvelles
      for (const { type_tarif_id, montant_base } of montants) {
        await this.upsert({
          tarif_cotisation_id: tarifCotisationId,
          type_tarif_id,
          montant_base,
          actif: true
        }, { transaction: t });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  return TarifTypeTarif;
};
