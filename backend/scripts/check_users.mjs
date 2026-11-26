import { User } from '../models/index.js';

async function checkUsers() {
  const users = await User.findAll({
    attributes: ['id', 'username', 'role', 'paguthi', 'phone', 'email', 'isActive'],
  });
  console.log(JSON.stringify(users.map(u => u.toJSON()), null, 2));
  process.exit(0);
}

checkUsers().catch(e => { console.error(e); process.exit(1); });
