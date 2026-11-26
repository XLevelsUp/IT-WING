import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function inspectData() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk',
    port: process.env.MYSQL_PORT || 3306,
  });

  const paguthis = ['Pothanur', 'Kurichi', 'Sundarapuram'];

  for (const p of paguthis) {
    console.log(`\n=================== PAGUTHI: ${p} ===================`);
    const [wards] = await connection.query(
      "SELECT id, wardNumber, wardName, paguthi, officeBearer, wardSecretary, contactNumber, constituencyId FROM wards WHERE paguthi = ? ORDER BY wardNumber ASC",
      [p]
    );
    console.log(`Total Wards: ${wards.length}`);
    wards.forEach(w => {
      console.log(`  Ward ${w.wardNumber}: "${w.wardName}" | Secretary: "${w.wardSecretary || w.officeBearer || 'Not Assigned'}" | Phone: "${w.contactNumber || 'None'}"`);
    });

    const [secs] = await connection.query(
      "SELECT id, username, name, phone, paguthi, assignedWard FROM users WHERE role = 'ward_secretary' AND paguthi = ?",
      [p]
    );
    console.log(`Registered Ward Secretaries in users table: ${secs.length}`);
    secs.forEach(s => {
      console.log(`  User: ${s.username} (${s.name}) | Ward: ${s.assignedWard} | Phone: ${s.phone}`);
    });

    const [issues] = await connection.query(
      "SELECT id, issueCode, title, category, status, wardNumber, paguthi FROM issues WHERE paguthi = ?",
      [p]
    );
    console.log(`Total Complaints: ${issues.length}`);
    issues.forEach(i => {
      console.log(`  Issue [${i.issueCode}] Ward ${i.wardNumber}: "${i.title}" | Status: ${i.status}`);
    });
  }

  await connection.end();
}

inspectData().catch(console.error);
