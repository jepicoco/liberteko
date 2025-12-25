const { DataTypes, Op } = require('sequelize');

/**
 * RemiseBanque Model
 * Represents a bank deposit grouping multiple cash/check movements
 */
module.exports = (sequelize) => {
  const RemiseBanque = sequelize.define('RemiseBanque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero_remise: {
      type: DataTypes.STRING(50),
      unique: true,
      comment: 'Format: REM-YYYY-NNNNNN'
    },
    caisse_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'caisses',
        key: 'id'
      }
    },
    compte_bancaire_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comptes_bancaires',
        key: 'id'
      }
    },
    date_remise: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_depot_effectif: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date du depot effectif en banque'
    },
    montant_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    nb_mouvements: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    detail_par_mode: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Repartition par mode: {"especes": 150.00, "cheques": 200.00}'
    },
    statut: {
      type: DataTypes.ENUM('en_preparation', 'deposee', 'validee', 'annulee'),
      allowNull: false,
      defaultValue: 'en_preparation'
    },
    bordereau_reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Reference du bordereau de remise banque'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    operateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur ayant cree la remise'
    },
    validee_par_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur ayant valide la remise'
    },
    date_validation: {
      type: DataTypes.DATE,
      allowNull: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'structures',
        key: 'id'
      }
    }
  }, {
    tableName: 'remises_banque',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (remise) => {
        if (!remise.numero_remise) {
          remise.numero_remise = await RemiseBanque.genererNumero(remise.structure_id);
        }
      }
    }
  });

  /**
   * Generate unique remise number: REM-YYYY-NNNNNN
   * @param {number|null} structureId - Structure ID (optional)
   * @returns {string} Generated number
   */
  RemiseBanque.genererNumero = async function(structureId = null) {
    const year = new Date().getFullYear();

    // Use transaction to avoid race conditions
    const result = await sequelize.transaction(async (t) => {
      // Try to get and update counter
      const [updated] = await sequelize.query(`
        UPDATE compteurs_remises
        SET dernier_numero = dernier_numero + 1
        WHERE annee = :year AND (structure_id = :structureId OR (structure_id IS NULL AND :structureId IS NULL))
      `, {
        replacements: { year, structureId },
        transaction: t
      });

      // If no row updated, create new counter
      if (updated === 0) {
        await sequelize.query(`
          INSERT INTO compteurs_remises (annee, dernier_numero, structure_id)
          VALUES (:year, 1, :structureId)
        `, {
          replacements: { year, structureId },
          transaction: t
        });
        return 1;
      }

      // Get the new number
      const [[counter]] = await sequelize.query(`
        SELECT dernier_numero FROM compteurs_remises
        WHERE annee = :year AND (structure_id = :structureId OR (structure_id IS NULL AND :structureId IS NULL))
      `, {
        replacements: { year, structureId },
        transaction: t
      });

      return counter.dernier_numero;
    });

    return `REM-${year}-${String(result).padStart(6, '0')}`;
  };

  /**
   * Get remises by status
   * @param {string} statut - Status filter
   * @param {object} options - Query options
   * @returns {Array<RemiseBanque>}
   */
  RemiseBanque.getByStatut = async function(statut, options = {}) {
    return this.findAll({
      where: { statut, ...options.where },
      include: options.include || [],
      order: [['date_remise', 'DESC']]
    });
  };

  /**
   * Get pending remises (en_preparation) for a caisse
   * @param {number} caisseId
   * @returns {Array<RemiseBanque>}
   */
  RemiseBanque.getEnPreparation = async function(caisseId) {
    return this.findAll({
      where: {
        caisse_id: caisseId,
        statut: 'en_preparation'
      },
      order: [['created_at', 'DESC']]
    });
  };

  // Instance methods

  /**
   * Check if remise can be modified
   * @returns {boolean}
   */
  RemiseBanque.prototype.estModifiable = function() {
    return this.statut === 'en_preparation';
  };

  /**
   * Check if remise can be validated
   * @returns {boolean}
   */
  RemiseBanque.prototype.peutEtreValidee = function() {
    return this.statut === 'deposee';
  };

  /**
   * Mark as deposited
   * @param {Date|null} dateDepot - Deposit date (default: today)
   */
  RemiseBanque.prototype.marquerDeposee = async function(dateDepot = null) {
    if (this.statut !== 'en_preparation') {
      throw new Error('Seule une remise en preparation peut etre marquee comme deposee');
    }
    this.statut = 'deposee';
    this.date_depot_effectif = dateDepot || new Date();
    await this.save();
  };

  /**
   * Validate the remise after bank confirmation
   * @param {number} valideurId - User ID who validates
   * @param {string|null} bordereauRef - Bank slip reference
   */
  RemiseBanque.prototype.valider = async function(valideurId, bordereauRef = null) {
    if (this.statut !== 'deposee') {
      throw new Error('Seule une remise deposee peut etre validee');
    }
    this.statut = 'validee';
    this.validee_par_id = valideurId;
    this.date_validation = new Date();
    if (bordereauRef) {
      this.bordereau_reference = bordereauRef;
    }
    await this.save();
  };

  /**
   * Cancel the remise (releases movements)
   */
  RemiseBanque.prototype.annuler = async function() {
    if (this.statut === 'validee') {
      throw new Error('Une remise validee ne peut pas etre annulee');
    }
    this.statut = 'annulee';
    await this.save();
  };

  /**
   * Recalculate totals from linked movements
   * @param {Array<MouvementCaisse>} mouvements - Movements to include
   */
  RemiseBanque.prototype.recalculerTotaux = async function(mouvements) {
    const detailParMode = {};
    let total = 0;

    for (const mvt of mouvements) {
      const mode = mvt.mode_paiement || 'autre';
      const montant = parseFloat(mvt.montant) || 0;

      if (!detailParMode[mode]) {
        detailParMode[mode] = 0;
      }
      detailParMode[mode] += montant;
      total += montant;
    }

    this.detail_par_mode = detailParMode;
    this.montant_total = total;
    this.nb_mouvements = mouvements.length;
    await this.save();
  };

  /**
   * Get formatted totals for display
   * @returns {object}
   */
  RemiseBanque.prototype.getTotauxFormates = function() {
    const detail = this.detail_par_mode || {};
    const labels = {
      especes: 'Especes',
      cheque: 'Cheques',
      cb: 'Cartes bancaires',
      virement: 'Virements',
      autre: 'Autres'
    };

    return Object.entries(detail).map(([mode, montant]) => ({
      mode,
      label: labels[mode] || mode,
      montant: parseFloat(montant).toFixed(2)
    }));
  };

  // Statut labels
  RemiseBanque.STATUT_LABELS = {
    en_preparation: 'En preparation',
    deposee: 'Deposee',
    validee: 'Validee',
    annulee: 'Annulee'
  };

  // Modes eligible for bank deposit
  RemiseBanque.MODES_ELIGIBLES = ['especes', 'cheque'];

  return RemiseBanque;
};
