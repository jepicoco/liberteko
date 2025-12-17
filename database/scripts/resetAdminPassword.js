/**
 * Script to reset admin password
 * Usage: node database/scripts/resetAdminPassword.js [email] [newPassword]
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize } = require('../../backend/models');

async function resetPassword() {
  const email = process.argv[2] || 'sysadmin@liberteko.fr';
  const newPassword = process.argv[3] || 'admin123';

  console.log(`Resetting password for: ${email}`);
  console.log(`New password: ${newPassword}`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user
    const [result] = await sequelize.query(`
      UPDATE utilisateurs
      SET password = :password
      WHERE email = :email
    `, {
      replacements: { password: hashedPassword, email }
    });

    console.log('Password reset successfully!');
    console.log(`You can now login with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
