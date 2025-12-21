/**
 * Associations Charte Usager
 * Chartes, Validations, Signatures numeriques
 */

function setupCharteAssociations(models) {
  const {
    Utilisateur,
    Cotisation,
    CharteUsager,
    ValidationCharte
  } = models;

  // ========================================
  // CharteUsager <-> ValidationCharte
  // ========================================

  CharteUsager.hasMany(ValidationCharte, {
    foreignKey: 'charte_id',
    as: 'validations'
  });

  ValidationCharte.belongsTo(CharteUsager, {
    foreignKey: 'charte_id',
    as: 'charte'
  });

  // ========================================
  // Utilisateur <-> ValidationCharte
  // ========================================

  Utilisateur.hasMany(ValidationCharte, {
    foreignKey: 'utilisateur_id',
    as: 'validationsCharte'
  });

  ValidationCharte.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // ========================================
  // Cotisation <-> ValidationCharte
  // ========================================

  Cotisation.hasOne(ValidationCharte, {
    foreignKey: 'cotisation_id',
    as: 'validationCharte'
  });

  ValidationCharte.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });
}

module.exports = setupCharteAssociations;
