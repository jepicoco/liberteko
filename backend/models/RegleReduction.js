/**
 * RegleReduction - Regles de reduction configurables
 * Sources: commune, quotient familial, statut social, multi-enfants, fidelite, partenariat, handicap, manuel
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RegleReduction = sequelize.define('RegleReduction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Code unique de la regle'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche (ex: "Reduction commune Sciez")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type_source: {
      type: DataTypes.ENUM(
        'commune',
        'quotient_familial',
        'statut_social',
        'multi_enfants',
        'fidelite',
        'partenariat',
        'handicap',
        'age',
        'manuel'
      ),
      allowNull: false,
      comment: 'Source/type de la reduction'
    },
    type_calcul: {
      type: DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'Montant fixe ou pourcentage de reduction'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant en euros OU pourcentage (0-100)'
    },
    condition_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Conditions specifiques selon type_source'
    },
    ordre_application: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Ordre dans le cumul des reductions (plus petit = applique en premier)'
    },
    cumulable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Peut se cumuler avec d\'autres reductions'
    },
    permet_avoir: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, reduction > montant peut generer un avoir'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Section analytique pour cette reduction'
    },
    regroupement_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'OU regroupement analytique'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure proprietaire (null = global ou organisation)'
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Organisation proprietaire (toutes les structures y ont acces)'
    }
  }, {
    tableName: 'regles_reduction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Verifie si cette regle s'applique a un utilisateur
   * @param {object} utilisateur - Objet utilisateur avec ses donnees
   * @param {object} context - Contexte additionnel (date cotisation, enfants, etc.)
   * @returns {boolean}
   */
  RegleReduction.prototype.matchUtilisateur = function(utilisateur, context = {}) {
    const conditions = this.condition_json || {};

    switch (this.type_source) {
      case 'commune':
        return this._matchCommune(utilisateur, conditions);

      case 'quotient_familial':
        return this._matchQuotientFamilial(utilisateur, conditions, context);

      case 'statut_social':
        return this._matchStatutSocial(utilisateur, conditions);

      case 'multi_enfants':
        return this._matchMultiEnfants(utilisateur, conditions, context);

      case 'fidelite':
        return this._matchFidelite(utilisateur, conditions, context);

      case 'partenariat':
        return this._matchPartenariat(utilisateur, conditions);

      case 'handicap':
        return utilisateur.carte_handicap === true;

      case 'age':
        return this._matchAge(utilisateur, conditions, context);

      case 'manuel':
        return false; // Jamais auto-applique

      default:
        return false;
    }
  };

  RegleReduction.prototype._matchCommune = function(utilisateur, conditions) {
    const communeIds = conditions.commune_ids || [];
    if (communeIds.length === 0) return false;

    // Priorite a la commune de prise en charge
    const communeId = utilisateur.commune_prise_en_charge_id || utilisateur.commune_id;
    return communeIds.includes(communeId);
  };

  RegleReduction.prototype._matchQuotientFamilial = function(utilisateur, conditions, context) {
    const qf = context.quotient_familial ?? utilisateur.quotient_familial;
    if (qf === null || qf === undefined) return false;

    // Si tranches specifiees
    if (conditions.tranche_ids && conditions.tranche_ids.length > 0) {
      return conditions.tranche_ids.includes(context.tranche_qf_id);
    }

    // Si plage specifiee
    if (conditions.qf_min !== undefined || conditions.qf_max !== undefined) {
      const min = conditions.qf_min ?? 0;
      const max = conditions.qf_max ?? Infinity;
      return qf >= min && qf < max;
    }

    return false;
  };

  RegleReduction.prototype._matchStatutSocial = function(utilisateur, conditions) {
    const statutsRequis = conditions.statuts || [];
    if (statutsRequis.length === 0) return false;

    const statutsUtilisateur = utilisateur.statut_social || [];
    return statutsRequis.some(s => statutsUtilisateur.includes(s));
  };

  RegleReduction.prototype._matchMultiEnfants = function(utilisateur, conditions, context) {
    const rangMin = conditions.rang_enfant_min || 3;
    const rangEnfant = context.rang_enfant || 1;
    return rangEnfant >= rangMin;
  };

  RegleReduction.prototype._matchFidelite = function(utilisateur, conditions, context) {
    const anneesMin = conditions.annees_adhesion_min || 5;

    if (!utilisateur.date_premiere_adhesion) return false;

    const dateRef = context.date_cotisation ? new Date(context.date_cotisation) : new Date();
    const datePremiere = new Date(utilisateur.date_premiere_adhesion);
    const anneesAdhesion = dateRef.getFullYear() - datePremiere.getFullYear();

    return anneesAdhesion >= anneesMin;
  };

  RegleReduction.prototype._matchPartenariat = function(utilisateur, conditions) {
    const partenariatsRequis = conditions.partenariats || [];
    if (partenariatsRequis.length === 0) return false;

    const partenariatsUtilisateur = utilisateur.partenariats || [];
    return partenariatsRequis.some(p => partenariatsUtilisateur.includes(p));
  };

  RegleReduction.prototype._matchAge = function(utilisateur, conditions, context) {
    if (!utilisateur.date_naissance) return false;

    const dateRef = context.date_cotisation ? new Date(context.date_cotisation) : new Date();
    const dateNaissance = new Date(utilisateur.date_naissance);

    let age = dateRef.getFullYear() - dateNaissance.getFullYear();
    const m = dateRef.getMonth() - dateNaissance.getMonth();
    if (m < 0 || (m === 0 && dateRef.getDate() < dateNaissance.getDate())) {
      age--;
    }

    const operateur = conditions.operateur || '>=';
    const seuil = conditions.age_seuil || 0;

    switch (operateur) {
      case '<': return age < seuil;
      case '<=': return age <= seuil;
      case '>': return age > seuil;
      case '>=': return age >= seuil;
      case '=': return age === seuil;
      default: return false;
    }
  };

  /**
   * Calcule le montant de reduction
   * @param {number} montantCourant - Montant avant cette reduction
   * @returns {number} Montant de reduction (positif)
   */
  RegleReduction.prototype.calculerReduction = function(montantCourant) {
    const valeur = parseFloat(this.valeur);

    if (this.type_calcul === 'pourcentage') {
      return Math.round((montantCourant * valeur / 100) * 100) / 100;
    }

    return valeur; // Montant fixe
  };

  /**
   * Trouve toutes les regles applicables a un utilisateur
   * @param {object} utilisateur
   * @param {object} context
   * @param {number|null} structureId
   * @param {number|null} organisationId
   * @returns {Promise<RegleReduction[]>}
   */
  RegleReduction.findApplicables = async function(utilisateur, context = {}, structureId = null, organisationId = null) {
    const { Op } = sequelize.Sequelize;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }

    const regles = await this.findAll({
      where: {
        actif: true,
        type_source: { [Op.ne]: 'manuel' }, // Exclure les manuelles
        [Op.or]: orConditions
      },
      order: [['ordre_application', 'ASC']]
    });

    return regles.filter(regle => regle.matchUtilisateur(utilisateur, context));
  };

  return RegleReduction;
};
