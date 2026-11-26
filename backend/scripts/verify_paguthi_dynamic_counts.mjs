import { sequelize, Ward, User } from '../models/index.js';

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

async function testAll() {
  console.log('========================================================');
  console.log('🧪 VERIFYING DYNAMIC PAGUTHI WARD COUNTS (E2E)');
  console.log('========================================================\n');

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
    // 1. Admin login
    const adminRes = await postJson(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin@123',
      role: 'admin',
    });
    const adminToken = adminRes.data?.token || adminRes.token;
    assert(adminRes.success && adminToken, 'Admin logged in successfully');

    // 2. Fetch Kinathukadavu details via Admin endpoint
    const kRes = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    assert(kRes.success, 'Fetched Kinathukadavu Constituency (ID: 6)');
    const cData = kRes.data;

    const paguthis = cData.paguthis;
    console.log(`\n📋 Admin Paguthis count: ${paguthis.length}`);
    paguthis.forEach((p) => {
      console.log(`   - ${p.name}: ${p.totalWards} Wards, ${p.registeredSecretaries} Secretaries, ${p.totalComplaints} Complaints`);
    });

    assert(paguthis.length === 4, `Constituency has exactly 4 active Paguthis (got: ${paguthis.length})`);
    assert(cData.constituency.totalPaguthi === 4, `constituency.totalPaguthi is 4 (got: ${cData.constituency.totalPaguthi})`);

    const pothanurCard = paguthis.find((p) => p.name === 'Pothanur');
    const kurichiCard = paguthis.find((p) => p.name === 'Kurichi');
    const sundarapuramCard = paguthis.find((p) => p.name === 'Sundarapuram');
    const maluCard = paguthis.find((p) => p.name === 'Malumichampatti');

    assert(pothanurCard && pothanurCard.totalWards === 4, `Pothanur in Admin shows exactly 4 Wards (got: ${pothanurCard?.totalWards})`);
    assert(kurichiCard && kurichiCard.totalWards === 4, `Kurichi in Admin shows exactly 4 Wards (got: ${kurichiCard?.totalWards})`);
    assert(sundarapuramCard && sundarapuramCard.totalWards === 5, `Sundarapuram in Admin shows exactly 5 Wards (got: ${sundarapuramCard?.totalWards})`);
    assert(maluCard && maluCard.totalWards === 4, `Malumichampatti in Admin shows exactly 4 Wards (got: ${maluCard?.totalWards})`);

    // 3. Test Paguthi Seyalaalar login & dashboard for all 3 accounts
    const testAccounts = [
      { paguthi: 'Pothanur', username: 'pothanur', password: 'pothanur@2026', expectedWards: 4 },
      { paguthi: 'Kurichi', username: 'kurichi', password: 'kurichi@2024', expectedWards: 4 },
      { paguthi: 'Sundarapuram', username: 'sundarapuram', password: 'sundarapurum@26', expectedWards: 5 },
    ];

    for (const acc of testAccounts) {
      console.log(`\n🔐 Testing Login for Paguthi Seyalaalar: ${acc.username} (${acc.paguthi})`);
      const lRes = await postJson(`${API_BASE}/auth/login`, {
        username: acc.username,
        password: acc.password,
        role: 'paguthi_seyalaalar',
      });
      const token = lRes.data?.token || lRes.token;
      assert(lRes.success && token, `Login succeeded for ${acc.username}`);

      const dRes = await getJson(`${API_BASE}/paguthi-seyalaalar/dashboard`, token);
      assert(dRes.success, `Dashboard data fetched for ${acc.username}`);

      const dData = dRes.data;
      assert(dData.paguthi === acc.paguthi, `Dashboard paguthi matches ${acc.paguthi}`);
      assert(dData.stats.totalWards === acc.expectedWards, `Dashboard totalWards is ${acc.expectedWards} (got: ${dData.stats.totalWards})`);
      assert(dData.wards.length === acc.expectedWards, `Dashboard wards list length matches ${acc.expectedWards} (got: ${dData.wards.length})`);
      console.log(`   Wards in ${acc.paguthi}:`, dData.wards.map((w) => `Ward ${w.wardNumber} (${w.wardName})`).join(', '));
    }

    // 4. Test Dynamic Insertion: Add a new ward to Pothanur and verify counts update immediately
    console.log('\n⚡ TESTING DYNAMIC RE-COUNT: Adding a temporary Ward to Pothanur...');
    const tempWard = await Ward.create({
      wardNumber: 777,
      wardName: 'Pothanur Test Extension',
      tamilName: 'போத்தனூர் சோதனை வார்டு',
      paguthi: 'Pothanur',
      constituencyId: 6,
      zone: 'South Zone',
    });
    console.log(`   Created test ward ID ${tempWard.id} in Pothanur`);

    // Verify Admin constituency endpoint reflects 5 wards for Pothanur
    const kResAfterAdd = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    const pothanurAfterAdd = kResAfterAdd.data.paguthis.find((p) => p.name === 'Pothanur');
    assert(pothanurAfterAdd?.totalWards === 5, `Admin dynamically reflects 5 wards for Pothanur after add (got: ${pothanurAfterAdd?.totalWards})`);

    // Verify Pothanur Paguthi Seyalaalar reflects 5 wards
    const pLogin = await postJson(`${API_BASE}/auth/login`, {
      username: 'pothanur',
      password: 'pothanur@2026',
      role: 'paguthi_seyalaalar',
    });
    const pToken = pLogin.data?.token || pLogin.token;
    const pResAfterAdd = await getJson(`${API_BASE}/paguthi-seyalaalar/dashboard`, pToken);
    assert(pResAfterAdd.data.stats.totalWards === 5, `Paguthi Seyalaalar dynamically reflects 5 wards for Pothanur (got: ${pResAfterAdd.data.stats.totalWards})`);

    // Other paguthis must NOT have changed
    const kurichiAfterAdd = kResAfterAdd.data.paguthis.find((p) => p.name === 'Kurichi');
    assert(kurichiAfterAdd?.totalWards === 4, `Kurichi remains at 4 wards without cross-contamination`);

    // Cleanup test ward
    await tempWard.destroy();
    console.log(`   Cleaned up test ward ID ${tempWard.id}`);

    // Verify Admin endpoint returns back to 4 wards
    const kResAfterCleanup = await getJson(`${API_BASE}/districts/constituencies/6`, adminToken);
    const pothanurAfterCleanup = kResAfterCleanup.data.paguthis.find((p) => p.name === 'Pothanur');
    assert(pothanurAfterCleanup?.totalWards === 4, `Admin dynamically returns to 4 wards after cleanup (got: ${pothanurAfterCleanup?.totalWards})`);

    console.log('\n========================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} / ${total} tests passed!`);
    console.log('========================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

testAll();
