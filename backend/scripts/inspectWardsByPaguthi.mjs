import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MYSQL_HOST = '127.0.0.1';

const { default: sequelize } = await import('../config/mysql.js');
const { QueryTypes } = await import('sequelize');

async function inspectWards() {
  try {
    const wards = await sequelize.query(
      "SELECT paguthi, COUNT(*) as wardCount, GROUP_CONCAT(wardNumber ORDER BY wardNumber) as wardNumbers FROM wards GROUP BY paguthi",
      { type: QueryTypes.SELECT }
    );
    console.table(wards);

    const secByPaguthi = await sequelize.query(
      "SELECT paguthi, COUNT(*) as secCount, GROUP_CONCAT(username) as usernames FROM users WHERE role IN ('ward_secretary', 'ward', 'ward_officer') GROUP BY paguthi",
      { type: QueryTypes.SELECT }
    );
    console.table(secByPaguthi);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectWards();
