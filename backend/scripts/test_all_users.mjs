import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

async function testAllUsersInDb() {
  const users = await User.findAll({ attributes: ['id', 'username', 'role', 'password'] });
  console.log(`Found ${users.length} users in database:`);
  for (const u of users) {
    console.log(`- ID: ${u.id}, Username: "${u.username}", Role: "${u.role}", Hash starts with: ${u.password.substring(0, 15)}`);
  }
  process.exit(0);
}

testAllUsersInDb().catch(e => { console.error(e); process.exit(1); });
