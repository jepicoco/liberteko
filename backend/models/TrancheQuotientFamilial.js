/**
 * TrancheQuotientFamilial - Tranches de quotient familial
 * Definit les bornes et montants pour chaque tranche
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrancheQuotientFamilial = sequelize.define('TrancheQuotientFamilial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    configuration_qf_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Configuration parente'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche (ex: "QF 0-400")'
    },
    borne_min: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Borne inferieure (incluse)'
    },
    borne_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Borne superieure (exclue), NULL = infini'
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
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'tranches_quotient_familial',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Verifie si un QF est dans cette tranche
   * @param {number} qf - Quotient familial
   * @returns {boolean}
   */
  TrancheQuotientFamilial.prototype.matchQF = function(qf) {
    if (qf === null || qf === undefined) return false;

    const inMin = qf >= this.borne_min;
    const inMax = this.borne_max === null || qf < this.borne_max;

    return inMin && inMax;
  };

  /**
   * Calcule le montant pour cette tranche
   * @param {number} montantBase - Montant de base de la cotisation
   * @returns {number}
   */
  TrancheQuotientFamilial.prototype.calculerMontant = function(montantBase) {
    const valeur = parseFloat(this.valeur);

    if (this.type_calcul === 'pourcentage') {
      return Math.round((montantBase * valeur / 100) * 100) / 100;
    }

    return valeur; // Montant fixe
  };

  /**
   * Retourne la description de la tranche
   * @returns {string}
   */
  TrancheQuotientFamilial.prototype.getDescription = function() {
    if (this.borne_max === null) {
      return `QF >= ${this.borne_min}`;
    }
    return `QF ${this.borne_min}-${this.borne_max - 1}`;
  };

  return TrancheQuotientFamilial;
};
