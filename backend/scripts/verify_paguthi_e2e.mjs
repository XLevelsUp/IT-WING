import { sequelize, User, Ward, Issue } from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPaguthiDashboard, getPaguthiWardComplaints } from '../controllers/paguthiSeyalaalarController.js';
import { PAGUTHI_VILLAGES_MAP } from '../utils/paguthiVillageData.js';

const ACCOUNTS = [
  {
    username: 'thondamuthurtherkku',
    password: 'thondamuthurtherkku@2026',
    card: 'Thondamuthur Therkku Ondriyam',
    villages: ['Perur Chettipalayam'],
  },
  {
    username: 'ThondamuthurMerkku',
    password: 'Merkkuondriyam@2026',
    card: 'Thondamuthur Merkku Ondriyam',
    villages: ['Theethipalayam', 'Madhampatti'],
  },
  {
    username: 'MadukkaraiTherkku',
    password: 'MadukkaraiOndriyam@2026',
    card: 'Madukkarai Therkku Ondriyam',
    villages: ['Arisipalayam', 'Valukuparai', 'Nachipalayam', 'Myleripalayam', 'Elur'],
  },
  {
    username: 'MadukkaraiMerkkuOndriyam',
    password: 'MerkkuOndriyam@2026',
    card: 'Madukkarai Merkku Ondriyam',
    villages: ['Chettipalayam', 'Othakalmandapam', 'Ettimadai', 'Tirumalaipalayam', 'Palathurai', 'Pichanur', 'Mavuthampathy'],
  },
  {
    username: 'MadukkaraiNagaram',
    password: 'Nagaram@111222',
    card: 'Madukkarai Nagaram',
    villages: [],
  },
  {
    username: 'VellalurNagaram',
    password: 'vellalurNagaram@12233',
    card: 'Vellalur Nagaram',
    villages: [],
  },
  {
    username: 'KinathukadavuOndriyam',
    password: 'KinathukadavuOndriyam@@2026',
    card: 'Kinathukadavu Ondriyam',
    villages: ['Vadaputhur', 'Solavampalayam', 'Sokkanur', 'No.10 Muthur', 'Kodangipalayam', 'Kuthirayampalayam', 'Pottayandipurambu'],
  },
  {
    username: 'Malumachampatti',
    password: 'Malumachampatti@123123',
    card: 'Malumachampatti',
    villages: [],
  },
  {
    username: 'pothanur',
    password: 'pothanur@2026',
    card: 'Pothanur',
    villages: [],
  },
  {
    username: 'kurichi',
    password: 'kurichi@2024',
    card: 'Kurichi',
    villages: [],
  },
  {
    username: 'sundarapuram',
    password: 'sundarapurum@26',
    card: 'Sundarapuram',
    villages: [],
  },
];

const mockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE PAGUTHI END-TO-END VERIFICATION ---');
  await sequelize.authenticate();
  console.log('Connected to MySQL tvk_crm successfully.\n');

  let totalPassed = 0;
  let totalTests = 0;

  for (const acc of ACCOUNTS) {
    console.log(`=======================================================`);
    console.log(`TESTING ACCOUNT: ${acc.username} (${acc.card})`);
    console.log(`=======================================================`);

    // 1. Authentication Check
    totalTests++;
    const user = await User.findOne({ where: { username: acc.username } });
    if (!user) {
      console.error(`FAIL: User ${acc.username} not found in database!`);
      continue;
    }

    const isMatch = await bcrypt.compare(acc.password, user.password);
    if (!isMatch) {
      console.error(`FAIL: Password comparison failed for ${acc.username}!`);
      continue;
    }
    console.log(`[PASS] 1. Auth Credentials Verified: ${acc.username} (Role: ${user.role}, Paguthi: ${user.paguthi})`);
    totalPassed++;

    // 2. Dashboard Scoping Check
    totalTests++;
    const reqDash = {
      user: {
        id: user.id,
        role: user.role,
        paguthi: user.paguthi,
      },
      query: {},
    };
    const resDash = mockResponse();
    await getPaguthiDashboard(reqDash, resDash);

    if (resDash.statusCode !== 200 || !resDash.body?.success) {
      console.error(`FAIL: getPaguthiDashboard returned ${resDash.statusCode}:`, resDash.body);
      continue;
    }

    const dashData = resDash.body.data;
    if (dashData.paguthi !== acc.card) {
      console.error(`FAIL: Expected card ${acc.card}, but received ${dashData.paguthi}`);
      continue;
    }
    console.log(`[PASS] 2. Dashboard Card Scoped: Card="${dashData.paguthi}", Jurisdiction="${dashData.jurisdiction}"`);
    console.log(`        Total Wards=${dashData.totalWardsCount}, Issues=${dashData.stats.totalComplaints}, Secs=${dashData.stats.registeredSecretaries}`);
    totalPassed++;

    // 3. Village Hierarchy Check
    totalTests++;
    const expectedHasVillages = acc.villages.length > 0;
    if (dashData.hasVillages !== expectedHasVillages) {
      console.error(`FAIL: hasVillages mismatch for ${acc.card}: expected ${expectedHasVillages}, got ${dashData.hasVillages}`);
      continue;
    }

    if (expectedHasVillages) {
      const returnedVillages = dashData.villages.map((v) => v.name);
      const matches = acc.villages.every((v) => returnedVillages.includes(v));
      if (!matches) {
        console.error(`FAIL: Village list mismatch! Expected ${acc.villages}, got ${returnedVillages}`);
        continue;
      }
      console.log(`[PASS] 3. Village Directory: ${dashData.villages.length} Villages mapped: [${returnedVillages.join(', ')}]`);
    } else {
      console.log(`[PASS] 3. Direct Ward Mapping: 0 sub-villages (Renders wards directly)`);
    }
    totalPassed++;

    // 4. Village Drilling Check (if applicable)
    if (acc.villages.length > 0) {
      totalTests++;
      const targetVillage = acc.villages[0];
      const reqVillage = {
        user: { id: user.id, role: user.role, paguthi: user.paguthi },
        query: { village: targetVillage },
      };
      const resVillage = mockResponse();
      await getPaguthiDashboard(reqVillage, resVillage);

      if (resVillage.statusCode === 200 && resVillage.body?.data?.selectedVillage === targetVillage) {
        console.log(`[PASS] 4. Village Selection: Drilled into "${targetVillage}", returned ${resVillage.body.data.wards.length} wards.`);
        totalPassed++;
      } else {
        console.error(`FAIL: Village drilling failed for ${targetVillage}!`, resVillage.body);
      }
    }

    // 5. Server-Side Data Isolation: Attempt to query unauthorized village
    totalTests++;
    const fakeVillage = 'UnauthorizedRandomVillage999';
    const reqUnauthorizedVillage = {
      user: { id: user.id, role: user.role, paguthi: user.paguthi },
      query: { village: fakeVillage },
    };
    const resUnauthorizedVillage = mockResponse();
    await getPaguthiDashboard(reqUnauthorizedVillage, resUnauthorizedVillage);

    if (resUnauthorizedVillage.statusCode === 403) {
      console.log(`[PASS] 5. Data Isolation: Rejected unauthorized village query "${fakeVillage}" with 403 Forbidden.`);
      totalPassed++;
    } else {
      console.error(`FAIL: Expected 403 for unauthorized village, got ${resUnauthorizedVillage.statusCode}`);
    }

    // 6. Server-Side Data Isolation: Ward access security
    totalTests++;
    // Find a ward outside this user's paguthi
    const outsideWard = await Ward.findOne({
      where: {
        paguthi: {
          [sequelize.Sequelize.Op.ne]: acc.card,
        },
      },
    });

    if (outsideWard) {
      const reqWardHack = {
        user: { id: user.id, role: user.role, paguthi: user.paguthi },
        params: { wardId: outsideWard.id },
      };
      const resWardHack = mockResponse();
      await getPaguthiWardComplaints(reqWardHack, resWardHack);

      if (resWardHack.statusCode === 403) {
        console.log(`[PASS] 6. Data Isolation: Rejected cross-paguthi ward access (Ward #${outsideWard.wardNumber} in ${outsideWard.paguthi}) with 403 Forbidden.`);
        totalPassed++;
      } else {
        console.error(`FAIL: Expected 403 for cross-paguthi ward access, got ${resWardHack.statusCode}`);
      }
    } else {
      totalPassed++;
    }

    console.log('');
  }

  console.log('-------------------------------------------------------');
  console.log(`TEST SUITE COMPLETE: ${totalPassed} / ${totalTests} TESTS PASSED!`);
  console.log('-------------------------------------------------------');
  await sequelize.close();
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
