import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MYSQL_HOST = '127.0.0.1';

const { default: sequelize } = await import('../config/mysql.js');
const { QueryTypes } = await import('sequelize');
const { normalizePaguthiName, getCanonicalTargetPaguthis, getVillagesForPaguthi } = await import('../utils/paguthiVillageData.js');

const PAGUTHI_ACCOUNTS = [
  'Thondamuthur Therkku Ondriyam',
  'Thondamuthur Merkku Ondriyam',
  'Madukkarai Therkku Ondriyam',
  'Madukkarai Merkku Ondriyam',
  'Madukkarai Nagaram',
  'Vellalur Nagaram',
  'Kinathukadavu Ondriyam',
  'Malumachampatti',
  'Pothanur',
  'Kurichi',
  'Sundarapuram',
];

async function testStatsCalculation() {
  console.log('Testing Dynamic DB Stats for all 11 Paguthis:\n');

  for (const p of PAGUTHI_ACCOUNTS) {
    const canonical = normalizePaguthiName(p) || p;
    const filter = getCanonicalTargetPaguthis(canonical);
    const villages = getVillagesForPaguthi(canonical) || [];

    // 1. Wards for this paguthi
    const wards = await sequelize.query(
      "SELECT id, wardNumber, wardName, paguthi, village, wardSecretary, wardSecretaryId, contactNumber FROM wards WHERE paguthi IN (:filter) ORDER BY wardNumber",
      { replacements: { filter }, type: QueryTypes.SELECT }
    );
    const wardIds = wards.map((w) => w.id);
    const wardSecretaryIds = wards.map((w) => w.wardSecretaryId).filter(Boolean);

    // 2. Registered Secretaries
    // User where role IN ('ward_secretary', 'ward', 'ward_officer') AND isActive = 1
    // AND (paguthi IN (:filter) OR wardId IN (:wardIds) OR id IN (:secIds))
    let secQuery = `
      SELECT id, username, name, paguthi, village, assignedWard, wardId 
      FROM users 
      WHERE role IN ('ward_secretary', 'ward', 'ward_officer') AND isActive = 1
        AND (
          paguthi IN (:filter)
          ${wardIds.length > 0 ? 'OR wardId IN (:wardIds)' : ''}
          ${wardSecretaryIds.length > 0 ? 'OR id IN (:wardSecretaryIds)' : ''}
        )
    `;
    const secretaries = await sequelize.query(secQuery, {
      replacements: { filter, wardIds: wardIds.length ? wardIds : [-1], wardSecretaryIds: wardSecretaryIds.length ? wardSecretaryIds : [-1] },
      type: QueryTypes.SELECT,
    });

    // 3. Complaints
    // Issue where paguthi IN (:filter) OR (wardId IN (:wardIds))
    let issueQuery = `
      SELECT id, issueCode, paguthi, village, wardNumber, status
      FROM issues
      WHERE paguthi IN (:filter) ${wardIds.length > 0 ? 'OR wardId IN (:wardIds)' : ''}
    `;
    const issues = await sequelize.query(issueQuery, {
      replacements: { filter, wardIds: wardIds.length ? wardIds : [-1] },
      type: QueryTypes.SELECT,
    });

    const totalIssues = issues.length;
    const pending = issues.filter((i) => ['New', 'Pending', 'Assigned', 'Under Review'].includes(i.status)).length;
    const inProgress = issues.filter((i) => i.status === 'In Progress').length;
    const resolved = issues.filter((i) => ['Completed', 'Resolved', 'Closed'].includes(i.status)).length;

    console.log(`=== ${canonical} ===`);
    console.log(`  Villages (${villages.length}): ${villages.join(', ') || 'None (Municipal/Nagaram)'}`);
    console.log(`  Wards (${wards.length}): ${wards.map((w) => `W${w.wardNumber} (id:${w.id})`).join(', ') || '0 wards'}`);
    console.log(`  Secretaries (${secretaries.length}): ${secretaries.map((s) => `${s.username} (id:${s.id})`).join(', ') || '0 secretaries'}`);
    console.log(`  Issues Total: ${totalIssues} | Pending: ${pending} | InProgress: ${inProgress} | Resolved: ${resolved}`);
    console.log('');
  }

  process.exit(0);
}

testStatsCalculation();
