import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function updateDB() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk',
    port: process.env.MYSQL_PORT || 3306,
  });

  console.log('Connected to MySQL. Starting transaction...');
  await connection.beginTransaction();
  try {
    // 1. Audit logs
    const [resAudit] = await connection.query(
      "UPDATE audit_logs SET details = REPLACE(details, 'Podanur', 'Pothanur') WHERE details LIKE '%Podanur%'"
    );
    console.log('audit_logs updated rows:', resAudit.affectedRows);

    // 2. Constituencies paguthis JSON
    const [constRows] = await connection.query("SELECT id, paguthis FROM constituencies WHERE paguthis LIKE '%Podanur%'");
    for (const c of constRows) {
      let pags = typeof c.paguthis === 'string' ? JSON.parse(c.paguthis) : c.paguthis;
      if (Array.isArray(pags)) {
        pags = pags.map(p => p === 'Podanur' ? 'Pothanur' : p);
        await connection.query('UPDATE constituencies SET paguthis = ? WHERE id = ?', [JSON.stringify(pags), c.id]);
        console.log(`constituency id ${c.id} paguthis updated to:`, pags);
      }
    }

    // 3. Issues
    const [resIssuesPaguthi] = await connection.query(
      "UPDATE issues SET paguthi = 'Pothanur' WHERE paguthi = 'Podanur'"
    );
    console.log('issues paguthi updated rows:', resIssuesPaguthi.affectedRows);

    const [resIssuesLocation] = await connection.query(
      "UPDATE issues SET location = REPLACE(location, 'Podanur', 'Pothanur') WHERE location LIKE '%Podanur%'"
    );
    console.log('issues location updated rows:', resIssuesLocation.affectedRows);

    const [resIssuesTitle] = await connection.query(
      "UPDATE issues SET title = REPLACE(title, 'Podanur', 'Pothanur') WHERE title LIKE '%Podanur%'"
    );
    console.log('issues title updated rows:', resIssuesTitle.affectedRows);

    const [resIssuesDesc] = await connection.query(
      "UPDATE issues SET description = REPLACE(description, 'Podanur', 'Pothanur') WHERE description LIKE '%Podanur%'"
    );
    console.log('issues description updated rows:', resIssuesDesc.affectedRows);

    // 4. Users
    const [resUsersPaguthi] = await connection.query(
      "UPDATE users SET paguthi = 'Pothanur' WHERE paguthi = 'Podanur'"
    );
    console.log('users paguthi updated rows:', resUsersPaguthi.affectedRows);

    const [resUsersWard] = await connection.query(
      "UPDATE users SET assignedWard = REPLACE(assignedWard, 'Podanur', 'Pothanur') WHERE assignedWard LIKE '%Podanur%'"
    );
    console.log('users assignedWard updated rows:', resUsersWard.affectedRows);

    // 5. Wards
    const [resWardsPaguthi] = await connection.query(
      "UPDATE wards SET paguthi = 'Pothanur' WHERE paguthi = 'Podanur'"
    );
    console.log('wards paguthi updated rows:', resWardsPaguthi.affectedRows);

    const [resWardsName] = await connection.query(
      "UPDATE wards SET wardName = REPLACE(wardName, 'Podanur', 'Pothanur') WHERE wardName LIKE '%Podanur%'"
    );
    console.log('wards wardName updated rows:', resWardsName.affectedRows);

    await connection.commit();
    console.log('✅ Transaction COMMITTED successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Transaction ROLLED BACK due to error:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

updateDB()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
