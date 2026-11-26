import { Ward } from '../models/index.js';

async function checkAllWards() {
  const wards = await Ward.findAll({
    attributes: ['id', 'wardNumber', 'wardName', 'paguthi', 'village', 'constituencyId'],
    order: [['id', 'ASC']],
  });
  console.log(`Total wards in DB: ${wards.length}`);
  console.log(JSON.stringify(wards.map(w => w.toJSON()), null, 2));
  process.exit(0);
}

checkAllWards().catch(e => { console.error(e); process.exit(1); });
