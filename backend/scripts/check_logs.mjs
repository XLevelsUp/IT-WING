import { sequelize } from '../models/index.js';

async function checkRecentLogs() {
  const [logs] = await sequelize.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20');
  console.log('Recent audit logs:', logs);
  process.exit(0);
}

checkRecentLogs().catch(e => { console.error(e); process.exit(1); });
