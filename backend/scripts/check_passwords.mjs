import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

const ACCOUNTS_TO_CHECK = [
  { username: 'admin', passwords: ['admin@123', 'admin123', 'password123'] },
  { username: 'subadmin', passwords: ['subadmin123', 'subadmin@123'] },
  { username: 'thondamuthurtherkku', passwords: ['thondamuthurtherkku@2026'] },
  { username: 'ThondamuthurMerkku', passwords: ['Merkkuondriyam@2026', 'merkkuondriyam@2026'] },
  { username: 'MadukkaraiTherkku', passwords: ['MadukkaraiOndriyam@2026', 'madukkaraiondriyam@2026'] },
  { username: 'MadukkaraiMerkkuOndriyam', passwords: ['MerkkuOndriyam@2026', 'merkkuondriyam@2026'] },
  { username: 'MadukkaraiNagaram', passwords: ['Nagaram@111222', 'nagaram@111222'] },
  { username: 'VellalurNagaram', passwords: ['vellalurNagaram@12233', 'vellalurnagaram@12233'] },
  { username: 'KinathukadavuOndriyam', passwords: ['KinathukadavuOndriyam@@2026', 'kinathukadavuondriyam@@2026'] },
  { username: 'Malumachampatti', passwords: ['Malumachampatti@123123', 'malumachampatti@123123'] },
  { username: 'pothanur', passwords: ['pothanur@2026', 'pothanur@2024', 'pothanur123'] },
  { username: 'kurichi', passwords: ['kurichi@2026', 'kurichi@2024', 'kurichi123'] },
  { username: 'sundarapuram', passwords: ['sundarapuram@2026', 'sundarapurum@26', 'sundarapuram123'] },
];

async function checkPasswords() {
  for (const item of ACCOUNTS_TO_CHECK) {
    const user = await User.findOne({ where: { username: item.username } });
    if (!user) {
      console.log(`❌ ${item.username}: USER NOT FOUND!`);
      continue;
    }
    let matched = null;
    for (const p of item.passwords) {
      if (await bcrypt.compare(p, user.password)) {
        matched = p;
        break;
      }
    }
    if (matched) {
      console.log(`✅ ${item.username}: Matched password "${matched}" (hash starts with ${user.password.substring(0, 10)})`);
    } else {
      console.log(`❌ ${item.username}: NONE of tested passwords matched! Hash is: ${user.password}`);
    }
  }
  process.exit(0);
}

checkPasswords().catch(e => { console.error(e); process.exit(1); });
