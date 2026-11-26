import { sequelize } from '../models/index.js';

async function checkCollation() {
  const [results] = await sequelize.query('SHOW FULL COLUMNS FROM users WHERE Field = "username"');
  console.log('Username column details:', results);
  process.exit(0);
}

checkCollation().catch(e => { console.error(e); process.exit(1); });
