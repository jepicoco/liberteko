/**
 * Migration pour la table event_triggers
 * Declencheurs d'evenements pour notifications automatiques
 */

module.exports = {
  name: '20241210_add_event_triggers',

  async up(connection) {
    // Verifier si la table existe deja
    const [tables] = await connection.query("SHOW TABLES LIKE 'event_triggers'");
    if (tables.length > 0) {
      console.log('    Table event_triggers existe deja, migration ignoree');
      return;
    }

    // Creer la table event_triggers
    await connection.query(`
      CREATE TABLE event_triggers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        libelle VARCHAR(100) NOT NULL,
        description TEXT NULL,
        categorie ENUM('adherent', 'emprunt', 'cotisation', 'systeme') NOT NULL,
        template_email_code VARCHAR(50) NULL,
        template_sms_code VARCHAR(50) NULL,
        email_actif TINYINT(1) NOT NULL DEFAULT 0,
        sms_actif TINYINT(1) NOT NULL DEFAULT 0,
        delai_envoi INT NULL DEFAULT 0,
        condition_envoi TEXT NULL,
        ordre_affichage INT NOT NULL DEFAULT 0,
        icone VARCHAR(50) NULL DEFAULT 'bi-bell',
        couleur VARCHAR(20) NULL DEFAULT 'primary',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY event_triggers_code_unique (code),
        KEY event_triggers_categorie (categorie),
        KEY event_triggers_email_actif (email_actif),
        KEY event_triggers_sms_actif (sms_actif),
        KEY event_triggers_ordre_affichage (ordre_affichage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('    Table event_triggers creee avec succes');
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS event_triggers');
    console.log('    Table event_triggers supprimee');
  }
};
