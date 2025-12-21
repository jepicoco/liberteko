/**
 * TypeTarif - Categories de tarifs avec criteres d'affichage dynamiques
 * Ex: Enfant (<16), Adulte (16-69), Senior (>=70), Membre association
 *
 * Structure criteres JSON:
 * {
 *   age: { operateur: '<'|'<='|'>'|'>='|'entre', min?: number, max?: number },
 *   sexe: ['M', 'F', 'A'],  // Au moins un requis
 *   commune: { type: 'communaute'|'liste', id?: number, ids?: number[] },
 *   adhesion_active: true,  // date_fin_adhesion_association > aujourd'hui
 *   tags: [1, 3, 5]         // Au moins un tag requis
 * }
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeTarif = sequelize.define('TypeTarif', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique (ADULTE, ENFANT, SENIOR)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    criteres: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Criteres d affichage dynamiques (age, sexe, commune, adhesion, tags)'
    },
    // Champs legacy pour compatibilite
    condition_age_operateur: {
      type: DataTypes.ENUM('<', '<=', '>', '>=', 'entre', 'aucune'),
      allowNull: false,
      defaultValue: 'aucune',
      comment: 'LEGACY - Utiliser criteres.age. Operateur de comparaison pour l\'age'
    },
    condition_age_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'LEGACY - Utiliser criteres.age. Age minimum (pour operateur "entre")'
    },
    condition_age_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'LEGACY - Utiliser criteres.age. Age maximum ou seuil pour operateurs simples'
    },
    priorite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Ordre de verification (plus petit = verifie en premier)'
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
    tableName: 'types_tarifs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Verifie si un age correspond a ce type de tarif
   * @param {number} age - Age en annees
   * @returns {boolean}
   */
  TypeTarif.prototype.matchAge = function(age) {
    if (age === null || age === undefined) {
      // Si pas d'age, seul le type sans condition match
      return this.condition_age_operateur === 'aucune';
    }

    switch (this.condition_age_operateur) {
      case '<':
        return age < this.condition_age_max;
      case '<=':
        return age <= this.condition_age_max;
      case '>':
        return age > this.condition_age_max;
      case '>=':
        return age >= this.condition_age_max;
      case 'entre':
        const min = this.condition_age_min || 0;
        const max = this.condition_age_max || 999;
        return age >= min && age <= max;
      case 'aucune':
        return true;
      default:
        return false;
    }
  };

  /**
   * Trouve le type de tarif correspondant a un age
   * @param {number} age - Age en annees
   * @param {number|null} structureId - Structure (null = global)
   * @param {number|null} organisationId - Organisation
   * @returns {Promise<TypeTarif|null>}
   */
  TypeTarif.findByAge = async function(age, structureId = null, organisationId = null) {
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

    const whereClause = {
      actif: true,
      [Op.or]: orConditions
    };

    const types = await this.findAll({
      where: whereClause,
      order: [['priorite', 'ASC']]
    });

    // Parcourir par ordre de priorite
    for (const type of types) {
      if (type.matchAge(age)) {
        return type;
      }
    }

    // Retourner le type STANDARD ou le premier sans condition
    return types.find(t => t.condition_age_operateur === 'aucune') || null;
  };

  /**
   * Calcule l'age a une date donnee
   * @param {Date} dateNaissance
   * @param {Date} dateReference
   * @returns {number|null}
   */
  TypeTarif.calculateAge = function(dateNaissance, dateReference = new Date()) {
    if (!dateNaissance) return null;

    const birth = new Date(dateNaissance);
    const ref = new Date(dateReference);

    let age = ref.getFullYear() - birth.getFullYear();
    const monthDiff = ref.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  /**
   * Verifie si un utilisateur correspond aux criteres de ce type de tarif
   * Utilise les criteres JSON si definis, sinon fallback sur condition_age_*
   * @param {Object} utilisateur - Utilisateur avec ses tags et infos
   * @param {Object} context - Contexte optionnel (dateReference, etc.)
   * @returns {boolean}
   */
  TypeTarif.prototype.matchUtilisateur = function(utilisateur, context = {}) {
    const criteres = this.criteres;

    // Si pas de criteres, verifier le fallback legacy (condition_age_*)
    if (!criteres || Object.keys(criteres).length === 0) {
      // Fallback sur le systeme legacy
      if (this.condition_age_operateur === 'aucune') {
        return true;
      }
      const age = TypeTarif.calculateAge(utilisateur.date_naissance, context.dateReference);
      return this.matchAge(age);
    }

    // Verifier tous les criteres (ET logique)

    // 1. Critere d'age
    if (criteres.age) {
      const age = TypeTarif.calculateAge(utilisateur.date_naissance, context.dateReference);
      if (!this._matchCritereAge(age, criteres.age)) {
        return false;
      }
    }

    // 2. Critere de sexe
    if (criteres.sexe && Array.isArray(criteres.sexe) && criteres.sexe.length > 0) {
      if (!criteres.sexe.includes(utilisateur.sexe)) {
        return false;
      }
    }

    // 3. Critere d'adhesion association active
    if (criteres.adhesion_active === true) {
      if (!this._matchAdhesionActive(utilisateur)) {
        return false;
      }
    }

    // 4. Critere de tags (au moins un tag)
    if (criteres.tags && Array.isArray(criteres.tags) && criteres.tags.length > 0) {
      if (!this._matchTags(utilisateur, criteres.tags)) {
        return false;
      }
    }

    // 5. Critere de commune (delegue au service car necessite requetes BDD)
    // La verification commune est faite dans criteresTypeTarifService

    return true;
  };

  /**
   * Verifie le critere d'age
   * @private
   */
  TypeTarif.prototype._matchCritereAge = function(age, critereAge) {
    if (age === null || age === undefined) {
      return false;
    }

    switch (critereAge.operateur) {
      case '<':
        return age < (critereAge.max || 999);
      case '<=':
        return age <= (critereAge.max || 999);
      case '>':
        return age > (critereAge.min || 0);
      case '>=':
        return age >= (critereAge.min || 0);
      case 'entre':
        const min = critereAge.min || 0;
        const max = critereAge.max || 999;
        return age >= min && age <= max;
      default:
        return true;
    }
  };

  /**
   * Verifie le critere d'adhesion association active
   * @private
   */
  TypeTarif.prototype._matchAdhesionActive = function(utilisateur) {
    if (!utilisateur.adhesion_association) {
      return false;
    }
    if (!utilisateur.date_fin_adhesion_association) {
      return false;
    }
    const dateFin = new Date(utilisateur.date_fin_adhesion_association);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    return dateFin >= aujourdhui;
  };

  /**
   * Verifie le critere de tags (au moins un tag requis)
   * @private
   */
  TypeTarif.prototype._matchTags = function(utilisateur, tagIds) {
    if (!utilisateur.tags || !Array.isArray(utilisateur.tags) || utilisateur.tags.length === 0) {
      return false;
    }
    const userTagIds = utilisateur.tags.map(t => t.id || t);
    return tagIds.some(id => userTagIds.includes(id));
  };

  /**
   * Trouve les types de tarifs applicables pour un utilisateur
   * @param {Object} utilisateur - Utilisateur avec tags
   * @param {number|null} structureId - Structure (null = global)
   * @param {number|null} organisationId - Organisation
   * @returns {Promise<Array<TypeTarif>>}
   */
  TypeTarif.findByUtilisateur = async function(utilisateur, structureId = null, organisationId = null) {
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

    const whereClause = {
      actif: true,
      [Op.or]: orConditions
    };

    const types = await this.findAll({
      where: whereClause,
      order: [['priorite', 'ASC']]
    });

    // Filtrer les types qui matchent l'utilisateur
    return types.filter(type => type.matchUtilisateur(utilisateur));
  };

  /**
   * Formate les criteres pour affichage
   * @returns {string}
   */
  TypeTarif.prototype.getCriteresDescription = function() {
    const criteres = this.criteres;
    if (!criteres || Object.keys(criteres).length === 0) {
      // Fallback legacy
      if (this.condition_age_operateur === 'aucune') {
        return 'Aucun critere (pour tous)';
      }
      switch (this.condition_age_operateur) {
        case '<': return `Age < ${this.condition_age_max} ans`;
        case '<=': return `Age <= ${this.condition_age_max} ans`;
        case '>': return `Age > ${this.condition_age_max} ans`;
        case '>=': return `Age >= ${this.condition_age_max} ans`;
        case 'entre': return `Age entre ${this.condition_age_min || 0} et ${this.condition_age_max || 999} ans`;
        default: return '';
      }
    }

    const parts = [];

    if (criteres.age) {
      const op = criteres.age.operateur;
      if (op === 'entre') {
        parts.push(`Age ${criteres.age.min || 0}-${criteres.age.max || 999} ans`);
      } else {
        const val = criteres.age.min || criteres.age.max;
        parts.push(`Age ${op} ${val} ans`);
      }
    }

    if (criteres.sexe && criteres.sexe.length > 0) {
      const sexeLabels = { M: 'Masculin', F: 'Feminin', A: 'Autre' };
      const labels = criteres.sexe.map(s => sexeLabels[s] || s);
      parts.push(`Sexe: ${labels.join(', ')}`);
    }

    if (criteres.adhesion_active) {
      parts.push('Adhesion association active');
    }

    if (criteres.tags && criteres.tags.length > 0) {
      parts.push(`Tags requis: ${criteres.tags.length}`);
    }

    if (criteres.commune) {
      if (criteres.commune.type === 'communaute') {
        parts.push('Communaute de communes');
      } else {
        parts.push(`Communes: ${criteres.commune.ids?.length || 0}`);
      }
    }

    return parts.length > 0 ? parts.join(' | ') : 'Aucun critere (pour tous)';
  };

  return TypeTarif;
};
