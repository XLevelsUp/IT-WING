import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk',
    port: process.env.MYSQL_PORT || 3306,
  });

  const [users] = await connection.query(
    "SELECT id, username, name, role, paguthi FROM users WHERE username IN ('pothanur', 'kurichi', 'sundarapuram')"
  );
  console.log('Found users:', users);

  const [allUsers] = await connection.query("SELECT id, username, role, paguthi FROM users");
  console.log('Total users in DB:', allUsers.length);
  console.log('Sample users:', allUsers.slice(0, 10));

  await connection.end();
}

check().catch(console.error);
