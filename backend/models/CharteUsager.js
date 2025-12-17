/**
 * Model CharteUsager
 * Gestion des chartes usager avec versioning et verrouillage
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CharteUsager = sequelize.define('CharteUsager', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Numero de version (ex: 1.0, 2.0)'
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      },
      comment: 'Titre de la charte'
    },
    contenu: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Contenu HTML de la charte (WYSIWYG)'
    },
    date_publication: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de publication'
    },
    est_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Une seule charte peut etre active'
    },
    est_verrouillee: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Verrouillee apres premiere signature'
    },
    nb_signatures: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de signatures'
    }
  }, {
    tableName: 'chartes_usager',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Verrouille la charte (appelee automatiquement apres premiere signature)
   */
  CharteUsager.prototype.verrouiller = async function() {
    if (this.est_verrouillee) {
      return this;
    }
    this.est_verrouillee = true;
    await this.save();
    return this;
  };

  /**
   * Active cette charte et desactive les autres
   */
  CharteUsager.prototype.activer = async function() {
    // Desactiver toutes les autres chartes
    await CharteUsager.update(
      { est_active: false },
      { where: { est_active: true } }
    );

    // Activer celle-ci
    this.est_active = true;
    await this.save();
    return this;
  };

  /**
   * Duplique cette charte avec une nouvelle version
   * @returns {Promise<CharteUsager>} La nouvelle charte dupliquee
   */
  CharteUsager.prototype.dupliquer = async function() {
    const nouvelleVersion = CharteUsager.incrementerVersion(this.version);

    const copie = await CharteUsager.create({
      version: nouvelleVersion,
      titre: this.titre,
      contenu: this.contenu,
      date_publication: new Date(),
      est_active: false,
      est_verrouillee: false,
      nb_signatures: 0
    });

    return copie;
  };

  /**
   * Incremente le compteur de signatures
   */
  CharteUsager.prototype.incrementerSignatures = async function() {
    this.nb_signatures += 1;

    // Verrouiller automatiquement a la premiere signature
    if (this.nb_signatures === 1 && !this.est_verrouillee) {
      this.est_verrouillee = true;
    }

    await this.save();
    return this;
  };

  /**
   * Verifie si la charte peut etre modifiee
   */
  CharteUsager.prototype.peutEtreModifiee = function() {
    return !this.est_verrouillee;
  };

  /**
   * Verifie si la charte peut etre supprimee
   */
  CharteUsager.prototype.peutEtreSupprimee = function() {
    return !this.est_verrouillee && this.nb_signatures === 0;
  };

  // === Methodes statiques ===

  /**
   * Recupere la charte active
   * @returns {Promise<CharteUsager|null>}
   */
  CharteUsager.getActive = async function() {
    return await this.findOne({
      where: { est_active: true }
    });
  };

  /**
   * Genere une nouvelle version a partir d'une version existante
   * @param {string} version - Version actuelle (ex: "1.0", "2.5")
   * @returns {string} Nouvelle version incrementee
   */
  CharteUsager.incrementerVersion = function(version) {
    if (!version) {
      return '1.0';
    }

    const parts = version.split('.');
    if (parts.length === 1) {
      // Format "1" -> "2"
      return String(parseInt(parts[0]) + 1);
    }

    // Format "1.0" -> "2.0"
    const major = parseInt(parts[0]) + 1;
    return `${major}.0`;
  };

  /**
   * Genere la prochaine version disponible
   * @returns {Promise<string>}
   */
  CharteUsager.genererProchaineVersion = async function() {
    const derniere = await this.findOne({
      order: [['id', 'DESC']]
    });

    if (!derniere) {
      return '1.0';
    }

    return this.incrementerVersion(derniere.version);
  };

  return CharteUsager;
};
