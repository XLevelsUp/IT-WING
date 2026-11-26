import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== TVK CRM: PODANUR -> POTHANUR REPLACEMENT VALIDATION ===\n');

  // Test 1: Frontend code scan
  console.log('1. Checking Frontend Source Code:');
  const enTranslation = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../frontend/src/locales/en/translation.json'), 'utf8'));
  assert(
    enTranslation.district.cardSubtitle.includes('Pothanur') && !enTranslation.district.cardSubtitle.includes('Podanur'),
    'en/translation.json district.cardSubtitle has Pothanur and no Podanur'
  );

  const paguthiWardData = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/utils/paguthiWardData.js'), 'utf8');
  assert(paguthiWardData.includes("'Pothanur'"), 'paguthiWardData.js contains Pothanur in PAGUTHI_OPTIONS');
  assert(paguthiWardData.includes('paguthi === \'Pothanur\''), 'paguthiWardData.js checks for Pothanur');

  const constituencyDetail = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/district/ConstituencyDetailPage.jsx'), 'utf8');
  assert(constituencyDetail.includes("'Pothanur'"), 'ConstituencyDetailPage.jsx contains Pothanur in KINATHUKADAVU_LOCAL_BODIES');

  const districtPage = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/district/DistrictPage.jsx'), 'utf8');
  assert(districtPage.includes('Pothanur') && !districtPage.includes('Podanur'), 'DistrictPage.jsx fallback text has Pothanur and no Podanur');

  const paguthiDetail = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/district/PaguthiDetailPage.jsx'), 'utf8');
  assert(paguthiDetail.includes('placeholder="e.g. Pothanur West"'), 'PaguthiDetailPage.jsx has placeholder "e.g. Pothanur West"');

  const wardDetail = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/district/WardDetailPage.jsx'), 'utf8');
  assert(wardDetail.includes("ward.paguthi || 'Pothanur'"), 'WardDetailPage.jsx defaults to Pothanur');

  // Test 2: Backend code scan
  console.log('\n2. Checking Backend Source Code:');
  const districtController = fs.readFileSync(path.resolve(__dirname, '../controllers/districtController.js'), 'utf8');
  assert(districtController.includes("'Pothanur'"), 'districtController.js contains Pothanur in KINATHUKADAVU_LOCAL_BODIES');

  const seedMySQL = fs.readFileSync(path.resolve(__dirname, '../seeds/seedMySQL.js'), 'utf8');
  assert(seedMySQL.includes("'Pothanur'"), 'seedMySQL.js contains Pothanur');
  assert(!seedMySQL.includes("'Podanur'"), 'seedMySQL.js has no Podanur');

  // Test 3: Database Verification
  console.log('\n3. Checking MySQL Database Records:');
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk',
    port: process.env.MYSQL_PORT || 3306,
  });

  // Verify no Podanur remains in DB
  const [tables] = await connection.query('SHOW TABLES');
  let remainingPodanur = 0;
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await connection.query('DESCRIBE `' + tableName + '`');
    for (const c of cols) {
      if (c.Type.includes('char') || c.Type.includes('text') || c.Type.includes('varchar') || c.Type.includes('json')) {
        try {
          const [rows] = await connection.query('SELECT `' + c.Field + '` FROM `' + tableName + '` WHERE LOWER(`' + c.Field + '`) LIKE ?', ['%podanur%']);
          if (rows.length > 0) remainingPodanur += rows.length;
        } catch (e) {}
      }
    }
  }
  assert(remainingPodanur === 0, `Database has 0 remaining Podanur occurrences (found: ${remainingPodanur})`);

  // Verify Wards
  const [wards] = await connection.query("SELECT id, wardNumber, wardName, paguthi FROM wards WHERE paguthi = 'Pothanur' OR wardName LIKE '%Pothanur%'");
  assert(wards.length === 4, `Found 4 Pothanur wards in database (found: ${wards.length})`);
  wards.forEach((w) => {
    assert(w.paguthi === 'Pothanur', `Ward ID ${w.id} (${w.wardName}) has paguthi = Pothanur`);
    assert(w.wardName.includes('Pothanur'), `Ward ID ${w.id} wardName (${w.wardName}) includes Pothanur`);
  });

  // Verify Constituency Paguthis array
  const [constituencyRows] = await connection.query("SELECT id, name, paguthis FROM constituencies WHERE id = 6");
  const cPags = typeof constituencyRows[0].paguthis === 'string' ? JSON.parse(constituencyRows[0].paguthis) : constituencyRows[0].paguthis;
  assert(cPags.includes('Pothanur'), `Constituency ID 6 paguthis contains Pothanur: ${JSON.stringify(cPags)}`);
  assert(!cPags.includes('Podanur'), `Constituency ID 6 paguthis does not contain Podanur`);

  // Verify Ward Secretary user
  const [users] = await connection.query("SELECT id, username, role, paguthi, assignedWard FROM users WHERE username = 'ward1'");
  assert(users.length > 0, 'Found user ward1');
  if (users.length > 0) {
    assert(users[0].paguthi === 'Pothanur', `User ward1 has paguthi = Pothanur (got: ${users[0].paguthi})`);
    assert(users[0].assignedWard.includes('Pothanur'), `User ward1 assignedWard includes Pothanur (got: ${users[0].assignedWard})`);
  }

  // Verify Issues
  const [issues] = await connection.query("SELECT id, issueCode, paguthi FROM issues WHERE paguthi = 'Pothanur'");
  assert(issues.length >= 1, `Found ${issues.length} issue(s) with paguthi = Pothanur`);

  await connection.end();

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
