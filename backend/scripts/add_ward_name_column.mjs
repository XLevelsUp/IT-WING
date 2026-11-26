import sequelize from '../config/mysql.js';

async function main() {
  try {
    const [cols] = await sequelize.query('SHOW COLUMNS FROM issues LIKE "wardName"');
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE issues ADD COLUMN wardName VARCHAR(150) DEFAULT '' AFTER wardNumber");
      console.log('Successfully added wardName column to issues table');
    } else {
      console.log('wardName column already exists in issues table');
    }
  } catch (err) {
    console.error('Error adding wardName column:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
