// One-off, idempotent fix: Sundarapuram's wards are 94 and 97 (not 96 — Ward 96 belongs to Kurichi).
// Renumbers any "Sundarapuram Ward 96" row to 97 and moves its complaints / ward secretary references.
// Usage: node scripts/fix_sundarapuram_ward_97.mjs
import { Ward, User, Issue } from '../models/index.js';
import { Op } from 'sequelize';

async function fix() {
  const legacy = await Ward.findAll({ where: { paguthi: 'Sundarapuram', wardNumber: 96 } });
  let s97 = await Ward.findOne({ where: { paguthi: 'Sundarapuram', wardNumber: 97 } });

  for (const w of legacy) {
    if (!s97) {
      w.wardNumber = 97;
      w.wardName = 'Sundarapuram Ward 97';
      w.tamilName = 'சுந்தராபுரம் வார்டு 97';
      await w.save();
      s97 = w;
      console.log(`✅ Renumbered ward id=${w.id} (Sundarapuram Ward 96) → Ward 97`);
    } else {
      // A Ward 97 row already exists: re-point anything on the stale 96 row, then remove it
      await Issue.update({ wardId: s97.id }, { where: { wardId: w.id } });
      await User.update({ wardId: s97.id }, { where: { wardId: w.id } });
      await w.destroy();
      console.log(`✅ Merged stale ward id=${w.id} (Sundarapuram Ward 96) into Ward 97 id=${s97.id}`);
    }
  }

  if (!s97) {
    s97 = await Ward.create({
      wardNumber: 97,
      wardName: 'Sundarapuram Ward 97',
      tamilName: 'சுந்தராபுரம் வார்டு 97',
      paguthi: 'Sundarapuram',
      constituencyId: 6,
      zone: 'South Zone',
    });
    console.log(`✅ Created Sundarapuram Ward 97 (id=${s97.id})`);
  }

  const [issuesMoved] = await Issue.update(
    { wardNumber: '97', wardId: s97.id },
    { where: { paguthi: 'Sundarapuram', wardNumber: { [Op.in]: ['96', 'Ward 96'] } } }
  );
  console.log(`✅ Moved ${issuesMoved} Sundarapuram complaint(s) from Ward 96 → Ward 97`);

  const secs = await User.findAll({
    where: { paguthi: 'Sundarapuram', assignedWard: { [Op.like]: '%96%' } },
  });
  for (const u of secs) {
    u.assignedWard = String(u.assignedWard).replace(/\b96\b/, '97');
    u.wardId = s97.id;
    await u.save();
    console.log(`✅ Updated @${u.username} assignedWard → "${u.assignedWard}"`);
  }

  const final = await Ward.findAll({ where: { paguthi: 'Sundarapuram' }, order: [['wardNumber', 'ASC']] });
  console.log(`\nSundarapuram wards now: ${final.map((w) => w.wardNumber).join(', ')}`);
}

fix().catch(console.error).finally(() => process.exit(0));
