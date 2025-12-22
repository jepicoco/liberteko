/**
 * Modele ArbreDecision
 *
 * Arbre de decision tarifaire associe a un tarif de cotisation.
 * Contient la structure JSON des noeuds et branches avec les reductions.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArbreDecision = sequelize.define('ArbreDecision', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tarif_cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    mode_affichage: {
      type: DataTypes.ENUM('minimum', 'maximum'),
      defaultValue: 'minimum'
    },
    arbre_json: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { version: 1, noeuds: [] },
      get() {
        const value = this.getDataValue('arbre_json');
        if (!value) return { version: 1, noeuds: [] };
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            return { version: 1, noeuds: [] };
          }
        }
        return value;
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    verrouille: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    date_verrouillage: {
      type: DataTypes.DATE,
      allowNull: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'arbres_decision_tarif',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Verifie si l'arbre est modifiable
   * @returns {boolean}
   */
  ArbreDecision.prototype.estModifiable = function() {
    return !this.verrouille;
  };

  /**
   * Verrouille l'arbre (appele quand une cotisation est creee)
   */
  ArbreDecision.prototype.verrouiller = async function() {
    if (!this.verrouille) {
      this.verrouille = true;
      this.date_verrouillage = new Date();
      await this.save();
    }
  };

  /**
   * Duplique l'arbre avec une nouvelle version
   * @returns {ArbreDecision} Nouvel arbre
   */
  ArbreDecision.prototype.dupliquer = async function() {
    const arbreJson = this.arbre_json;
    arbreJson.version = this.version + 1;

    return await ArbreDecision.create({
      tarif_cotisation_id: this.tarif_cotisation_id,
      mode_affichage: this.mode_affichage,
      arbre_json: arbreJson,
      version: this.version + 1,
      verrouille: false,
      structure_id: this.structure_id
    });
  };

  /**
   * Calcule les bornes min/max du tarif
   * @param {number} montantBase - Montant de base de la cotisation
   * @returns {Object} { min, max }
   */
  ArbreDecision.prototype.calculerBornes = function(montantBase) {
    const arbre = this.arbre_json;
    if (!arbre.noeuds || arbre.noeuds.length === 0) {
      return { min: montantBase, max: montantBase };
    }

    let reductionMax = 0;

    // Pour chaque noeud, on prend la reduction max possible
    for (const noeud of arbre.noeuds) {
      reductionMax += this.calculerReductionMaxNoeud(noeud, montantBase);
    }

    return {
      min: Math.max(0, montantBase - reductionMax),
      max: montantBase
    };
  };

  /**
   * Calcule la reduction max possible pour un noeud (recursif pour enfants)
   * @param {Object} noeud - Noeud a evaluer
   * @param {number} montantBase - Montant de base
   * @returns {number}
   */
  ArbreDecision.prototype.calculerReductionMaxNoeud = function(noeud, montantBase) {
    let maxReductionNoeud = 0;

    for (const branche of noeud.branches || []) {
      let maxBranche = 0;

      // Reduction directe de la branche
      if (branche.reduction) {
        const valeur = branche.reduction.valeur || 0;
        if (branche.reduction.type_calcul === 'pourcentage') {
          maxBranche = montantBase * valeur / 100;
        } else {
          maxBranche = valeur;
        }
      }

      // Ajouter les reductions des enfants (sous-conditions)
      if (branche.enfants && branche.enfants.length > 0) {
        for (const enfant of branche.enfants) {
          maxBranche += this.calculerReductionMaxNoeud(enfant, montantBase);
        }
      }

      maxReductionNoeud = Math.max(maxReductionNoeud, maxBranche);
    }

    return maxReductionNoeud;
  };

  return ArbreDecision;
};
