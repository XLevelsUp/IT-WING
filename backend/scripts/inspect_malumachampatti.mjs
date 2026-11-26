import { sequelize, Ward, User, Issue } from '../models/index.js';
import { Op } from 'sequelize';

async function inspectMalumachampatti() {
  console.log('=== INSPECTING MYSQL DATA FOR MALUMACHAMPATTI & SEERAPALAYAM ===');

  const wards = await Ward.findAll({
    where: {
      [Op.or]: [
        { paguthi: { [Op.like]: '%malum%' } },
        { village: { [Op.like]: '%seera%' } },
        { village: { [Op.like]: '%malum%' } },
      ],
    },
  });
  console.log(`\nFound ${wards.length} wards:`);
  console.log(wards.map(w => ({
    id: w.id,
    wardNumber: w.wardNumber,
    wardName: w.wardName,
    paguthi: w.paguthi,
    village: w.village,
    zone: w.zone,
    constituencyId: w.constituencyId,
  })));

  const users = await User.findAll({
    where: {
      [Op.or]: [
        { paguthi: { [Op.like]: '%malum%' } },
        { village: { [Op.like]: '%seera%' } },
        { village: { [Op.like]: '%malum%' } },
      ],
    },
  });
  console.log(`\nFound ${users.length} users:`);
  console.log(users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    paguthi: u.paguthi,
    village: u.village,
    assignedWard: u.assignedWard,
    wardId: u.wardId,
  })));

  const issues = await Issue.findAll({
    where: {
      [Op.or]: [
        { paguthi: { [Op.like]: '%malum%' } },
        { village: { [Op.like]: '%seera%' } },
        { village: { [Op.like]: '%malum%' } },
      ],
    },
  });
  console.log(`\nFound ${issues.length} issues:`);
  console.log(issues.map(i => ({
    id: i.id,
    title: i.title,
    status: i.status,
    paguthi: i.paguthi,
    village: i.village,
    wardNumber: i.wardNumber,
    citizenName: i.citizenName,
  })));

  process.exit(0);
}

inspectMalumachampatti().catch(e => { console.error(e); process.exit(1); });
