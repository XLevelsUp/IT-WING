const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  const results = [];
  function assert(condition, testName, details = '') {
    if (condition) {
      results.push({ name: testName, pass: true, details });
      console.log(`✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
    } else {
      results.push({ name: testName, pass: false, details });
      console.error(`❌ FAIL: ${testName} - ${details}`);
    }
  }

  try {
    console.log('\n--- 1. ADMIN LOGIN ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginData.success, 'Admin Login', `Token obtained: ${Boolean(adminLoginData.data?.token)}`);
    const adminToken = adminLoginData.data?.token;

    console.log('\n--- 2. USER REGISTRATION MODULE ---');
    const ts = Date.now().toString().slice(-6);
    const validCitizenPhone1 = `9842${ts}`;
    const validCitizenRes1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Citizen Seerapalayam',
        phoneNumber: validCitizenPhone1,
        password: 'Password@123',
        paguthi: 'Malumachampatti',
        village: 'Seerapalayam',
        wardNumber: 95,
      }),
    });
    const validCitizenData1 = await validCitizenRes1.json();
    assert(validCitizenData1.success, 'Register Citizen with Malumachampatti + Seerapalayam', validCitizenData1.message || 'Success');

    const validCitizenPhone2 = `9843${ts}`;
    const validCitizenRes2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Citizen Malumachampatti',
        phoneNumber: validCitizenPhone2,
        password: 'Password@123',
        paguthi: 'Malumachampatti',
        village: 'Malumachampatti',
        wardNumber: 95,
      }),
    });
    const validCitizenData2 = await validCitizenRes2.json();
    assert(validCitizenData2.success, 'Register Citizen with Malumachampatti + Malumachampatti', validCitizenData2.message || 'Success');

    const invalidCitizenRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Citizen',
        phoneNumber: `9844${ts}`,
        password: 'Password@123',
        paguthi: 'Malumachampatti',
        village: 'InvalidVillageXYZ',
        wardNumber: 95,
      }),
    });
    const invalidCitizenData = await invalidCitizenRes.json();
    assert(
      !invalidCitizenData.success && invalidCitizenRes.status === 400,
      'Reject Invalid Village on User Registration',
      invalidCitizenData.message
    );

    console.log('\n--- 3. USER COMPLAINT REGISTRATION MODULE ---');
    const citizenLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: validCitizenPhone1, password: 'Password@123' }),
    });
    const citizenLoginData = await citizenLoginRes.json();
    const citizenToken = citizenLoginData.data?.token;

    const validComplaintRes1 = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: 'Road Repair in Seerapalayam',
        description: 'Street road potholes near Seerapalayam main entrance',
        category: 'Roads / Infrastructure',
        paguthi: 'Malumachampatti',
        village: 'Seerapalayam',
        wardNumber: 95,
        citizenName: 'Test Citizen Seerapalayam',
        citizenMobile: validCitizenPhone1,
      }),
    });
    const validComplaintData1 = await validComplaintRes1.json();
    assert(
      validComplaintData1.success && validComplaintData1.data?.village === 'Seerapalayam',
      'Create Complaint in Seerapalayam Village',
      `Issue Code: ${validComplaintData1.data?.issueCode}, Village: ${validComplaintData1.data?.village}`
    );

    const validComplaintRes2 = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: 'Drainage blockage in Malumachampatti',
        description: 'Drainage water overflowing near Malumachampatti junction',
        category: 'Sanitation / Drainage',
        paguthi: 'Malumachampatti',
        village: 'Malumachampatti',
        wardNumber: 95,
        citizenName: 'Test Citizen Malumachampatti',
        citizenMobile: validCitizenPhone2,
      }),
    });
    const validComplaintData2 = await validComplaintRes2.json();
    assert(
      validComplaintData2.success && validComplaintData2.data?.village === 'Malumachampatti',
      'Create Complaint in Malumachampatti Village',
      `Issue Code: ${validComplaintData2.data?.issueCode}, Village: ${validComplaintData2.data?.village}`
    );

    const invalidComplaintRes = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: 'Invalid complaint',
        description: 'Testing invalid village rejection',
        paguthi: 'Malumachampatti',
        village: 'FakeVillageName',
        wardNumber: 95,
        citizenName: 'Test',
        citizenMobile: validCitizenPhone1,
      }),
    });
    const invalidComplaintData = await invalidComplaintRes.json();
    assert(
      !invalidComplaintData.success && invalidComplaintRes.status === 400,
      'Reject Complaint with Invalid Village',
      invalidComplaintData.message
    );

    console.log('\n--- 4. ADMIN PANEL KINATHUKADAVU PAGUTHI DETAILS MODULE ---');
    const adminPaguthiRes = await fetch(
      `${BASE_URL}/districts/constituencies/6/paguthi/Malumachampatti`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const adminPaguthiData = await adminPaguthiRes.json();
    assert(adminPaguthiData.success, 'Fetch Malumachampatti Paguthi Details (Admin)', adminPaguthiData.message || 'Success');
    assert(adminPaguthiData.data?.hasVillages === true, 'Malumachampatti hasVillages flag is true');
    assert(
      Array.isArray(adminPaguthiData.data?.villages) && adminPaguthiData.data.villages.length === 2,
      'Returns 2 Village Cards (Seerapalayam and Malumachampatti)',
      `Found: ${adminPaguthiData.data?.villages?.map((v) => v.name).join(', ')}`
    );

    const seerapalayamCard = adminPaguthiData.data?.villages?.find((v) => v.name === 'Seerapalayam');
    const malumachampattiCard = adminPaguthiData.data?.villages?.find((v) => v.name === 'Malumachampatti');

    assert(seerapalayamCard?.totalWards === 0, 'Seerapalayam reports 0 unseeded wards correctly');
    assert(malumachampattiCard?.totalWards === 1, 'Malumachampatti reports 1 ward (Ward 95) correctly');
    assert(seerapalayamCard?.totalComplaints >= 1, 'Seerapalayam reflects registered complaint count');
    assert(malumachampattiCard?.totalComplaints >= 1, 'Malumachampatti reflects registered complaint count');

    // Drilldown to Seerapalayam
    const seeraDrilldownRes = await fetch(
      `${BASE_URL}/districts/constituencies/6/paguthi/Malumachampatti?village=Seerapalayam`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const seeraDrilldownData = await seeraDrilldownRes.json();
    assert(
      seeraDrilldownData.success && seeraDrilldownData.data?.selectedVillage === 'Seerapalayam',
      'Drilldown to Seerapalayam Village',
      `Wards: ${seeraDrilldownData.data?.wards?.length}, Complaints: ${seeraDrilldownData.data?.issues?.length}`
    );

    // Drilldown to Malumachampatti
    const malumaDrilldownRes = await fetch(
      `${BASE_URL}/districts/constituencies/6/paguthi/Malumachampatti?village=Malumachampatti`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const malumaDrilldownData = await malumaDrilldownRes.json();
    assert(
      malumaDrilldownData.success &&
        malumaDrilldownData.data?.selectedVillage === 'Malumachampatti' &&
        malumaDrilldownData.data?.wards?.some((w) => w.wardNumber === 95),
      'Drilldown to Malumachampatti Village returns Ward 95',
      `Wards: ${malumaDrilldownData.data?.wards?.length}`
    );

    console.log('\n--- 5. DEDICATED MALUMACHAMPATTI LOGIN & DASHBOARD MODULE ---');
    const malumaLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Malumachampatti', password: 'Malumachampatti@123123' }),
    });
    const malumaLoginData = await malumaLoginRes.json();
    assert(malumaLoginData.success, 'Dedicated Malumachampatti Login', `Token obtained: ${Boolean(malumaLoginData.data?.token)}`);
    const malumaToken = malumaLoginData.data?.token;

    const malumaDashRes = await fetch(`${BASE_URL}/paguthi-seyalaalar/dashboard`, {
      headers: { Authorization: `Bearer ${malumaToken}` },
    });
    const malumaDashData = await malumaDashRes.json();
    assert(malumaDashData.success, 'Fetch Dedicated Malumachampatti Dashboard', malumaDashData.message || 'Success');
    assert(
      malumaDashData.data?.hasVillages === true && malumaDashData.data?.villages?.length === 2,
      'Dashboard displays Seerapalayam and Malumachampatti Village Directory',
      `Villages: ${malumaDashData.data?.villages?.map((v) => v.name).join(', ')}`
    );

    const malumaVillageDrilldown = await fetch(`${BASE_URL}/paguthi-seyalaalar/dashboard?village=Malumachampatti`, {
      headers: { Authorization: `Bearer ${malumaToken}` },
    });
    const malumaVillageData = await malumaVillageDrilldown.json();
    assert(
      malumaVillageData.success && malumaVillageData.data?.wards?.some((w) => w.wardNumber === 95),
      'Dedicated Dashboard drilldown to Malumachampatti returns Ward 95'
    );

    // Cross-jurisdiction security checks
    const crossVillageRes = await fetch(`${BASE_URL}/paguthi-seyalaalar/dashboard?village=Arisipalayam`, {
      headers: { Authorization: `Bearer ${malumaToken}` },
    });
    const crossVillageData = await crossVillageRes.json();
    assert(
      !crossVillageData.success && crossVillageRes.status === 403,
      'Reject Cross-Jurisdiction Village Access (403 Forbidden)',
      crossVillageData.message
    );

    const kurichiLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'kurichi', password: 'kurichi@2026' }),
    });
    const kurichiLoginData = await kurichiLoginRes.json();
    const kurichiToken = kurichiLoginData.data?.token;

    const kurichiCrossRes = await fetch(`${BASE_URL}/districts/constituencies/6/paguthi/Malumachampatti`, {
      headers: { Authorization: `Bearer ${kurichiToken}` },
    });
    const kurichiCrossData = await kurichiCrossRes.json();
    assert(
      !kurichiCrossData.success && kurichiCrossRes.status === 403,
      'Reject Unauthorized Paguthi Access by Different Seyalaalar (403 Forbidden)',
      kurichiCrossData.message
    );

    console.log('\n--- 6. WARD SECRETARY REGISTRATION (ADMIN SETTINGS) ---');
    const secUsername = `malumasec_${ts}`;
    const secPhone = `9845${ts}`;
    const registerSecRes = await fetch(`${BASE_URL}/settings/ward-secretaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'M. Senthilkumar',
        phone: secPhone,
        age: 36,
        paguthi: 'Malumachampatti',
        village: 'Malumachampatti',
        wardNumber: 95,
        assignedWard: 'Ward 95',
        username: secUsername,
        password: 'Password@123',
        confirmPassword: 'Password@123',
      }),
    });
    const registerSecData = await registerSecRes.json();
    // Might fail if Ward 95 already has an active secretary, let's verify either created or existing secretary detected
    if (registerSecData.success) {
      assert(true, 'Register Ward Secretary for Malumachampatti + Malumachampatti', registerSecData.message);
      assert(registerSecData.data?.village === 'Malumachampatti', 'Ward Secretary record has village = Malumachampatti');
    } else {
      assert(
        registerSecData.message.includes('already assigned') || registerSecData.message.includes('already taken'),
        'Ward Secretary uniqueness enforced for Ward 95',
        registerSecData.message
      );
    }

    const invalidSecRes = await fetch(`${BASE_URL}/settings/ward-secretaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Sec',
        phone: `9846${ts}`,
        age: 36,
        paguthi: 'Malumachampatti',
        village: 'InvalidVillageXYZ',
        wardNumber: 95,
        username: `invalidsec_${ts}`,
        password: 'Password@123',
        confirmPassword: 'Password@123',
      }),
    });
    const invalidSecData = await invalidSecRes.json();
    assert(
      !invalidSecData.success && invalidSecRes.status === 400,
      'Reject Ward Secretary with Invalid Village',
      invalidSecData.message
    );

    console.log('\n========================================');
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.pass).length;
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('========================================\n');

    process.exit(totalTests === passedTests ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
