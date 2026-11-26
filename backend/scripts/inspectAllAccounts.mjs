import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MYSQL_HOST = '127.0.0.1';

const { default: sequelize } = await import('../config/mysql.js');
const { QueryTypes } = await import('sequelize');

async function inspectDb() {
  try {
    console.log('--- ALL USERS WITH ROLE paguthi_seyalaalar ---');
    const paguthiUsers = await sequelize.query(
      "SELECT id, username, name, role, paguthi, village, assignedWard, isActive FROM users WHERE role = 'paguthi_seyalaalar'",
      { type: QueryTypes.SELECT }
    );
    console.table(paguthiUsers);

    console.log('\n--- ALL WARDS GROUPED BY PAGUTHI ---');
    const wards = await sequelize.query(
      "SELECT id, wardNumber, wardName, paguthi, village FROM wards ORDER BY paguthi, wardNumber",
      { type: QueryTypes.SELECT }
    );
    console.table(wards);

    console.log('\n--- ALL WARD SECRETARIES IN USERS TABLE ---');
    const secretaries = await sequelize.query(
      "SELECT id, username, name, role, paguthi, village, assignedWard, wardId, isActive FROM users WHERE role IN ('ward_secretary', 'ward', 'ward_officer')",
      { type: QueryTypes.SELECT }
    );
    console.table(secretaries);

    console.log('\n--- ALL COMPLAINTS (ISSUES) GROUPED BY PAGUTHI & STATUS ---');
    const issues = await sequelize.query(
      "SELECT id, issueCode, paguthi, village, wardNumber, status FROM issues ORDER BY paguthi, status",
      { type: QueryTypes.SELECT }
    );
    console.table(issues);

    console.log('\n--- DISTINCT STATUS VALUES IN ISSUES TABLE ---');
    const statuses = await sequelize.query(
      "SELECT DISTINCT status, count(*) as count FROM issues GROUP BY status",
      { type: QueryTypes.SELECT }
    );
    console.table(statuses);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspectDb();
