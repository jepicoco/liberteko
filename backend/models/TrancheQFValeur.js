/**
 * TrancheQFValeur - Valeurs de tranche QF par type de tarif
 * Permet d'avoir des montants differents par type (adulte/enfant) pour chaque tranche QF
 * Ex: Tranche QF 0-400 -> Adulte: 90€, Enfant: 60€
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrancheQFValeur = sequelize.define('TrancheQFValeur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tranche_qf_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tranches_quotient_familial',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tranche de QF parente'
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
    type_calcul: {
      type: DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'Type de valeur: montant fixe ou pourcentage du tarif de base'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant fixe en euros OU pourcentage (0-100)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'tranches_qf_valeurs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['tranche_qf_id', 'type_tarif_id'],
        name: 'idx_tranche_type_unique'
      }
    ]
  });

  /**
   * Calcule le montant pour cette valeur
   * @param {number} montantBase - Montant de base (pour calcul pourcentage)
   * @returns {number}
   */
  TrancheQFValeur.prototype.calculerMontant = function(montantBase) {
    const valeur = parseFloat(this.valeur);

    if (this.type_calcul === 'pourcentage') {
      return Math.round((montantBase * valeur / 100) * 100) / 100;
    }

    return valeur; // Montant fixe
  };

  /**
   * Recupere la valeur pour une tranche et un type de tarif
   * @param {number} trancheQfId - ID de la tranche QF
   * @param {number} typeTarifId - ID du type de tarif
   * @returns {Promise<TrancheQFValeur|null>}
   */
  TrancheQFValeur.getValeurPourType = async function(trancheQfId, typeTarifId) {
    return await this.findOne({
      where: {
        tranche_qf_id: trancheQfId,
        type_tarif_id: typeTarifId,
        actif: true
      }
    });
  };

  /**
   * Recupere toutes les valeurs pour une tranche
   * @param {number} trancheQfId - ID de la tranche QF
   * @returns {Promise<Array>}
   */
  TrancheQFValeur.getValeursForTranche = async function(trancheQfId) {
    return await this.findAll({
      where: {
        tranche_qf_id: trancheQfId,
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
   * Definit les valeurs pour une tranche QF
   * @param {number} trancheQfId - ID de la tranche QF
   * @param {Array<{type_tarif_id: number, type_calcul: string, valeur: number}>} valeurs
   */
  TrancheQFValeur.setValeursForTranche = async function(trancheQfId, valeurs) {
    const t = await sequelize.transaction();

    try {
      // Desactiver les anciennes valeurs
      await this.update(
        { actif: false },
        {
          where: { tranche_qf_id: trancheQfId },
          transaction: t
        }
      );

      // Creer ou reactiver les nouvelles
      for (const { type_tarif_id, type_calcul, valeur } of valeurs) {
        await this.upsert({
          tranche_qf_id: trancheQfId,
          type_tarif_id,
          type_calcul: type_calcul || 'fixe',
          valeur,
          actif: true
        }, { transaction: t });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  return TrancheQFValeur;
};
