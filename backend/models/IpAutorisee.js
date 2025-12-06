const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IpAutorisee = sequelize.define('IpAutorisee', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adresse_ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    source: {
      type: DataTypes.ENUM('admin', 'triforce'),
      allowNull: false,
      defaultValue: 'admin'
    },
    commentaire: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    date_creation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'ip_autorisees',
    timestamps: false
  });

  /**
   * Vérifie si une IP est autorisée
   * @param {string} ip - L'adresse IP à vérifier
   * @param {boolean} autoriserLocales - Autoriser les IPs locales (127.x.x.x, 192.168.x.x)
   * @returns {Promise<boolean>}
   */
  IpAutorisee.estAutorisee = async function(ip, autoriserLocales = true) {
    // Vérifier les IPs locales si autorisées
    if (autoriserLocales) {
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return true;
      }
      if (ip.startsWith('127.') || ip.startsWith('192.168.')) {
        return true;
      }
      // IPv6 localhost
      if (ip === '::ffff:127.0.0.1') {
        return true;
      }
      // IPv6 mapped 192.168.x.x
      if (ip.startsWith('::ffff:192.168.')) {
        return true;
      }
    }

    // Vérifier en base de données
    const ipAutorisee = await IpAutorisee.findOne({
      where: {
        adresse_ip: ip,
        actif: true
      }
    });

    return !!ipAutorisee;
  };

  /**
   * Ajoute une IP à la liste des autorisées
   * @param {string} ip - L'adresse IP
   * @param {string} source - 'admin' ou 'triforce'
   * @param {string} commentaire - Commentaire optionnel
   * @returns {Promise<IpAutorisee>}
   */
  IpAutorisee.ajouterIp = async function(ip, source = 'admin', commentaire = null) {
    // Vérifier si l'IP existe déjà
    const existante = await IpAutorisee.findOne({ where: { adresse_ip: ip } });

    if (existante) {
      // Réactiver si désactivée
      if (!existante.actif) {
        existante.actif = true;
        existante.source = source;
        if (commentaire) existante.commentaire = commentaire;
        await existante.save();
      }
      return existante;
    }

    // Créer nouvelle entrée
    return await IpAutorisee.create({
      adresse_ip: ip,
      source,
      commentaire
    });
  };

  return IpAutorisee;
};
