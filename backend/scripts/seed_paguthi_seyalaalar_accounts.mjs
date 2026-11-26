import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ACCOUNTS = [
  // 1. Thondamuthur Therkku Ondriyam
  {
    username: 'thondamuthurtherkku',
    password: 'thondamuthurtherkku@2026',
    paguthi: 'Thondamuthur Therkku Ondriyam',
    name: 'Thondamuthur Therkku Ondriyam Seyalaalar',
    phone: '9842100104',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 2. Thondamuthur Merkku Ondriyam
  {
    username: 'ThondamuthurMerkku',
    password: 'Merkkuondriyam@2026',
    paguthi: 'Thondamuthur Merkku Ondriyam',
    name: 'Thondamuthur Merkku Ondriyam Seyalaalar',
    phone: '9842100105',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 3. Madukkarai Therkku Ondriyam
  {
    username: 'MadukkaraiTherkku',
    password: 'MadukkaraiOndriyam@2026',
    paguthi: 'Madukkarai Therkku Ondriyam',
    name: 'Madukkarai Therkku Ondriyam Seyalaalar',
    phone: '9842100106',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 4. Madukkarai Merkku Ondriyam
  {
    username: 'MadukkaraiMerkkuOndriyam',
    password: 'MerkkuOndriyam@2026',
    paguthi: 'Madukkarai Merkku Ondriyam',
    name: 'Madukkarai Merkku Ondriyam Seyalaalar',
    phone: '9842100107',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 5. Madukkarai Nagaram
  {
    username: 'MadukkaraiNagaram',
    password: 'Nagaram@111222',
    paguthi: 'Madukkarai Nagaram',
    name: 'Madukkarai Nagaram Seyalaalar',
    phone: '9842100108',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 6. Vellalur Nagaram
  {
    username: 'VellalurNagaram',
    password: 'vellalurNagaram@12233',
    paguthi: 'Vellalur Nagaram',
    name: 'Vellalur Nagaram Seyalaalar',
    phone: '9842100109',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 7. Kinathukadavu Ondriyam
  {
    username: 'KinathukadavuOndriyam',
    password: 'KinathukadavuOndriyam@@2026',
    paguthi: 'Kinathukadavu Ondriyam',
    name: 'Kinathukadavu Ondriyam Seyalaalar',
    phone: '9842100110',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // 8. Malumachampatti
  {
    username: 'Malumachampatti',
    password: 'Malumachampatti@123123',
    paguthi: 'Malumachampatti',
    name: 'Malumachampatti Seyalaalar',
    phone: '9842100111',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  // Preserve existing 3 municipal paguthi accounts
  {
    username: 'pothanur',
    password: 'pothanur@2026',
    paguthi: 'Pothanur',
    name: 'Pothanur Paguthi Seyalaalar',
    phone: '9842100101',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  {
    username: 'kurichi',
    password: 'kurichi@2024',
    paguthi: 'Kurichi',
    name: 'Kurichi Paguthi Seyalaalar',
    phone: '9842100102',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
  {
    username: 'sundarapuram',
    password: 'sundarapurum@26',
    paguthi: 'Sundarapuram',
    name: 'Sundarapuram Paguthi Seyalaalar',
    phone: '9842100103',
    constituency: 'Kinathukadavu',
    role: 'paguthi_seyalaalar',
  },
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk_crm',
    port: process.env.MYSQL_PORT || 3306,
  });

  console.log('1. Modifying role column in users table if needed...');
  try {
    await connection.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('superadmin','district_admin','subadmin','ward_secretary','ward_officer','citizen','user','staff','paguthi_seyalaalar') DEFAULT 'citizen'"
    );
    console.log('✅ users table role column updated to include paguthi_seyalaalar');
  } catch (err) {
    console.log('Note on role column:', err.message);
  }

  console.log('2. Upserting Paguthi / Ondriyam / Nagaram accounts...');
  for (const acc of ACCOUNTS) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(acc.password, salt);
    const uid = crypto.randomBytes(12).toString('hex');
    const userEmail = `${acc.username.toLowerCase()}@tvk.org`;

    const [existing] = await connection.query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)',
      [acc.username]
    );

    if (existing.length > 0) {
      await connection.query(
        'UPDATE users SET username = ?, password = ?, role = ?, paguthi = ?, name = ?, constituency = ?, phone = ?, email = ?, isActive = 1 WHERE id = ?',
        [acc.username, hashedPassword, acc.role, acc.paguthi, acc.name, acc.constituency, acc.phone, userEmail, existing[0].id]
      );
      console.log(`✅ Updated account: ${acc.username} (Paguthi: ${acc.paguthi})`);
    } else {
      await connection.query(
        'INSERT INTO users (_id, username, email, password, role, paguthi, name, constituency, phone, assignedDistrict, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
        [uid, acc.username, userEmail, hashedPassword, acc.role, acc.paguthi, acc.name, acc.constituency, acc.phone, 'Coimbatore']
      );
      console.log(`✅ Created account: ${acc.username} (Paguthi: ${acc.paguthi})`);
    }
  }

  // Verify accounts in DB
  const [created] = await connection.query(
    "SELECT id, username, name, role, paguthi, phone FROM users WHERE role = 'paguthi_seyalaalar' ORDER BY id ASC"
  );
  console.log('\nVerified Paguthi / Ondriyam / Nagaram accounts in DB:');
  console.table(created);

  await connection.end();
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
