/**
 * Associations Plans Interactifs
 * Plans, Etages, Elements, Emplacements
 */

function setupPlansAssociations(models) {
  const {
    Site,
    Plan,
    Etage,
    ElementPlan,
    ElementEmplacement,
    EmplacementJeu,
    EmplacementLivre,
    EmplacementFilm,
    EmplacementDisque
  } = models;

  // ========================================
  // Site <-> Plan
  // ========================================

  Site.hasOne(Plan, {
    foreignKey: 'site_id',
    as: 'plan'
  });

  Plan.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  // ========================================
  // Plan <-> Etage
  // ========================================

  Plan.hasMany(Etage, {
    foreignKey: 'plan_id',
    as: 'etages'
  });

  Etage.belongsTo(Plan, {
    foreignKey: 'plan_id',
    as: 'plan'
  });

  // ========================================
  // Etage <-> ElementPlan
  // ========================================

  Etage.hasMany(ElementPlan, {
    foreignKey: 'etage_id',
    as: 'elements'
  });

  ElementPlan.belongsTo(Etage, {
    foreignKey: 'etage_id',
    as: 'etage'
  });

  // ========================================
  // ElementPlan <-> ElementEmplacement
  // ========================================

  ElementPlan.hasMany(ElementEmplacement, {
    foreignKey: 'element_plan_id',
    as: 'emplacements'
  });

  ElementEmplacement.belongsTo(ElementPlan, {
    foreignKey: 'element_plan_id',
    as: 'elementPlan'
  });

  // ========================================
  // ElementEmplacement <-> Emplacements par type
  // ========================================

  ElementEmplacement.belongsTo(EmplacementJeu, {
    foreignKey: 'emplacement_jeu_id',
    as: 'emplacementJeu'
  });

  EmplacementJeu.hasMany(ElementEmplacement, {
    foreignKey: 'emplacement_jeu_id',
    as: 'elementsPlan'
  });

  ElementEmplacement.belongsTo(EmplacementLivre, {
    foreignKey: 'emplacement_livre_id',
    as: 'emplacementLivre'
  });

  EmplacementLivre.hasMany(ElementEmplacement, {
    foreignKey: 'emplacement_livre_id',
    as: 'elementsPlan'
  });

  ElementEmplacement.belongsTo(EmplacementFilm, {
    foreignKey: 'emplacement_film_id',
    as: 'emplacementFilm'
  });

  EmplacementFilm.hasMany(ElementEmplacement, {
    foreignKey: 'emplacement_film_id',
    as: 'elementsPlan'
  });

  ElementEmplacement.belongsTo(EmplacementDisque, {
    foreignKey: 'emplacement_disque_id',
    as: 'emplacementDisque'
  });

  EmplacementDisque.hasMany(ElementEmplacement, {
    foreignKey: 'emplacement_disque_id',
    as: 'elementsPlan'
  });
}

module.exports = setupPlansAssociations;
