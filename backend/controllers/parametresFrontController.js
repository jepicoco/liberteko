/**
 * Controller Parametres Front
 * Gestion des parametres du site public (SEO, modules, CGV/CGU...)
 */

const { ParametresFront } = require('../models');

/**
 * Recuperer tous les parametres front
 */
exports.getParametres = async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    res.json(parametres);
  } catch (error) {
    console.error('Erreur getParametres front:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des parametres' });
  }
};

/**
 * Recuperer les parametres publics (sans donnees sensibles)
 */
exports.getParametresPublics = async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    res.json(parametres.toPublicJSON());
  } catch (error) {
    console.error('Erreur getParametresPublics front:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des parametres publics' });
  }
};

/**
 * Mettre a jour les parametres front
 */
exports.updateParametres = async (req, res) => {
  try {
    const {
      // Identite
      nom_site, logo_url, favicon_url,
      // SEO
      meta_description, meta_keywords, meta_author,
      og_image_url, google_analytics_id, google_site_verification, robots_txt,
      // Mode
      mode_fonctionnement,
      // Modules
      module_ludotheque, module_bibliotheque, module_inscriptions,
      module_reservations, module_paiement_en_ligne,
      // Legal
      cgv, cgu, politique_confidentialite, mentions_legales,
      // Contact
      email_contact, telephone_contact, adresse_contact,
      // Reseaux sociaux
      facebook_url, instagram_url, twitter_url, youtube_url,
      // Personnalisation
      couleur_primaire, couleur_secondaire, css_personnalise,
      // Maintenance
      mode_maintenance, message_maintenance
    } = req.body;

    let parametres = await ParametresFront.findOne();

    if (!parametres) {
      // Creer les parametres s'ils n'existent pas
      parametres = await ParametresFront.create({
        nom_site: nom_site || 'Ludotheque',
        logo_url, favicon_url,
        meta_description, meta_keywords, meta_author,
        og_image_url, google_analytics_id, google_site_verification, robots_txt,
        mode_fonctionnement: mode_fonctionnement || 'complet',
        module_ludotheque: module_ludotheque !== false,
        module_bibliotheque: module_bibliotheque || false,
        module_inscriptions: module_inscriptions !== false,
        module_reservations: module_reservations || false,
        module_paiement_en_ligne: module_paiement_en_ligne || false,
        cgv, cgu, politique_confidentialite, mentions_legales,
        email_contact, telephone_contact, adresse_contact,
        facebook_url, instagram_url, twitter_url, youtube_url,
        couleur_primaire, couleur_secondaire, css_personnalise,
        mode_maintenance: mode_maintenance || false,
        message_maintenance
      });
    } else {
      // Mettre a jour les parametres existants
      const updates = {};

      // Identite
      if (nom_site !== undefined) updates.nom_site = nom_site;
      if (logo_url !== undefined) updates.logo_url = logo_url;
      if (favicon_url !== undefined) updates.favicon_url = favicon_url;

      // SEO
      if (meta_description !== undefined) updates.meta_description = meta_description;
      if (meta_keywords !== undefined) updates.meta_keywords = meta_keywords;
      if (meta_author !== undefined) updates.meta_author = meta_author;
      if (og_image_url !== undefined) updates.og_image_url = og_image_url;
      if (google_analytics_id !== undefined) updates.google_analytics_id = google_analytics_id;
      if (google_site_verification !== undefined) updates.google_site_verification = google_site_verification;
      if (robots_txt !== undefined) updates.robots_txt = robots_txt;

      // Mode
      if (mode_fonctionnement !== undefined) updates.mode_fonctionnement = mode_fonctionnement;

      // Modules
      if (module_ludotheque !== undefined) updates.module_ludotheque = module_ludotheque;
      if (module_bibliotheque !== undefined) updates.module_bibliotheque = module_bibliotheque;
      if (module_inscriptions !== undefined) updates.module_inscriptions = module_inscriptions;
      if (module_reservations !== undefined) updates.module_reservations = module_reservations;
      if (module_paiement_en_ligne !== undefined) updates.module_paiement_en_ligne = module_paiement_en_ligne;

      // Legal
      if (cgv !== undefined) updates.cgv = cgv;
      if (cgu !== undefined) updates.cgu = cgu;
      if (politique_confidentialite !== undefined) updates.politique_confidentialite = politique_confidentialite;
      if (mentions_legales !== undefined) updates.mentions_legales = mentions_legales;

      // Contact
      if (email_contact !== undefined) updates.email_contact = email_contact;
      if (telephone_contact !== undefined) updates.telephone_contact = telephone_contact;
      if (adresse_contact !== undefined) updates.adresse_contact = adresse_contact;

      // Reseaux sociaux
      if (facebook_url !== undefined) updates.facebook_url = facebook_url;
      if (instagram_url !== undefined) updates.instagram_url = instagram_url;
      if (twitter_url !== undefined) updates.twitter_url = twitter_url;
      if (youtube_url !== undefined) updates.youtube_url = youtube_url;

      // Personnalisation
      if (couleur_primaire !== undefined) updates.couleur_primaire = couleur_primaire;
      if (couleur_secondaire !== undefined) updates.couleur_secondaire = couleur_secondaire;
      if (css_personnalise !== undefined) updates.css_personnalise = css_personnalise;

      // Maintenance
      if (mode_maintenance !== undefined) updates.mode_maintenance = mode_maintenance;
      if (message_maintenance !== undefined) updates.message_maintenance = message_maintenance;

      await parametres.update(updates);
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur updateParametres front:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres' });
  }
};

/**
 * Mettre a jour une section specifique des parametres
 */
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    const updates = req.body;

    let parametres = await ParametresFront.getParametres();

    // Valider la section
    const sectionsValides = ['identite', 'seo', 'modules', 'legal', 'contact', 'reseaux', 'personnalisation', 'maintenance'];
    if (!sectionsValides.includes(section)) {
      return res.status(400).json({ error: 'Section invalide' });
    }

    // Mapper les champs autorises par section
    const champsParSection = {
      identite: ['nom_site', 'logo_url', 'favicon_url'],
      seo: ['meta_description', 'meta_keywords', 'meta_author', 'og_image_url', 'google_analytics_id', 'google_site_verification', 'robots_txt'],
      modules: ['mode_fonctionnement', 'module_ludotheque', 'module_bibliotheque', 'module_inscriptions', 'module_reservations', 'module_paiement_en_ligne'],
      legal: ['cgv', 'cgu', 'politique_confidentialite', 'mentions_legales'],
      contact: ['email_contact', 'telephone_contact', 'adresse_contact'],
      reseaux: ['facebook_url', 'instagram_url', 'twitter_url', 'youtube_url'],
      personnalisation: ['couleur_primaire', 'couleur_secondaire', 'css_personnalise'],
      maintenance: ['mode_maintenance', 'message_maintenance']
    };

    // Filtrer les updates pour n'inclure que les champs de la section
    const champsAutorises = champsParSection[section];
    const updatesFiltered = {};
    for (const key of champsAutorises) {
      if (updates[key] !== undefined) {
        updatesFiltered[key] = updates[key];
      }
    }

    await parametres.update(updatesFiltered);

    res.json({
      message: `Section ${section} mise a jour avec succes`,
      parametres
    });
  } catch (error) {
    console.error('Erreur updateSection front:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la section' });
  }
};

/**
 * Upload du logo
 */
exports.uploadLogo = async (req, res) => {
  try {
    // TODO: Implementer l'upload de fichier avec multer
    // Pour l'instant, on accepte juste une URL
    const { logo_url, favicon_url } = req.body;

    let parametres = await ParametresFront.getParametres();

    const updates = {};
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (favicon_url !== undefined) updates.favicon_url = favicon_url;

    await parametres.update(updates);

    res.json({
      message: 'Logo mis a jour avec succes',
      logo_url: parametres.logo_url,
      favicon_url: parametres.favicon_url
    });
  } catch (error) {
    console.error('Erreur uploadLogo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du logo' });
  }
};
