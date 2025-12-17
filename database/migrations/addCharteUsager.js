/**
 * Migration: Systeme de validation de charte usager
 *
 * Ajoute:
 * - Table chartes_usager (contenu des chartes avec versioning)
 * - Table validations_charte (suivi des validations avec OTP)
 * - Colonnes charte sur utilisateurs
 * - Colonnes config charte sur parametres_front
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la table chartes_usager existe deja
  const tables = await queryInterface.showAllTables();

  // === Table chartes_usager ===
  if (!tables.includes('chartes_usager')) {
    await queryInterface.createTable('chartes_usager', {
      id: {
        type: require('sequelize').DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      version: {
        type: require('sequelize').DataTypes.STRING(20),
        allowNull: false,
        comment: 'Numero de version (ex: 1.0, 2.0)'
      },
      titre: {
        type: require('sequelize').DataTypes.STRING(255),
        allowNull: false,
        comment: 'Titre de la charte'
      },
      contenu: {
        type: require('sequelize').DataTypes.TEXT('long'),
        allowNull: false,
        comment: 'Contenu HTML de la charte (WYSIWYG)'
      },
      date_publication: {
        type: require('sequelize').DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Date de publication'
      },
      est_active: {
        type: require('sequelize').DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Une seule charte peut etre active'
      },
      est_verrouillee: {
        type: require('sequelize').DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Verrouillee apres premiere signature'
      },
      nb_signatures: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Nombre de signatures'
      },
      created_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('chartes_usager', ['est_active'], { name: 'idx_chartes_usager_active' });
    await queryInterface.addIndex('chartes_usager', ['version'], { name: 'idx_chartes_usager_version' });
    console.log('Table chartes_usager creee');
  } else {
    console.log('Table chartes_usager existe deja');
  }

  // === Table validations_charte ===
  if (!tables.includes('validations_charte')) {
    await queryInterface.createTable('validations_charte', {
      id: {
        type: require('sequelize').DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      utilisateur_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'utilisateurs', key: 'id' },
        onDelete: 'CASCADE'
      },
      charte_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'chartes_usager', key: 'id' }
      },
      charte_version: {
        type: require('sequelize').DataTypes.STRING(20),
        allowNull: false,
        comment: 'Version de la charte au moment de la validation'
      },
      // Token pour acces au lien
      token_acces: {
        type: require('sequelize').DataTypes.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'Token hashe pour acces au lien de validation'
      },
      token_acces_expires: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration du token (7 jours)'
      },
      // OTP
      code_otp: {
        type: require('sequelize').DataTypes.STRING(6),
        allowNull: true,
        comment: 'Code OTP 6 chiffres'
      },
      code_otp_expires: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration du code OTP (15 min)'
      },
      canal_otp: {
        type: require('sequelize').DataTypes.ENUM('email', 'sms'),
        allowNull: true,
        comment: 'Canal utilise pour envoyer le code'
      },
      tentatives_otp: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Nombre de tentatives de saisie du code'
      },
      // Statut
      statut: {
        type: require('sequelize').DataTypes.ENUM('en_attente', 'lue', 'otp_envoye', 'validee', 'expiree'),
        allowNull: false,
        defaultValue: 'en_attente'
      },
      // Audit trail
      date_envoi_lien: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true
      },
      date_lecture: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true
      },
      date_demande_otp: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true
      },
      date_validation: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true
      },
      ip_validation: {
        type: require('sequelize').DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP de validation (IPv4 ou IPv6)'
      },
      user_agent_validation: {
        type: require('sequelize').DataTypes.STRING(500),
        allowNull: true,
        comment: 'User agent du navigateur'
      },
      // Lien avec cotisation
      cotisation_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'cotisations', key: 'id' },
        onDelete: 'SET NULL'
      },
      date_fin_grace: {
        type: require('sequelize').DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fin de la periode de grace'
      },
      created_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('validations_charte', ['utilisateur_id'], { name: 'idx_validations_charte_utilisateur' });
    await queryInterface.addIndex('validations_charte', ['statut'], { name: 'idx_validations_charte_statut' });
    await queryInterface.addIndex('validations_charte', ['cotisation_id'], { name: 'idx_validations_charte_cotisation' });
    console.log('Table validations_charte creee');
  } else {
    console.log('Table validations_charte existe deja');
  }

  // === Colonnes utilisateurs ===
  const utilisateursInfo = await queryInterface.describeTable('utilisateurs');

  if (!utilisateursInfo.charte_validee) {
    await queryInterface.addColumn('utilisateurs', 'charte_validee', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Charte actuellement validee'
    });
    console.log('Colonne charte_validee ajoutee a utilisateurs');
  }

  if (!utilisateursInfo.charte_version_validee) {
    await queryInterface.addColumn('utilisateurs', 'charte_version_validee', {
      type: require('sequelize').DataTypes.STRING(20),
      allowNull: true,
      comment: 'Version de la charte validee'
    });
    console.log('Colonne charte_version_validee ajoutee a utilisateurs');
  }

  if (!utilisateursInfo.date_validation_charte) {
    await queryInterface.addColumn('utilisateurs', 'date_validation_charte', {
      type: require('sequelize').DataTypes.DATE,
      allowNull: true,
      comment: 'Date de validation de la charte'
    });
    console.log('Colonne date_validation_charte ajoutee a utilisateurs');
  }

  if (!utilisateursInfo.bypass_charte) {
    await queryInterface.addColumn('utilisateurs', 'bypass_charte', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Bypass admin de la validation charte'
    });
    console.log('Colonne bypass_charte ajoutee a utilisateurs');
  }

  // === Colonnes parametres_front ===
  const paramsFrontInfo = await queryInterface.describeTable('parametres_front');

  if (!paramsFrontInfo.charte_active) {
    await queryInterface.addColumn('parametres_front', 'charte_active', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Systeme de charte usager actif'
    });
    console.log('Colonne charte_active ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_grace_jours) {
    await queryInterface.addColumn('parametres_front', 'charte_grace_jours', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Periode de grace en jours avant blocage'
    });
    console.log('Colonne charte_grace_jours ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_otp_email) {
    await queryInterface.addColumn('parametres_front', 'charte_otp_email', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser validation par email'
    });
    console.log('Colonne charte_otp_email ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_otp_sms) {
    await queryInterface.addColumn('parametres_front', 'charte_otp_sms', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Autoriser validation par SMS'
    });
    console.log('Colonne charte_otp_sms ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_otp_preference) {
    await queryInterface.addColumn('parametres_front', 'charte_otp_preference', {
      type: require('sequelize').DataTypes.ENUM('email', 'sms', 'choix_usager'),
      allowNull: false,
      defaultValue: 'email',
      comment: 'Preference par defaut pour envoi OTP'
    });
    console.log('Colonne charte_otp_preference ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_otp_email_config_id) {
    await queryInterface.addColumn('parametres_front', 'charte_otp_email_config_id', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la configuration email a utiliser pour OTP (null = defaut)'
    });
    console.log('Colonne charte_otp_email_config_id ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.charte_otp_sms_config_id) {
    await queryInterface.addColumn('parametres_front', 'charte_otp_sms_config_id', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la configuration SMS a utiliser pour OTP (null = defaut)'
    });
    console.log('Colonne charte_otp_sms_config_id ajoutee a parametres_front');
  }

  if (!paramsFrontInfo.module_charte) {
    await queryInterface.addColumn('parametres_front', 'module_charte', {
      type: require('sequelize').DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Validation de charte usager activee'
    });
    console.log('Colonne module_charte ajoutee a parametres_front');
  }

  console.log('Migration addCharteUsager terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer les colonnes de parametres_front
  const paramsFrontInfo = await queryInterface.describeTable('parametres_front');
  if (paramsFrontInfo.charte_otp_preference) {
    await queryInterface.removeColumn('parametres_front', 'charte_otp_preference');
  }
  if (paramsFrontInfo.charte_otp_sms) {
    await queryInterface.removeColumn('parametres_front', 'charte_otp_sms');
  }
  if (paramsFrontInfo.charte_otp_email) {
    await queryInterface.removeColumn('parametres_front', 'charte_otp_email');
  }
  if (paramsFrontInfo.charte_grace_jours) {
    await queryInterface.removeColumn('parametres_front', 'charte_grace_jours');
  }
  if (paramsFrontInfo.charte_active) {
    await queryInterface.removeColumn('parametres_front', 'charte_active');
  }

  // Supprimer les colonnes de utilisateurs
  const utilisateursInfo = await queryInterface.describeTable('utilisateurs');
  if (utilisateursInfo.bypass_charte) {
    await queryInterface.removeColumn('utilisateurs', 'bypass_charte');
  }
  if (utilisateursInfo.date_validation_charte) {
    await queryInterface.removeColumn('utilisateurs', 'date_validation_charte');
  }
  if (utilisateursInfo.charte_version_validee) {
    await queryInterface.removeColumn('utilisateurs', 'charte_version_validee');
  }
  if (utilisateursInfo.charte_validee) {
    await queryInterface.removeColumn('utilisateurs', 'charte_validee');
  }

  // Supprimer les tables
  const tables = await queryInterface.showAllTables();
  if (tables.includes('validations_charte')) {
    await queryInterface.dropTable('validations_charte');
  }
  if (tables.includes('chartes_usager')) {
    await queryInterface.dropTable('chartes_usager');
  }

  console.log('Rollback addCharteUsager termine');
}

module.exports = { up, down };

// Execution directe
if (require.main === module) {
  const action = process.argv[2] || 'up';

  if (action === 'up') {
    up()
      .then(() => {
        console.log('Migration executee avec succes');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Erreur migration:', err);
        process.exit(1);
      });
  } else if (action === 'down') {
    down()
      .then(() => {
        console.log('Rollback execute avec succes');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Erreur rollback:', err);
        process.exit(1);
      });
  } else {
    console.log('Usage: node addCharteUsager.js [up|down]');
    process.exit(1);
  }
}
