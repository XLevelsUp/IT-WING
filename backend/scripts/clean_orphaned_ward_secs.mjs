import sequelize from '../config/mysql.js';

async function main() {
  try {
    await sequelize.query("UPDATE wards SET wardSecretaryId = NULL, wardSecretary = '' WHERE wardSecretaryId IS NOT NULL AND wardSecretaryId NOT IN (SELECT id FROM users)");
    console.log('Cleaned orphaned wardSecretaryId references in wards');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
