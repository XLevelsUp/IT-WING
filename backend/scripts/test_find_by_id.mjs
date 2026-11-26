import { User } from '../models/index.js';

async function testFindById() {
  const u = await User.findById(26);
  console.log('User found by id:', u ? { id: u.id, username: u.username, role: u.role, isInstance: u instanceof User } : null);
  process.exit(0);
}

testFindById().catch(e => { console.error(e); process.exit(1); });
