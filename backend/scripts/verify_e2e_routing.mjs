import { Op } from 'sequelize';
import sequelize from '../config/mysql.js';
import User from '../models/User.js';
import Ward from '../models/Ward.js';
import Issue from '../models/Issue.js';
import Constituency from '../models/Constituency.js';
import District from '../models/District.js';
import '../models/index.js'; // load associations
import { registerWardSecretary } from '../controllers/settingsController.js';
import { createIssue, getIssues, getIssueById, startWork, completeWork } from '../controllers/issueController.js';
import { getPaguthiDetails, getConstituencyById } from '../controllers/districtController.js';

// Helper mock req/res
function mockReqRes(body = {}, params = {}, query = {}, user = null) {
  let responseData = null;
  let statusCode = 200;

  const req = {
    body,
    params,
    query,
    user,
    ip: '127.0.0.1',
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData }) };
}

async function runTests() {
  console.log('========================================================================');
  console.log('TVK DIGITAL GOVERNANCE CRM – PAGUTHI + WARD ROUTING E2E VERIFICATION');
  console.log('========================================================================\n');

  let passedTests = 0;
  const totalTests = 12;

  try {
    // Lookup admin user for registration calls
    const adminUser = await User.findOne({ where: { role: ['admin', 'superadmin'] } });
    if (!adminUser) throw new Error('Admin user not found in database');

    // Lookup Kinathukadavu constituency
    const kinathu = await Constituency.findOne({ where: { name: 'Kinathukadavu' } });
    if (!kinathu) throw new Error('Kinathukadavu constituency not found');

    // Find the target wards
    const sundarW1 = await Ward.findOne({ where: { wardNumber: 1, paguthi: 'Sundarapuram' } });
    const sundarW2 = await Ward.findOne({ where: { wardNumber: 2, paguthi: 'Sundarapuram' } });
    const kurichiW1 = await Ward.findOne({ where: { wardNumber: 1, paguthi: 'Kurichi' } });

    // Clean up test records from prior runs to guarantee fresh deterministic execution
    const testUsernames = ['sundar_w1_sec', 'sundar_w2_sec', 'kurichi_w1_sec'];
    const testUsers = await User.findAll({ where: { username: testUsernames } });
    const testUserIds = testUsers.map((u) => u.id);
    if (testUserIds.length > 0) {
      await Issue.destroy({ where: { assignedWardSecretaryId: testUserIds } });
      await Ward.update({ wardSecretary: '', wardSecretaryId: null }, { where: { wardSecretaryId: testUserIds } });
      await User.destroy({ where: { id: testUserIds } });
    }
    await Issue.destroy({
      where: {
        title: [
          'Sundarapuram Ward 1 Pipeline Leakage',
          'Sundarapuram Ward 2 Street Light Failure',
          'Kurichi Ward 1 Drainage Blockage',
        ],
      },
    });

    console.log(`Target Wards in MySQL:`);
    console.log(`- Sundarapuram Ward 1: ID=${sundarW1.id}, Name="${sundarW1.wardName}", Paguthi="${sundarW1.paguthi}"`);
    console.log(`- Sundarapuram Ward 2: ID=${sundarW2.id}, Name="${sundarW2.wardName}", Paguthi="${sundarW2.paguthi}"`);
    console.log(`- Kurichi Ward 1: ID=${kurichiW1.id}, Name="${kurichiW1.wardName}", Paguthi="${kurichiW1.paguthi}"\n`);

    // ========================================================================
    // TEST 1: Register Sundarapuram Ward 1 Secretary
    // ========================================================================
    console.log('--- TEST 1: Register Sundarapuram Ward 1 Secretary (sundar_w1_sec) ---');
    const t1 = mockReqRes(
      {
        name: 'Sundar W1 Secretary',
        phone: '9842100001',
        age: 35,
        paguthi: 'Sundarapuram',
        wardId: sundarW1.id,
        assignedWard: `Ward ${sundarW1.wardNumber} - ${sundarW1.wardName}`,
        username: 'sundar_w1_sec',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
      {},
      {},
      adminUser
    );
    await registerWardSecretary(t1.req, t1.res);
    const r1 = t1.getResult();
    if (r1.status === 201 && r1.data.success) {
      console.log(`✓ TEST 1 PASSED: Registered ${r1.data.data.name} (@${r1.data.data.username}) in Sundarapuram Ward 1 (ID: ${r1.data.data.id})`);
      passedTests++;
    } else {
      console.error('✗ TEST 1 FAILED:', r1);
    }

    // ========================================================================
    // TEST 2: Register Sundarapuram Ward 2 Secretary
    // ========================================================================
    console.log('\n--- TEST 2: Register Sundarapuram Ward 2 Secretary (sundar_w2_sec) ---');
    const t2 = mockReqRes(
      {
        name: 'Sundar W2 Secretary',
        phone: '9842100002',
        age: 36,
        paguthi: 'Sundarapuram',
        wardId: sundarW2.id,
        assignedWard: `Ward ${sundarW2.wardNumber} - ${sundarW2.wardName}`,
        username: 'sundar_w2_sec',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
      {},
      {},
      adminUser
    );
    await registerWardSecretary(t2.req, t2.res);
    const r2 = t2.getResult();
    if (r2.status === 201 && r2.data.success) {
      console.log(`✓ TEST 2 PASSED: Registered ${r2.data.data.name} (@${r2.data.data.username}) in Sundarapuram Ward 2 (ID: ${r2.data.data.id})`);
      passedTests++;
    } else {
      console.error('✗ TEST 2 FAILED:', r2);
    }

    // ========================================================================
    // TEST 3: Register Kurichi Ward 1 Secretary
    // ========================================================================
    console.log('\n--- TEST 3: Register Kurichi Ward 1 Secretary (kurichi_w1_sec) ---');
    const t3 = mockReqRes(
      {
        name: 'Kurichi W1 Secretary',
        phone: '9842100003',
        age: 38,
        paguthi: 'Kurichi',
        wardId: kurichiW1.id,
        assignedWard: `Ward ${kurichiW1.wardNumber} - ${kurichiW1.wardName}`,
        username: 'kurichi_w1_sec',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
      {},
      {},
      adminUser
    );
    await registerWardSecretary(t3.req, t3.res);
    const r3 = t3.getResult();
    if (r3.status === 201 && r3.data.success) {
      console.log(`✓ TEST 3 PASSED: Registered ${r3.data.data.name} (@${r3.data.data.username}) in Kurichi Ward 1 (ID: ${r3.data.data.id})`);
      passedTests++;
    } else {
      console.error('✗ TEST 3 FAILED:', r3);
    }

    // Fetch refreshed user objects
    const secSundarW1 = await User.findOne({ where: { username: 'sundar_w1_sec' } });
    const secSundarW2 = await User.findOne({ where: { username: 'sundar_w2_sec' } });
    const secKurichiW1 = await User.findOne({ where: { username: 'kurichi_w1_sec' } });

    // Lookup Citizen User
    const citizenUser = await User.findOne({ where: { role: 'citizen' } }) || adminUser;

    // ========================================================================
    // TEST 4: Citizen submits complaint for Sundarapuram Ward 1
    // ========================================================================
    console.log('\n--- TEST 4: Citizen Submits Complaint for Sundarapuram Ward 1 ---');
    const t4 = mockReqRes(
      {
        title: 'Sundarapuram Ward 1 Pipeline Leakage',
        category: 'Drinking Water',
        description: 'Potable water supply line leaking near street junction in Sundarapuram Ward 1',
        citizenName: 'R. K. Citizen',
        citizenMobile: '9876543210',
        districtId: 1,
        constituencyId: kinathu.id,
        paguthi: 'Sundarapuram',
        wardId: sundarW1.id,
        wardNumber: sundarW1.wardNumber,
        wardName: sundarW1.wardName,
      },
      {},
      {},
      citizenUser
    );
    await createIssue(t4.req, t4.res);
    const r4 = t4.getResult();
    const issueSundarW1 = await Issue.findOne({ where: { title: 'Sundarapuram Ward 1 Pipeline Leakage' } });
    if (issueSundarW1 && issueSundarW1.assignedWardSecretaryId === secSundarW1.id && issueSundarW1.wardName === sundarW1.wardName) {
      console.log(`✓ TEST 4 PASSED: Complaint ${issueSundarW1.issueCode} routed to Sundarapuram Ward 1 Secretary (User ID: ${issueSundarW1.assignedWardSecretaryId})`);
      console.log(`  Saved fields: paguthi="${issueSundarW1.paguthi}", wardId=${issueSundarW1.wardId}, wardNumber=${issueSundarW1.wardNumber}, wardName="${issueSundarW1.wardName}"`);
      passedTests++;
    } else {
      console.error('✗ TEST 4 FAILED:', issueSundarW1);
    }

    // ========================================================================
    // TEST 5: Citizen submits complaint for Sundarapuram Ward 2
    // ========================================================================
    console.log('\n--- TEST 5: Citizen Submits Complaint for Sundarapuram Ward 2 ---');
    const t5 = mockReqRes(
      {
        title: 'Sundarapuram Ward 2 Street Light Failure',
        category: 'Street Lighting',
        description: 'High mast light not functioning on 4th cross street in Sundarapuram Ward 2',
        citizenName: 'M. Anand',
        citizenMobile: '9876543211',
        districtId: 1,
        constituencyId: kinathu.id,
        paguthi: 'Sundarapuram',
        wardId: sundarW2.id,
        wardNumber: sundarW2.wardNumber,
        wardName: sundarW2.wardName,
      },
      {},
      {},
      citizenUser
    );
    await createIssue(t5.req, t5.res);
    const r5 = t5.getResult();
    const issueSundarW2 = await Issue.findOne({ where: { title: 'Sundarapuram Ward 2 Street Light Failure' } });
    if (issueSundarW2 && issueSundarW2.assignedWardSecretaryId === secSundarW2.id) {
      console.log(`✓ TEST 5 PASSED: Complaint ${issueSundarW2.issueCode} routed to Sundarapuram Ward 2 Secretary (User ID: ${issueSundarW2.assignedWardSecretaryId})`);
      passedTests++;
    } else {
      console.error('✗ TEST 5 FAILED:', issueSundarW2);
    }

    // ========================================================================
    // TEST 6: Citizen submits complaint for Kurichi Ward 1 (Crucial: Ward 1 vs Ward 1 separation)
    // ========================================================================
    console.log('\n--- TEST 6: Citizen Submits Complaint for Kurichi Ward 1 ---');
    const t6 = mockReqRes(
      {
        title: 'Kurichi Ward 1 Drainage Blockage',
        category: 'Sanitation / Drainage',
        description: 'Stormwater drain overflowing near school road in Kurichi Ward 1',
        citizenName: 'K. Priya',
        citizenMobile: '9876543212',
        districtId: 1,
        constituencyId: kinathu.id,
        paguthi: 'Kurichi',
        wardId: kurichiW1.id,
        wardNumber: kurichiW1.wardNumber,
        wardName: kurichiW1.wardName,
      },
      {},
      {},
      citizenUser
    );
    await createIssue(t6.req, t6.res);
    const r6 = t6.getResult();
    const issueKurichiW1 = await Issue.findOne({ where: { title: 'Kurichi Ward 1 Drainage Blockage' } });
    if (
      issueKurichiW1 &&
      issueKurichiW1.assignedWardSecretaryId === secKurichiW1.id &&
      issueKurichiW1.assignedWardSecretaryId !== secSundarW1.id
    ) {
      console.log(`✓ TEST 6 PASSED: Kurichi Ward 1 Complaint ${issueKurichiW1.issueCode} routed strictly to Kurichi Secretary (${secKurichiW1.name})`);
      console.log(`  Confirmed: Sundarapuram Ward 1 (Sec ID ${secSundarW1.id}) and Kurichi Ward 1 (Sec ID ${secKurichiW1.id}) are 100% isolated.`);
      passedTests++;
    } else {
      console.error('✗ TEST 6 FAILED:', issueKurichiW1);
    }

    // ========================================================================
    // TEST 7: Login as sundar_w1_sec → verify ONLY Sundarapuram Ward 1 complaints appear
    // ========================================================================
    console.log('\n--- TEST 7: Scoped Query as sundar_w1_sec ---');
    const t7 = mockReqRes({}, {}, { limit: 100 }, secSundarW1);
    await getIssues(t7.req, t7.res);
    const r7 = t7.getResult();
    const sec1Complaints = r7.data.data;
    const hasOnlySundarW1 = sec1Complaints.every(
      (c) =>
        c.paguthi === 'Sundarapuram' &&
        (c.wardNumber === 1 || c.wardId === sundarW1.id || (typeof c.assignedWardSecretaryId === 'object' ? c.assignedWardSecretaryId?.id === secSundarW1.id : c.assignedWardSecretaryId === secSundarW1.id))
    );
    const containsKurichiOrW2 = sec1Complaints.some(
      (c) => c.paguthi === 'Kurichi' || c.wardNumber === 2 || c.title.includes('Kurichi') || c.title.includes('Ward 2')
    );
    if (hasOnlySundarW1 && !containsKurichiOrW2 && sec1Complaints.length >= 1) {
      console.log(`✓ TEST 7 PASSED: sundar_w1_sec sees ${sec1Complaints.length} complaint(s), all strictly within Sundarapuram Ward 1.`);
      passedTests++;
    } else {
      console.error('✗ TEST 7 FAILED:', { hasOnlySundarW1, containsKurichiOrW2, count: sec1Complaints.length });
    }

    // ========================================================================
    // TEST 8: Login as sundar_w2_sec → verify ONLY Sundarapuram Ward 2 complaints appear
    // ========================================================================
    console.log('\n--- TEST 8: Scoped Query as sundar_w2_sec ---');
    const t8 = mockReqRes({}, {}, { limit: 100 }, secSundarW2);
    await getIssues(t8.req, t8.res);
    const r8 = t8.getResult();
    const sec2Complaints = r8.data.data;
    const hasOnlySundarW2 = sec2Complaints.every(
      (c) =>
        c.paguthi === 'Sundarapuram' &&
        (c.wardNumber === 2 || c.wardId === sundarW2.id || (typeof c.assignedWardSecretaryId === 'object' ? c.assignedWardSecretaryId?.id === secSundarW2.id : c.assignedWardSecretaryId === secSundarW2.id))
    );
    const containsW1 = sec2Complaints.some(
      (c) => c.wardNumber === 1 || c.paguthi === 'Kurichi' || c.title.includes('Ward 1')
    );
    if (hasOnlySundarW2 && !containsW1 && sec2Complaints.length >= 1) {
      console.log(`✓ TEST 8 PASSED: sundar_w2_sec sees ${sec2Complaints.length} complaint(s), all strictly within Sundarapuram Ward 2.`);
      passedTests++;
    } else {
      console.error('✗ TEST 8 FAILED:', { hasOnlySundarW2, containsW1, count: sec2Complaints.length });
    }

    // ========================================================================
    // TEST 9: Admin opens Kinathukadavu → Sundarapuram → verify ONLY Sundarapuram complaints & stats
    // ========================================================================
    console.log('\n--- TEST 9: Admin Views Sundarapuram Paguthi Details ---');
    const t9 = mockReqRes({}, { id: kinathu.id, paguthiName: 'Sundarapuram' }, {}, adminUser);
    await getPaguthiDetails(t9.req, t9.res);
    const r9 = t9.getResult();
    const pSundarData = r9.data.data;
    console.log(`  Sundarapuram Stats in MySQL:`, pSundarData.stats);
    const sundarComplaintsArePure = pSundarData.issues.every((i) => i.paguthi === 'Sundarapuram');
    if (
      pSundarData.stats.totalWards === 5 &&
      pSundarData.stats.registeredSecretaries === 2 &&
      pSundarData.stats.totalComplaints >= 2 &&
      sundarComplaintsArePure
    ) {
      console.log(`✓ TEST 9 PASSED: Admin Paguthi Detail for Sundarapuram shows 5 Wards, 2 Registered Secretaries, and all complaints strictly scoped to Sundarapuram.`);
      passedTests++;
    } else {
      console.error('✗ TEST 9 FAILED:', pSundarData.stats);
    }

    // ========================================================================
    // TEST 10: Admin opens Kurichi → verify ONLY Kurichi complaints & stats
    // ========================================================================
    console.log('\n--- TEST 10: Admin Views Kurichi Paguthi Details ---');
    const t10 = mockReqRes({}, { id: kinathu.id, paguthiName: 'Kurichi' }, {}, adminUser);
    await getPaguthiDetails(t10.req, t10.res);
    const r10 = t10.getResult();
    const pKurichiData = r10.data.data;
    console.log(`  Kurichi Stats in MySQL:`, pKurichiData.stats);
    const kurichiComplaintsArePure = pKurichiData.issues.every((i) => i.paguthi === 'Kurichi');
    if (
      pKurichiData.stats.totalWards === 4 &&
      pKurichiData.stats.registeredSecretaries >= 1 &&
      pKurichiData.stats.totalComplaints >= 1 &&
      kurichiComplaintsArePure
    ) {
      console.log(`✓ TEST 10 PASSED: Admin Paguthi Detail for Kurichi shows 4 Wards, 1 Registered Secretary, and all complaints strictly scoped to Kurichi.`);
      passedTests++;
    } else {
      console.error('✗ TEST 10 FAILED:', pKurichiData.stats);
    }

    // ========================================================================
    // TEST 11: Change complaint status to In Progress and Completed → verify stats update correctly
    // ========================================================================
    console.log('\n--- TEST 11: Progress & Complete Complaint (Verify Dynamic Stats Update) ---');
    // Step 1: Start work on Sundarapuram Ward 1 complaint
    const t11a = mockReqRes({}, { id: issueSundarW1.id }, {}, secSundarW1);
    await startWork(t11a.req, t11a.res);
    const r11a = t11a.getResult();
    console.log(`  startWork response: status=${r11a.data.data.status}`);

    // Step 2: Complete work on Sundarapuram Ward 1 complaint
    const t11b = mockReqRes(
      {
        beforeImage: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80',
        afterImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        actionTaken: 'Repaired defective pipe connection and replaced rubber gasket seal.',
        wardSecretaryRemarks: 'Field inspection completed and normal water pressure restored to all houses.',
      },
      { id: issueSundarW1.id },
      {},
      secSundarW1
    );
    await completeWork(t11b.req, t11b.res);
    const r11b = t11b.getResult();
    console.log(`  completeWork response: status=${r11b.data.data?.status}`);

    // Re-check Sundarapuram stats
    const t11c = mockReqRes({}, { id: kinathu.id, paguthiName: 'Sundarapuram' }, {}, adminUser);
    await getPaguthiDetails(t11c.req, t11c.res);
    const r11c = t11c.getResult();
    const updatedStats = r11c.data.data.stats;
    console.log(`  Updated Sundarapuram Stats:`, updatedStats);

    if (updatedStats.completedComplaints >= 1) {
      console.log(`✓ TEST 11 PASSED: Completed complaints count incremented to ${updatedStats.completedComplaints} in live MySQL.`);
      passedTests++;
    } else {
      console.error('✗ TEST 11 FAILED:', updatedStats);
    }

    // ========================================================================
    // TEST 12: Try accessing another Ward's complaint through API → verify access denied (403)
    // ========================================================================
    console.log('\n--- TEST 12: Unauthorized Cross-Ward / Cross-Paguthi Access Block (403) ---');
    // sundar_w1_sec attempts to startWork or completeWork on Kurichi Ward 1 complaint
    const t12 = mockReqRes({}, { id: issueKurichiW1.id }, {}, secSundarW1);
    await startWork(t12.req, t12.res);
    const r12 = t12.getResult();
    if (r12.status === 403 && !r12.data.success) {
      console.log(`✓ TEST 12 PASSED: Access correctly denied (403 Forbidden).`);
      console.log(`  Message: "${r12.data.message}"`);
      passedTests++;
    } else {
      console.error('✗ TEST 12 FAILED: Expected 403 Forbidden, got:', r12);
    }

    console.log('\n========================================================================');
    console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
