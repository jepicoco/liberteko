const { ParametresStructure, Utilisateur, UtilisateurStructure, Structure } = require('../models');
const { Op } = require('sequelize');
const { canManageStructure, getAccessibleStructures, hasMinRole } = require('../middleware/structureContext');

/**
 * Récupérer les paramètres de la structure
 */
exports.getParametres = async (req, res) => {
  try {
    // Récupérer le premier (et unique) enregistrement
    let parametres = await ParametresStructure.findOne();

    // Si aucun paramètre n'existe, créer un enregistrement par défaut
    if (!parametres) {
      parametres = await ParametresStructure.create({
        nom_structure: 'Ludothèque',
        pays: 'France'
      });
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des paramètres',
      message: error.message
    });
  }
};

/**
 * Récupérer les paramètres publics (sans données sensibles)
 */
exports.getParametresPublics = async (req, res) => {
  try {
    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create({
        nom_structure: 'Ludothèque',
        pays: 'France'
      });
    }

    res.json(parametres.toPublicJSON());
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres publics:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des paramètres publics',
      message: error.message
    });
  }
};

/**
 * Mettre à jour les paramètres de la structure
 * Accessible uniquement aux administrateurs
 */
exports.updateParametres = async (req, res) => {
  try {
    const updateData = req.body;

    // Récupérer ou créer les paramètres
    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create(updateData);
    } else {
      await parametres.update(updateData);
    }

    res.json({
      message: 'Paramètres mis à jour avec succès',
      parametres
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour des paramètres',
      message: error.message
    });
  }
};

/**
 * Upload du logo de la structure
 * Accessible uniquement aux administrateurs
 */
exports.uploadLogo = async (req, res) => {
  try {
    // TODO: Implémenter l'upload de fichier avec multer
    // Pour l'instant, on accepte juste un chemin/URL
    const { logo } = req.body;

    if (!logo) {
      return res.status(400).json({
        error: 'Aucun logo fourni'
      });
    }

    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create({ logo });
    } else {
      await parametres.update({ logo });
    }

    res.json({
      message: 'Logo mis à jour avec succès',
      logo: parametres.logo
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'upload du logo',
      message: error.message
    });
  }
};

/**
 * Récupérer la liste des utilisateurs avec leurs rôles et accès structures
 * Accessible aux administrateurs et gestionnaires
 * Filtre selon les structures accessibles par l'appelant
 */
exports.getUtilisateurs = async (req, res) => {
  try {
    const { role, statut, structure_id } = req.query;

    // Récupérer les structures accessibles par l'appelant
    const accessibleStructures = await getAccessibleStructures(req.user, 'gestionnaire');
    const accessibleStructureIds = accessibleStructures.map(s => s.id);
    const isGlobalAdmin = req.user.role === 'administrateur';

    let where = {};

    if (role) {
      where.role = role;
    }

    if (statut) {
      where.statut = statut;
    }

    // Construire la requête avec include des accès structure
    const utilisateurs = await Utilisateur.findAll({
      where,
      attributes: [
        'id', 'nom', 'prenom', 'email', 'telephone',
        'role', 'statut', 'date_adhesion', 'code_barre', 'modules_autorises'
      ],
      include: [{
        model: UtilisateurStructure,
        as: 'accesStructures',
        required: false,
        include: [{
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur', 'icone']
        }]
      }],
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    // Filtrer et formater les résultats
    const result = utilisateurs
      .map(u => {
        const userData = u.toJSON();

        // Parser modules_autorises si c'est une chaîne JSON
        if (typeof userData.modules_autorises === 'string') {
          try {
            userData.modules_autorises = JSON.parse(userData.modules_autorises);
          } catch (e) {
            userData.modules_autorises = null;
          }
        }

        // Formater les accès structure
        userData.structures = (userData.accesStructures || [])
          .filter(access => {
            // Si filtre par structure_id, appliquer
            if (structure_id && access.structure_id !== parseInt(structure_id)) {
              return false;
            }
            // Si pas admin global, filtrer par structures accessibles
            if (!isGlobalAdmin && !accessibleStructureIds.includes(access.structure_id)) {
              return false;
            }
            return true;
          })
          .map(access => ({
            structure_id: access.structure_id,
            structure_code: access.structure?.code,
            structure_nom: access.structure?.nom,
            structure_couleur: access.structure?.couleur,
            structure_icone: access.structure?.icone,
            role_structure: access.role_structure,
            role_effectif: access.role_structure || userData.role,
            actif: access.actif,
            date_debut: access.date_debut,
            date_fin: access.date_fin
          }));

        delete userData.accesStructures;
        return userData;
      })
      .filter(u => {
        // Exclure les usagers simples (sans rôle admin ni accès structure)
        if (u.role === 'usager' && (!u.structures || u.structures.length === 0)) {
          return false;
        }
        // Si filtre par structure, exclure ceux sans accès à cette structure
        if (structure_id) {
          const hasStructureAccess = u.structures.some(s => s.structure_id === parseInt(structure_id));
          const isAdminWithoutExplicit = u.role === 'administrateur';
          return hasStructureAccess || isAdminWithoutExplicit;
        }
        // Si pas admin global, exclure ceux qu'on ne peut pas voir
        if (!isGlobalAdmin) {
          // Garder si a au moins un accès aux structures qu'on gère
          const hasVisibleAccess = u.structures.length > 0;
          // Ou si c'est un admin (visible par tous les gestionnaires)
          return hasVisibleAccess || u.role === 'administrateur';
        }
        return true;
      });

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs',
      message: error.message
    });
  }
};

/**
 * Changer le rôle et/ou les modules autorises d'un utilisateur
 * Accessible uniquement aux administrateurs
 */
exports.changerRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, modules_autorises } = req.body;

    // Validation du rôle
    const rolesValides = ['usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];
    if (role && !rolesValides.includes(role)) {
      return res.status(400).json({
        error: 'Rôle invalide',
        message: `Le rôle doit être l'un des suivants: ${rolesValides.join(', ')}`
      });
    }

    // Validation des modules
    const modulesValides = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
    if (modules_autorises !== undefined && modules_autorises !== null) {
      if (!Array.isArray(modules_autorises)) {
        return res.status(400).json({
          error: 'Modules invalides',
          message: 'modules_autorises doit être un tableau ou null'
        });
      }
      const modulesInvalides = modules_autorises.filter(m => !modulesValides.includes(m));
      if (modulesInvalides.length > 0) {
        return res.status(400).json({
          error: 'Modules invalides',
          message: `Modules invalides: ${modulesInvalides.join(', ')}. Modules valides: ${modulesValides.join(', ')}`
        });
      }
    }

    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Empêcher un utilisateur de modifier son propre rôle
    if (req.user && req.user.id === parseInt(id) && role) {
      return res.status(403).json({
        error: 'Action interdite',
        message: 'Vous ne pouvez pas modifier votre propre rôle'
      });
    }

    const ancienRole = utilisateur.role;
    const anciensModules = utilisateur.modules_autorises;

    // Preparer les donnees a mettre a jour
    const updateData = {};
    if (role) updateData.role = role;
    if (modules_autorises !== undefined) {
      // null ou tableau vide = tous les modules
      updateData.modules_autorises = (modules_autorises === null || modules_autorises.length === 0)
        ? null
        : modules_autorises;
    }

    await utilisateur.update(updateData);

    // TODO: Log de l'audit - enregistrer qui a changé quel rôle/modules pour qui

    res.json({
      message: role ? `Rôle changé de ${ancienRole} à ${role}` : 'Modules mis à jour',
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
        modules_autorises: utilisateur.modules_autorises
      }
    });
  } catch (error) {
    console.error('Erreur lors du changement de rôle:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de rôle',
      message: error.message
    });
  }
};

/**
 * Réinitialiser le mot de passe d'un utilisateur
 * Envoie un email avec un lien de réinitialisation
 * Accessible uniquement aux administrateurs
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const crypto = require('crypto');
    const emailService = require('../services/emailService');

    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la réinitialisation du mot de passe d'un admin par un autre admin
    if (utilisateur.role === 'administrateur') {
      return res.status(403).json({
        error: 'Action interdite',
        message: 'Impossible de réinitialiser le mot de passe d\'un administrateur'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Sauvegarder le token (dans un champ notes temporairement, ou ajouter un champ dédié)
    // Pour l'instant, on génère un nouveau mot de passe temporaire et on l'envoie
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Mettre à jour le mot de passe (le hook beforeUpdate va le hasher)
    await utilisateur.update({ password: tempPassword });

    // Envoyer l'email avec le mot de passe temporaire
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';

      await emailService.sendEmail({
        to: utilisateur.email,
        subject: 'Réinitialisation de votre mot de passe - Ludothèque',
        html: `
          <h2>Réinitialisation de votre mot de passe</h2>
          <p>Bonjour ${utilisateur.prenom},</p>
          <p>Votre mot de passe a été réinitialisé par un administrateur.</p>
          <p><strong>Votre nouveau mot de passe temporaire :</strong> <code>${tempPassword}</code></p>
          <p>Veuillez vous connecter avec ce mot de passe et le changer immédiatement.</p>
          <p><a href="${appUrl}/admin/login.html">Se connecter</a></p>
          <br>
          <p><em>Si vous n'avez pas demandé cette réinitialisation, veuillez contacter l'administrateur.</em></p>
        `,
        adherentId: utilisateur.id,
        metadata: {
          destinataire_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
          type: 'password_reset'
        }
      });

      res.json({
        message: 'Email de réinitialisation envoyé',
        email: utilisateur.email
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      // Le mot de passe a quand même été changé, on informe l'admin
      res.status(500).json({
        error: 'Mot de passe réinitialisé mais erreur d\'envoi d\'email',
        message: emailError.message,
        tempPassword: tempPassword // On renvoie le mot de passe temporaire à l'admin en cas d'échec email
      });
    }
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({
      error: 'Erreur lors de la réinitialisation du mot de passe',
      message: error.message
    });
  }
};

/**
 * Récupérer la liste des rôles disponibles
 */
exports.getRoles = async (req, res) => {
  try {
    const roles = [
      {
        valeur: 'usager',
        libelle: 'Usager',
        description: 'Accès consultation uniquement (profil et emprunts personnels)',
        niveau: 0
      },
      {
        valeur: 'benevole',
        libelle: 'Bénévole',
        description: 'Gestion des emprunts/retours, consultation des adhérents et jeux',
        niveau: 1
      },
      {
        valeur: 'gestionnaire',
        libelle: 'Gestionnaire',
        description: 'Gestion complète des adhérents, jeux, emprunts et cotisations',
        niveau: 2
      },
      {
        valeur: 'comptable',
        libelle: 'Comptable',
        description: 'Accès comptabilité, cotisations et exports',
        niveau: 3
      },
      {
        valeur: 'administrateur',
        libelle: 'Administrateur',
        description: 'Accès total à toutes les fonctionnalités',
        niveau: 4
      }
    ];

    res.json(roles);
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des rôles',
      message: error.message
    });
  }
};

// ========================================
// Gestion des accès structure utilisateur
// ========================================

/**
 * Récupérer les structures auxquelles un utilisateur a accès
 * GET /api/parametres/utilisateurs/:id/structures
 */
exports.getUtilisateurStructures = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur cible existe
    const utilisateur = await Utilisateur.findByPk(id, {
      attributes: ['id', 'nom', 'prenom', 'email', 'role']
    });

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer les structures accessibles par l'appelant
    const accessibleStructures = await getAccessibleStructures(req.user, 'gestionnaire');
    const accessibleStructureIds = accessibleStructures.map(s => s.id);
    const isGlobalAdmin = req.user.role === 'administrateur';

    // Récupérer les accès structure de l'utilisateur cible
    const accesses = await UtilisateurStructure.findAll({
      where: { utilisateur_id: id },
      include: [{
        model: Structure,
        as: 'structure',
        attributes: ['id', 'code', 'nom', 'couleur', 'icone', 'type_structure']
      }]
    });

    // Filtrer selon les structures accessibles par l'appelant
    const result = accesses
      .filter(access => isGlobalAdmin || accessibleStructureIds.includes(access.structure_id))
      .map(access => ({
        id: access.id,
        structure_id: access.structure_id,
        structure_code: access.structure?.code,
        structure_nom: access.structure?.nom,
        structure_couleur: access.structure?.couleur,
        structure_icone: access.structure?.icone,
        structure_type: access.structure?.type_structure,
        role_structure: access.role_structure,
        role_effectif: access.role_structure || utilisateur.role,
        actif: access.actif,
        date_debut: access.date_debut,
        date_fin: access.date_fin,
        created_at: access.created_at,
        // Indiquer si l'appelant peut modifier cet accès
        can_edit: isGlobalAdmin || accessibleStructureIds.includes(access.structure_id)
      }));

    res.json({
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role
      },
      structures: result,
      // Structures disponibles pour ajout (celles que l'appelant gère et où l'utilisateur n'a pas encore accès)
      structures_disponibles: accessibleStructures
        .filter(s => !accesses.some(a => a.structure_id === s.id))
        .map(s => ({
          id: s.id,
          code: s.code,
          nom: s.nom,
          couleur: s.couleur,
          icone: s.icone
        }))
    });
  } catch (error) {
    console.error('Erreur getUtilisateurStructures:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des accès structure',
      message: error.message
    });
  }
};

/**
 * Ajouter un accès structure à un utilisateur
 * POST /api/parametres/utilisateurs/:id/structures
 */
exports.addUtilisateurStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { structure_id, role_structure, date_debut, date_fin } = req.body;

    // Validation
    if (!structure_id) {
      return res.status(400).json({ error: 'structure_id requis' });
    }

    // Vérifier que l'utilisateur cible existe
    const utilisateur = await Utilisateur.findByPk(id);
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier que la structure existe
    const structure = await Structure.findByPk(structure_id);
    if (!structure) {
      return res.status(404).json({ error: 'Structure non trouvée' });
    }

    // Vérifier que l'appelant peut gérer cette structure
    const canManage = await canManageStructure(req.user, structure_id);
    if (!canManage) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous ne pouvez pas gérer les accès de cette structure'
      });
    }

    // Vérifier que l'accès n'existe pas déjà
    const existingAccess = await UtilisateurStructure.findOne({
      where: { utilisateur_id: id, structure_id }
    });
    if (existingAccess) {
      return res.status(409).json({
        error: 'Accès existant',
        message: 'Cet utilisateur a déjà un accès à cette structure'
      });
    }

    // Valider le role_structure si fourni
    if (role_structure) {
      const rolesValides = ['usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];
      if (!rolesValides.includes(role_structure)) {
        return res.status(400).json({ error: 'Role invalide' });
      }
      // Ne pas permettre d'attribuer un rôle supérieur au sien
      if (!hasMinRole(req.user.role, role_structure)) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous ne pouvez pas attribuer un rôle supérieur au vôtre'
        });
      }
    }

    // Créer l'accès
    const access = await UtilisateurStructure.create({
      utilisateur_id: parseInt(id),
      structure_id: parseInt(structure_id),
      role_structure: role_structure || null,
      actif: true,
      date_debut: date_debut || null,
      date_fin: date_fin || null
    });

    res.status(201).json({
      message: 'Accès structure ajouté',
      access: {
        id: access.id,
        structure_id: access.structure_id,
        structure_nom: structure.nom,
        role_structure: access.role_structure,
        role_effectif: access.role_structure || utilisateur.role,
        actif: access.actif,
        date_debut: access.date_debut,
        date_fin: access.date_fin
      }
    });
  } catch (error) {
    console.error('Erreur addUtilisateurStructure:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'ajout de l\'accès structure',
      message: error.message
    });
  }
};

/**
 * Modifier un accès structure d'un utilisateur
 * PUT /api/parametres/utilisateurs/:id/structures/:structureId
 */
exports.updateUtilisateurStructure = async (req, res) => {
  try {
    const { id, structureId } = req.params;
    const { role_structure, actif, date_debut, date_fin } = req.body;

    // Vérifier que l'accès existe
    const access = await UtilisateurStructure.findOne({
      where: { utilisateur_id: id, structure_id: structureId },
      include: [{ model: Structure, as: 'structure' }]
    });

    if (!access) {
      return res.status(404).json({ error: 'Accès structure non trouvé' });
    }

    // Vérifier que l'appelant peut gérer cette structure
    const canManage = await canManageStructure(req.user, parseInt(structureId));
    if (!canManage) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous ne pouvez pas gérer les accès de cette structure'
      });
    }

    // Valider le role_structure si fourni
    if (role_structure !== undefined && role_structure !== null) {
      const rolesValides = ['usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];
      if (!rolesValides.includes(role_structure)) {
        return res.status(400).json({ error: 'Role invalide' });
      }
      // Ne pas permettre d'attribuer un rôle supérieur au sien
      if (!hasMinRole(req.user.role, role_structure)) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous ne pouvez pas attribuer un rôle supérieur au vôtre'
        });
      }
    }

    // Mettre à jour
    const updateData = {};
    if (role_structure !== undefined) updateData.role_structure = role_structure || null;
    if (actif !== undefined) updateData.actif = actif;
    if (date_debut !== undefined) updateData.date_debut = date_debut || null;
    if (date_fin !== undefined) updateData.date_fin = date_fin || null;

    await access.update(updateData);

    // Récupérer l'utilisateur pour le role effectif
    const utilisateur = await Utilisateur.findByPk(id, { attributes: ['role'] });

    res.json({
      message: 'Accès structure mis à jour',
      access: {
        id: access.id,
        structure_id: access.structure_id,
        structure_nom: access.structure?.nom,
        role_structure: access.role_structure,
        role_effectif: access.role_structure || utilisateur?.role,
        actif: access.actif,
        date_debut: access.date_debut,
        date_fin: access.date_fin
      }
    });
  } catch (error) {
    console.error('Erreur updateUtilisateurStructure:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'accès structure',
      message: error.message
    });
  }
};

/**
 * Supprimer un accès structure d'un utilisateur
 * DELETE /api/parametres/utilisateurs/:id/structures/:structureId
 */
exports.deleteUtilisateurStructure = async (req, res) => {
  try {
    const { id, structureId } = req.params;

    // Vérifier que l'accès existe
    const access = await UtilisateurStructure.findOne({
      where: { utilisateur_id: id, structure_id: structureId },
      include: [{ model: Structure, as: 'structure', attributes: ['nom'] }]
    });

    if (!access) {
      return res.status(404).json({ error: 'Accès structure non trouvé' });
    }

    // Vérifier que l'appelant peut gérer cette structure
    const canManage = await canManageStructure(req.user, parseInt(structureId));
    if (!canManage) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous ne pouvez pas gérer les accès de cette structure'
      });
    }

    const structureNom = access.structure?.nom;
    await access.destroy();

    res.json({
      message: `Accès à ${structureNom} supprimé`,
      structure_id: parseInt(structureId)
    });
  } catch (error) {
    console.error('Erreur deleteUtilisateurStructure:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'accès structure',
      message: error.message
    });
  }
};

/**
 * Récupérer les structures accessibles par l'utilisateur connecté
 * GET /api/parametres/mes-structures
 */
exports.getMesStructures = async (req, res) => {
  try {
    const structures = await getAccessibleStructures(req.user);
    res.json(structures);
  } catch (error) {
    console.error('Erreur getMesStructures:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des structures',
      message: error.message
    });
  }
};
