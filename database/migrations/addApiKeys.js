/**
 * Migration pour la table api_keys
 * Gestion des cles API pour extensions externes (Chrome, etc.)
 */

const { Sequelize, DataTypes } = require('sequelize');

module.exports = {
  name: '20241214_add_api_keys',

  async up(queryInterface) {
    // Creer la table api_keys
    await queryInterface.createTable('api_keys', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nom descriptif de la cle'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description de l\'usage prevu'
      },
      key_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'Hash SHA-256 de la cle API'
      },
      key_prefix: {
        type: DataTypes.STRING(12),
        allowNull: false,
        comment: 'Prefixe de la cle pour identification'
      },
      permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['jeux:create', 'jeux:update'],
        comment: 'Liste des permissions accordees'
      },
      collections_autorisees: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['jeu'],
        comment: 'Collections accessibles'
      },
      limite_requetes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1000,
        comment: 'Limite de requetes par periode'
      },
      periode_limite: {
        type: DataTypes.ENUM('heure', 'jour', 'mois'),
        defaultValue: 'jour',
        comment: 'Periode de la limite'
      },
      requetes_compteur: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Compteur de requetes'
      },
      date_reset_compteur: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date du prochain reset'
      },
      ip_autorisees: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Liste des IPs autorisees'
      },
      actif: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Cle active'
      },
      date_expiration: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date d\'expiration'
      },
      total_requetes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total des requetes'
      },
      derniere_utilisation: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Derniere utilisation'
      },
      derniere_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Derniere IP'
      },
      cree_par: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID utilisateur createur'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Ajouter les index
    await queryInterface.addIndex('api_keys', ['key_hash'], { unique: true });
    await queryInterface.addIndex('api_keys', ['key_prefix']);
    await queryInterface.addIndex('api_keys', ['actif']);
    await queryInterface.addIndex('api_keys', ['date_expiration']);

    console.log('Table api_keys creee avec succes');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
    console.log('Table api_keys supprimee');
  }
};

// Script d'execution directe
if (require.main === module) {
  const { sequelize } = require('../../backend/models');

  (async () => {
    try {
      await module.exports.up(sequelize.getQueryInterface());
      console.log('Migration executee avec succes');
      process.exit(0);
    } catch (error) {
      console.error('Erreur migration:', error);
      process.exit(1);
    }
  })();
}
