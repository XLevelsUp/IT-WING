import { sequelize, Ward, Constituency, User, Issue } from '../models/index.js';
import { Op } from 'sequelize';

async function setup() {
  console.log('========================================================');
  console.log('🔄 INITIALIZING KINATHUKADAVU 3 PAGUTHIS & WARD ASSIGNMENTS');
  console.log('========================================================\n');

  // 1. Update Kinathukadavu in constituencies table
  const kinathu = await Constituency.findOne({ where: { id: 6 } });
  if (kinathu) {
    kinathu.paguthis = ['Pothanur', 'Kurichi', 'Sundarapuram'];
    kinathu.totalPaguthi = 3;
    kinathu.totalWards = 8;
    await kinathu.save();
    console.log('✅ Updated Kinathukadavu Constituency: exactly 3 Paguthis (Pothanur, Kurichi, Sundarapuram)');
  }

  // 2. Clear old/test Ward Secretary records from users table (Task 5)
  const deletedSecsCount = await User.destroy({
    where: {
      role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
    },
  });
  console.log(`✅ Cleared ${deletedSecsCount} old/test Ward Secretary accounts from users table.`);

  // Verify non-deleted user roles
  const remainingUsers = await User.findAll({ attributes: ['id', 'username', 'role'] });
  console.log('   Remaining users preserved:', remainingUsers.map(u => `@${u.username} (${u.role})`).join(', '));

  // 3. Set up Target Wards for Kinathukadavu (Constituency 6)
  // Target:
  // Pothanur: Ward 95, Ward 99, Ward 100
  // Kurichi: Ward 85, Ward 96, Ward 98
  // Sundarapuram: Ward 94, Ward 96

  // Reuse Ward 99 for Pothanur
  let p99 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 99 } });
  if (p99) {
    p99.paguthi = 'Pothanur';
    p99.wardName = 'Pothanur Junction';
    p99.tamilName = 'போத்தனூர் சந்திப்பு';
    p99.wardSecretary = null;
    p99.wardSecretaryId = null;
    p99.contactNumber = '';
    await p99.save();
  } else {
    p99 = await Ward.create({
      wardNumber: 99,
      wardName: 'Pothanur Junction',
      tamilName: 'போத்தனூர் சந்திப்பு',
      paguthi: 'Pothanur',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse or create Ward 95 for Pothanur
  let p95 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 95 } });
  if (p95) {
    p95.paguthi = 'Pothanur';
    p95.wardName = 'Pothanur Ward 95';
    p95.tamilName = 'போத்தனூர் வார்டு 95';
    p95.wardSecretary = null;
    p95.wardSecretaryId = null;
    p95.contactNumber = '';
    await p95.save();
  } else {
    p95 = await Ward.create({
      wardNumber: 95,
      wardName: 'Pothanur Ward 95',
      tamilName: 'போத்தனூர் வார்டு 95',
      paguthi: 'Pothanur',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse or create Ward 100 for Pothanur
  let p100 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 100, paguthi: 'Pothanur' } });
  if (!p100) {
    p100 = await Ward.create({
      wardNumber: 100,
      wardName: 'Pothanur Ward 100',
      tamilName: 'போத்தனூர் வார்டு 100',
      paguthi: 'Pothanur',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse Ward 98 for Kurichi
  let k98 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 98 } });
  if (k98) {
    k98.paguthi = 'Kurichi';
    k98.wardName = 'Kurichi Ward 98';
    k98.tamilName = 'குறிச்சி வார்டு 98';
    k98.wardSecretary = null;
    k98.wardSecretaryId = null;
    k98.contactNumber = '';
    await k98.save();
  } else {
    k98 = await Ward.create({
      wardNumber: 98,
      wardName: 'Kurichi Ward 98',
      tamilName: 'குறிச்சி வார்டு 98',
      paguthi: 'Kurichi',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse or create Ward 85 for Kurichi
  let k85 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 85, paguthi: 'Kurichi' } });
  if (!k85) {
    k85 = await Ward.create({
      wardNumber: 85,
      wardName: 'Kurichi Ward 85',
      tamilName: 'குறிச்சி வார்டு 85',
      paguthi: 'Kurichi',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse or create Ward 96 for Kurichi
  let k96 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 96, paguthi: 'Kurichi' } });
  if (!k96) {
    k96 = await Ward.create({
      wardNumber: 96,
      wardName: 'Kurichi Ward 96',
      tamilName: 'குறிச்சி வார்டு 96',
      paguthi: 'Kurichi',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse Ward 94 for Sundarapuram
  let s94 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 94 } });
  if (s94) {
    s94.paguthi = 'Sundarapuram';
    s94.wardName = 'Sundarapuram Ward 94';
    s94.tamilName = 'சுந்தராபுரம் வார்டு 94';
    s94.wardSecretary = null;
    s94.wardSecretaryId = null;
    s94.contactNumber = '';
    await s94.save();
  } else {
    s94 = await Ward.create({
      wardNumber: 94,
      wardName: 'Sundarapuram Ward 94',
      tamilName: 'சுந்தராபுரம் வார்டு 94',
      paguthi: 'Sundarapuram',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  // Reuse or create Ward 96 for Sundarapuram
  let s96 = await Ward.findOne({ where: { constituencyId: 6, wardNumber: 96, paguthi: 'Sundarapuram' } });
  if (!s96) {
    s96 = await Ward.create({
      wardNumber: 96,
      wardName: 'Sundarapuram Ward 96',
      tamilName: 'சுந்தராபுரம் வார்டு 96',
      paguthi: 'Sundarapuram',
      constituencyId: 6,
      zone: 'South Zone',
    });
  }

  const targetWardIds = [p95.id, p99.id, p100.id, k85.id, k96.id, k98.id, s94.id, s96.id];

  // Reassign complaints linked to other constituency 6 wards before removing unused wards
  await Issue.update({ wardId: p99.id }, { where: { paguthi: 'Pothanur', constituencyId: 6, wardId: { [Op.notIn]: targetWardIds } } });
  await Issue.update({ wardId: k98.id }, { where: { paguthi: 'Kurichi', constituencyId: 6, wardId: { [Op.notIn]: targetWardIds } } });
  await Issue.update({ wardId: s94.id }, { where: { paguthi: 'Sundarapuram', constituencyId: 6, wardId: { [Op.notIn]: targetWardIds } } });

  // Remove other obsolete/test wards in constituency 6
  const deletedOldWards = await Ward.destroy({
    where: {
      constituencyId: 6,
      id: { [Op.notIn]: targetWardIds },
    },
  });
  console.log(`✅ Cleaned up ${deletedOldWards} obsolete/test wards from constituency 6.`);

  // 4. Verify counts
  const pothanurWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Pothanur' } });
  const kurichiWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Kurichi' } });
  const sundarapuramWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Sundarapuram' } });

  console.log('\n📊 VERIFIED INITIAL WARD COUNTS:');
  console.log(`- Pothanur: ${pothanurWards.length} Wards (${pothanurWards.map(w => 'Ward ' + w.wardNumber).join(', ')})`);
  console.log(`- Kurichi: ${kurichiWards.length} Wards (${kurichiWards.map(w => 'Ward ' + w.wardNumber).join(', ')})`);
  console.log(`- Sundarapuram: ${sundarapuramWards.length} Wards (${sundarapuramWards.map(w => 'Ward ' + w.wardNumber).join(', ')})`);

  console.log('\n========================================================');
  console.log('🎉 SETUP COMPLETE!');
  console.log('========================================================\n');
}

setup().catch(console.error).finally(() => process.exit(0));
