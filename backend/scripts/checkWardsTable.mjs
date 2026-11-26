import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MYSQL_HOST = '127.0.0.1';

const { default: sequelize } = await import('../config/mysql.js');
const { QueryTypes } = await import('sequelize');

async function checkWardsTable() {
  try {
    const wards = await sequelize.query(
      "SELECT id, wardNumber, wardName, paguthi, village, wardSecretary, wardSecretaryId, contactNumber FROM wards",
      { type: QueryTypes.SELECT }
    );
    console.table(wards);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkWardsTable();
