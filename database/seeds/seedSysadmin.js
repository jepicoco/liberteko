const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Utilisateur } = require('../../backend/models');

async function seedSysadmin() {
  try {
    console.log('🔄 Création du compte sysadmin...');

    // Vérifier si le sysadmin existe déjà
    const existing = await Utilisateur.findOne({ where: { email: 'sysadmin@liberteko.fr' } });

    if (existing) {
      console.log('ℹ️  Le compte sysadmin existe déjà');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Code barre: ${existing.code_barre}`);
      console.log(`   Rôle: ${existing.role}`);
      process.exit(0);
    }

    // Créer le sysadmin
    const sysadmin = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'System',
      email: 'sysadmin@liberteko.fr',
      password: 'rootroot',
      role: 'administrateur',
      statut: 'actif',
      date_adhesion: new Date(),
      code_barre: 'ADHXXXXXXXX',
      notes: 'Compte administrateur système'
    });

    // Forcer le code_barre car le hook afterCreate le remplace
    await sysadmin.update({ code_barre: 'ADHXXXXXXXX' }, { hooks: false });

    console.log('✅ Compte sysadmin créé avec succès !');
    console.log('');
    console.log('   ID:', sysadmin.id);
    console.log('   Code barre:', sysadmin.code_barre);
    console.log('   Email:', sysadmin.email);
    console.log('   Rôle:', sysadmin.role);
    console.log('   Mot de passe: rootroot');
    console.log('');
    console.log('⚠️  Pensez à changer le mot de passe en production !');

  } catch (error) {
    console.error('❌ Erreur lors de la création du sysadmin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedSysadmin();
