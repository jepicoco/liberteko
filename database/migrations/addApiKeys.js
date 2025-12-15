/**
 * Migration pour la table api_keys
 * Gestion des cles API pour extensions externes (Chrome, etc.)
 */

module.exports = {
  name: '20241214_add_api_keys',

  async up(connection) {
    // Verifier si la table existe deja
    const [tables] = await connection.query("SHOW TABLES LIKE 'api_keys'");
    if (tables.length > 0) {
      console.log('    Table api_keys existe deja, migration ignoree');
      return;
    }

    // Creer la table api_keys
    await connection.query(`
      CREATE TABLE api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL COMMENT 'Nom descriptif de la cle',
        description TEXT NULL COMMENT 'Description de l\'usage prevu',
        key_hash VARCHAR(64) NOT NULL COMMENT 'Hash SHA-256 de la cle API',
        key_prefix VARCHAR(12) NOT NULL COMMENT 'Prefixe de la cle pour identification',
        permissions JSON NOT NULL COMMENT 'Liste des permissions accordees',
        collections_autorisees JSON NOT NULL COMMENT 'Collections accessibles',
        limite_requetes INT DEFAULT 1000 COMMENT 'Limite de requetes par periode',
        periode_limite ENUM('heure', 'jour', 'mois') DEFAULT 'jour' COMMENT 'Periode de la limite',
        requetes_compteur INT DEFAULT 0 COMMENT 'Compteur de requetes',
        date_reset_compteur DATETIME NULL COMMENT 'Date du prochain reset',
        ip_autorisees JSON NULL COMMENT 'Liste des IPs autorisees',
        actif TINYINT(1) DEFAULT 1 COMMENT 'Cle active',
        date_expiration DATETIME NULL COMMENT 'Date d\'expiration',
        total_requetes INT DEFAULT 0 COMMENT 'Total des requetes',
        derniere_utilisation DATETIME NULL COMMENT 'Derniere utilisation',
        derniere_ip VARCHAR(45) NULL COMMENT 'Derniere IP',
        cree_par INT NULL COMMENT 'ID utilisateur createur',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_key_hash (key_hash),
        KEY idx_key_prefix (key_prefix),
        KEY idx_actif (actif),
        KEY idx_date_expiration (date_expiration)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('    Table api_keys creee avec succes');
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS api_keys');
    console.log('    Table api_keys supprimee');
  }
};
