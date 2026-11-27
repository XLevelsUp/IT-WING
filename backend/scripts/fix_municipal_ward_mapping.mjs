// Corrects the municipal ward-to-Paguthi mapping. Safe to re-run; never deletes ward records.
//   Pothanur: 95, 99, 100   Kurichi: 85, 96, 98   Sundarapuram: 94, 97
// Usage (from backend/): node scripts/fix_municipal_ward_mapping.mjs

import sequelize from '../config/mysql.js';
import Ward from '../models/Ward.js';
import Constituency from '../models/Constituency.js';

const { Op } = sequelize.Sequelize;

const run = async () => {
  const kinathu = await Constituency.findOne({ where: { name: 'Kinathukadavu' } });
  if (!kinathu) throw new Error('Kinathukadavu constituency not found');

  await sequelize.transaction(async (transaction) => {
    // 1. Ward 95 -> Pothanur (was saved under Malumachampatti)
    const w95 = await Ward.findOne({ where: { wardNumber: 95, paguthi: { [Op.in]: ['Malumachampatti', 'Malumichampatti'] } }, transaction });
    if (w95) {
      await w95.update({ paguthi: 'Pothanur', wardName: 'Pothanur Ward 95', village: '', constituencyId: kinathu.id }, { transaction });
      console.log(`Ward 95 (id ${w95.id}) moved to Pothanur`);
    } else {
      console.log('Ward 95: nothing to move');
    }

    // 2. Ward 85 -> Kurichi (was saved under Ukkadam, Coimbatore South)
    const w85 = await Ward.findOne({ where: { wardNumber: 85, paguthi: { [Op.notIn]: ['Kurichi'] } }, transaction });
    if (w85) {
      await w85.update({ paguthi: 'Kurichi', village: '', constituencyId: kinathu.id }, { transaction });
      console.log(`Ward 85 (id ${w85.id}) moved to Kurichi`);
    } else {
      console.log('Ward 85: nothing to move');
    }

    // 3. Extra Ward 96 under Sundarapuram -> detached (kept, so linked citizens/complaints are not lost)
    const extra96 = await Ward.findAll({ where: { wardNumber: 96, paguthi: 'Sundarapuram' }, transaction });
    for (const w of extra96) {
      await w.update({ paguthi: '', wardName: 'Ward 96 (unmapped - pending review)' }, { transaction });
      console.log(`Extra Ward 96 (id ${w.id}) detached from Sundarapuram`);
    }
    if (!extra96.length) console.log('Extra Ward 96: nothing to detach');

    // 4. Ward 97 -> create under Sundarapuram if missing
    const [w97, created] = await Ward.findOrCreate({
      where: { wardNumber: 97, paguthi: 'Sundarapuram' },
      defaults: { wardName: 'Sundarapuram Ward 97', tamilName: 'சுந்தராபுரம் வார்டு 97', constituencyId: kinathu.id, zone: 'South Zone' },
      transaction,
    });
    console.log(created ? `Ward 97 created under Sundarapuram (id ${w97.id})` : 'Ward 97: already exists');
  });

  const rows = await Ward.findAll({
    where: { paguthi: { [Op.in]: ['Pothanur', 'Kurichi', 'Sundarapuram'] } },
    attributes: ['id', 'wardNumber', 'wardName', 'paguthi'],
    order: [['paguthi', 'ASC'], ['wardNumber', 'ASC']],
    raw: true,
  });
  console.log('\nResult:');
  console.table(rows);
};

try {
  await run();
} catch (err) {
  console.error('Failed (no changes saved):', err.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
