import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

async function updatePasswords() {
  const salt = await bcrypt.genSalt(10);
  
  const kurichiUser = await User.findOne({ where: { username: 'kurichi' } });
  if (kurichiUser) {
    kurichiUser.password = await bcrypt.hash('kurichi@2026', salt);
    await kurichiUser.save();
    console.log('Updated kurichi password to kurichi@2026 in MySQL.');
  }

  const sundarUser = await User.findOne({ where: { username: 'sundarapuram' } });
  if (sundarUser) {
    sundarUser.password = await bcrypt.hash('sundarapuram@2026', salt);
    await sundarUser.save();
    console.log('Updated sundarapuram password to sundarapuram@2026 in MySQL.');
  }

  process.exit(0);
}

updatePasswords().catch(e => { console.error(e); process.exit(1); });
