import { sequelize, Ward, Constituency, User, Issue } from '../models/index.js';
import { Op } from 'sequelize';

const API_BASE = 'http://localhost:5000/api';

async function postJson(url, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
}

async function getJson(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  return res.json();
}

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 TVK CRM – VERIFICATION OF 3 PAGUTHIS, WARDS & RESET SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Admin Login
    const adminLogin = await postJson(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin@123',
      role: 'admin',
    });
    const adminToken = adminLogin.data?.token || adminLogin.token;
    assert(adminLogin.success && adminToken, 'Admin authentication successful');

    // 2. Task 1: Check Kinathukadavu Paguthis in Admin Endpoint
    const kRes = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    assert(kRes.success, 'Fetched Kinathukadavu Constituency');
    const cData = kRes.data;
    const paguthis = cData.paguthis;

    console.log(`\n📋 Kinathukadavu Paguthis (${paguthis.length}):`);
    paguthis.forEach((p) => {
      console.log(`   - ${p.name}: ${p.totalWards} Wards`);
    });

    assert(paguthis.length === 3, `Exactly 3 Paguthi cards appear under Kinathukadavu (got: ${paguthis.length})`);
    const paguthiNames = paguthis.map((p) => p.name);
    assert(
      paguthiNames.includes('Pothanur') && paguthiNames.includes('Kurichi') && paguthiNames.includes('Sundarapuram'),
      'The three Paguthis are strictly Pothanur, Kurichi, and Sundarapuram'
    );
    assert(!paguthiNames.includes('Malumichampatti'), 'Malumichampatti is not present under Kinathukadavu');

    // 3. Task 2 & 3: Initial Ward counts and ward numbers
    const pothanurCard = paguthis.find((p) => p.name === 'Pothanur');
    const kurichiCard = paguthis.find((p) => p.name === 'Kurichi');
    const sundarapuramCard = paguthis.find((p) => p.name === 'Sundarapuram');

    assert(pothanurCard?.totalWards === 3, `Pothanur initial Ward count is 3 (got: ${pothanurCard?.totalWards})`);
    assert(kurichiCard?.totalWards === 3, `Kurichi initial Ward count is 3 (got: ${kurichiCard?.totalWards})`);
    assert(sundarapuramCard?.totalWards === 2, `Sundarapuram initial Ward count is 2 (got: ${sundarapuramCard?.totalWards})`);

    // Verify actual wards in MySQL
    const pWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Pothanur' }, order: [['wardNumber', 'ASC']] });
    const kWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Kurichi' }, order: [['wardNumber', 'ASC']] });
    const sWards = await Ward.findAll({ where: { constituencyId: 6, paguthi: 'Sundarapuram' }, order: [['wardNumber', 'ASC']] });

    const pWardNums = pWards.map((w) => w.wardNumber);
    const kWardNums = kWards.map((w) => w.wardNumber);
    const sWardNums = sWards.map((w) => w.wardNumber);

    assert(
      JSON.stringify(pWardNums) === JSON.stringify([95, 99, 100]),
      `Pothanur wards are [95, 99, 100] (got: [${pWardNums.join(', ')}])`
    );
    assert(
      JSON.stringify(kWardNums) === JSON.stringify([85, 96, 98]),
      `Kurichi wards are [85, 96, 98] (got: [${kWardNums.join(', ')}])`
    );
    assert(
      JSON.stringify(sWardNums) === JSON.stringify([94, 96]),
      `Sundarapuram wards are [94, 96] (got: [${sWardNums.join(', ')}])`
    );

    // 4. Task 5: Verify Right-Side Registration Table is Empty Initially
    const secListRes = await getJson(`${API_BASE}/settings/ward-secretaries`, adminToken);
    assert(secListRes.success, 'Fetched Ward Secretaries list');
    assert(
      Array.isArray(secListRes.data) && secListRes.data.length === 0,
      `Right-side Ward Secretary registration table contains 0 records (empty state, got: ${secListRes.data?.length})`
    );

    // 5. Task 4: Register a Secretary for an EXISTING Ward (e.g. Ward 95 in Pothanur)
    console.log('\n📝 Testing Ward Secretary Registration for EXISTING Ward 95 in Pothanur...');
    const regRes1 = await postJson(
      `${API_BASE}/settings/ward-secretaries`,
      {
        name: 'K. R. Vijayakumar',
        phone: '9842100095',
        age: 35,
        paguthi: 'Pothanur',
        wardNumber: '95',
        assignedWard: 'Ward 95',
        username: 'pothanur_sec95',
        password: 'password123',
        confirmPassword: 'password123',
      },
      adminToken
    );
    assert(regRes1.success, `Registration succeeded for pothanur_sec95: ${regRes1.message || 'OK'}`);

    // Check that right-side table now has exactly 1 record
    const secListAfterReg = await getJson(`${API_BASE}/settings/ward-secretaries`, adminToken);
    assert(secListAfterReg.data.length === 1, `Right-side table now shows 1 newly registered Secretary (got: ${secListAfterReg.data.length})`);
    assert(secListAfterReg.data[0].username === 'pothanur_sec95', 'Secretary username in table matches @pothanur_sec95');

    // IMPORTANT COUNT LOGIC: Registering a Secretary for an EXISTING Ward must NOT increase Ward count!
    const kResAfterReg = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    const pothanurAfterReg = kResAfterReg.data.paguthis.find((p) => p.name === 'Pothanur');
    assert(
      pothanurAfterReg?.totalWards === 3,
      `Pothanur Ward count remained exactly 3 after registering existing Ward 95 (got: ${pothanurAfterReg?.totalWards})`
    );

    // 6. Test Duplicate Registration Prevention for the same active Ward
    console.log('\n🚫 Testing Duplicate Active Secretary Prevention for Ward 95...');
    const dupRes = await postJson(
      `${API_BASE}/settings/ward-secretaries`,
      {
        name: 'Another Secretary',
        phone: '9842100096',
        age: 40,
        paguthi: 'Pothanur',
        wardNumber: '95',
        assignedWard: 'Ward 95',
        username: 'another_sec95',
        password: 'password123',
        confirmPassword: 'password123',
      },
      adminToken
    );
    assert(!dupRes.success, `Duplicate active secretary for Ward 95 correctly blocked: "${dupRes.message}"`);

    // Verify no duplicate ward was created in DB
    const wards95Count = await Ward.count({ where: { constituencyId: 6, paguthi: 'Pothanur', wardNumber: 95 } });
    assert(wards95Count === 1, `Ward 95 count in Pothanur remains exactly 1 (no duplicates)`);

    // 7. Task 4: Adding a GENUINELY NEW Ward increases ONLY that Paguthi's count
    console.log('\n⚡ Testing Addition of a Genuinely NEW Ward (Ward 777 in Kurichi)...');
    const newWardReg = await postJson(
      `${API_BASE}/settings/ward-secretaries`,
      {
        name: 'New Kurichi Cadre',
        phone: '9842100777',
        age: 30,
        paguthi: 'Kurichi',
        wardNumber: '777',
        assignedWard: 'Ward 777',
        username: 'kurichi_sec777',
        password: 'password123',
        confirmPassword: 'password123',
      },
      adminToken
    );
    assert(newWardReg.success, 'Registered secretary for genuinely new Ward 777');

    const kResAfterNewWard = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    const kurichiAfterNewWard = kResAfterNewWard.data.paguthis.find((p) => p.name === 'Kurichi');
    const pothanurAfterNewWard = kResAfterNewWard.data.paguthis.find((p) => p.name === 'Pothanur');
    const sundarAfterNewWard = kResAfterNewWard.data.paguthis.find((p) => p.name === 'Sundarapuram');

    assert(kurichiAfterNewWard?.totalWards === 4, `Kurichi dynamically increased from 3 to 4 wards (got: ${kurichiAfterNewWard?.totalWards})`);
    assert(pothanurAfterNewWard?.totalWards === 3, 'Pothanur remained unchanged at 3 wards');
    assert(sundarAfterNewWard?.totalWards === 2, 'Sundarapuram remained unchanged at 2 wards');

    // Clean up test new ward 777 and user
    await Ward.destroy({ where: { constituencyId: 6, paguthi: 'Kurichi', wardNumber: 777 } });
    await User.destroy({ where: { username: 'kurichi_sec777' } });
    console.log('   Cleaned up test new Ward 777 and user');

    // Clean up pothanur_sec95 user so table can be reset or verified
    await User.destroy({ where: { username: 'pothanur_sec95' } });
    const p95Ward = await Ward.findOne({ where: { constituencyId: 6, paguthi: 'Pothanur', wardNumber: 95 } });
    if (p95Ward) {
      p95Ward.wardSecretary = null;
      p95Ward.wardSecretaryId = null;
      p95Ward.contactNumber = '';
      await p95Ward.save();
    }
    console.log('   Reset Ward 95 secretary assignment');

    // 8. Task 6: Verify Paguthi Seyalaalar Dashboards use identical Ward master records
    console.log('\n🔐 Testing Paguthi Seyalaalar Dashboards (3 predefined accounts)...');
    const paguthiAccounts = [
      { username: 'pothanur', password: 'pothanur@2026', paguthi: 'Pothanur', expectedWards: 3, expectedWardNums: [95, 99, 100] },
      { username: 'kurichi', password: 'kurichi@2024', paguthi: 'Kurichi', expectedWards: 3, expectedWardNums: [85, 96, 98] },
      { username: 'sundarapuram', password: 'sundarapurum@26', paguthi: 'Sundarapuram', expectedWards: 2, expectedWardNums: [94, 96] },
    ];

    for (const pa of paguthiAccounts) {
      const lRes = await postJson(`${API_BASE}/auth/login`, {
        username: pa.username,
        password: pa.password,
        role: 'paguthi_seyalaalar',
      });
      const token = lRes.data?.token || lRes.token;
      assert(lRes.success && token, `Paguthi Seyalaalar @${pa.username} logged in successfully`);

      const dRes = await getJson(`${API_BASE}/paguthi-seyalaalar/dashboard`, token);
      assert(dRes.success, `Dashboard fetched for ${pa.username}`);
      assert(dRes.data.paguthi === pa.paguthi, `Dashboard paguthi matches ${pa.paguthi}`);
      assert(dRes.data.stats.totalWards === pa.expectedWards, `${pa.paguthi} totalWards is ${pa.expectedWards} (got: ${dRes.data.stats.totalWards})`);
      assert(dRes.data.wards.length === pa.expectedWards, `${pa.paguthi} wards list length is ${pa.expectedWards} (got: ${dRes.data.wards.length})`);

      const returnedNums = dRes.data.wards.map((w) => w.wardNumber).sort((a, b) => a - b);
      assert(
        JSON.stringify(returnedNums) === JSON.stringify(pa.expectedWardNums),
        `${pa.paguthi} dashboard returns wards [${pa.expectedWardNums.join(', ')}] (got: [${returnedNums.join(', ')}])`
      );
    }

    // 9. Verify Safety: No unrelated users or complaints deleted
    const adminCount = await User.count({ where: { role: 'superadmin' } });
    const subadminCount = await User.count({ where: { role: 'subadmin' } });
    const citizenCount = await User.count({ where: { role: 'citizen' } });
    const paguthiCount = await User.count({ where: { role: 'paguthi_seyalaalar' } });
    const issuesCount = await Issue.count();

    assert(adminCount >= 1, `Admin accounts preserved (${adminCount})`);
    assert(subadminCount >= 1, `Subadmin accounts preserved (${subadminCount})`);
    assert(citizenCount >= 5, `Citizen accounts preserved (${citizenCount})`);
    assert(paguthiCount === 3, `Exactly 3 Paguthi Seyalaalar accounts preserved (${paguthiCount})`);
    assert(issuesCount >= 15, `Complaints/Issues preserved (${issuesCount})`);

    console.log('\n================================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} / ${total} tests passed!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

runVerification();
