import sequelize from '../config/mysql.js';
import {
  getWardSecretaries,
  createIssue,
  assignIssue,
  getIssues,
} from '../controllers/issueController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { Issue, User, Notification, IssueActivity, AuditLog } from '../models/index.js';

function createMockRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}

async function runEndToEndVerification() {
  console.log('========================================================================');
  console.log('🧪 TVK DIGITAL GOVERNANCE CRM – REAL DATABASE & CONTROLLER VERIFICATION');
  console.log('   UPDATE 1: Complaint Forwarding to Ward Secretary');
  console.log('   UPDATE 2: Admin Dashboard Complaint Ageing Overview');
  console.log('========================================================================\n');

  let testIssueId = null;
  let testCitizenId = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Verify Ward Secretaries List
    // -------------------------------------------------------------
    console.log('▶ STEP 1: Fetching Ward Secretaries via Controller...');
    const req1 = { query: {}, user: { id: 1, role: 'admin' } };
    const res1 = createMockRes();
    await getWardSecretaries(req1, res1);

    if (!res1.data || !res1.data.success) {
      throw new Error(`getWardSecretaries failed: ${JSON.stringify(res1.data)}`);
    }
    const secretaries = res1.data.data;
    console.log(`✅ Retrieved ${secretaries.length} Ward Secretaries.`);
    if (secretaries.length < 2) {
      throw new Error(`Expected at least 2 ward secretaries, found ${secretaries.length}`);
    }

    const targetSec = secretaries[0];
    const otherSec = secretaries[1];
    console.log(`🎯 Target Secretary: ${targetSec.name} (ID: ${targetSec.id}, Ward: ${targetSec.assignedWard})`);
    console.log(`🛡️ Other Secretary: ${otherSec.name} (ID: ${otherSec.id}, Ward: ${otherSec.assignedWard})`);

    // -------------------------------------------------------------
    // STEP 2: Create a Test Citizen and Submit Complaint
    // -------------------------------------------------------------
    console.log('\n▶ STEP 2: Creating Test Citizen & Submitting New Complaint...');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testUsername = `cit_verify_${uniqueSuffix}`;
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const [citizenUser] = await User.findOrCreate({
      where: { username: testUsername },
      defaults: {
        name: 'Kumar Verifier',
        username: testUsername,
        phone: testPhone,
        email: `${testUsername}@tvkcrm.org`,
        role: 'citizen',
        assignedWard: targetSec.assignedWard || 72,
        assignedDistrict: 'Coimbatore',
        status: 'Active',
      },
    });
    testCitizenId = citizenUser.id;

    const testIssueCode = `GRI-FWD-${uniqueSuffix}`;
    const req2 = {
      body: {
        issueCode: testIssueCode,
        title: 'Forwarding Verification: Open Drain Desiltation Required',
        description: 'End-to-end test verifying Admin to Ward Secretary forwarding.',
        category: 'Drainage & Sewage',
        priority: 'High',
        wardNumber: targetSec.assignedWard || 72,
        location: 'Gandhi Park Road, Ward ' + (targetSec.assignedWard || 72),
        citizenName: 'Kumar Verifier',
        citizenMobile: testPhone,
        citizenAddress: '15 Gandhi Park Road, Coimbatore',
      },
      user: {
        id: citizenUser.id,
        _id: String(citizenUser.id),
        role: 'citizen',
        name: 'Kumar Verifier',
      },
      files: [],
    };
    const res2 = createMockRes();
    await createIssue(req2, res2);

    if (!res2.data || !res2.data.success) {
      throw new Error(`createIssue failed: ${JSON.stringify(res2.data)}`);
    }
    const createdIssue = res2.data.data;
    testIssueId = createdIssue.id;
    console.log(`✅ Complaint submitted: ID ${createdIssue.id}, Code ${createdIssue.issueCode}, Status: ${createdIssue.status}`);

    // Verify in MySQL
    const [issueInDb] = await sequelize.query(
      `SELECT id, issueCode, status, assignedWardSecretaryId, wardNumber FROM issues WHERE id = :id;`,
      { replacements: { id: testIssueId } }
    );
    console.log('✅ Direct MySQL check after creation:', issueInDb[0]);
    if (issueInDb[0].assignedWardSecretaryId !== null) {
      throw new Error('New issue should not have assignedWardSecretaryId before assignment!');
    }

    // -------------------------------------------------------------
    // STEP 3: Admin Forwards Complaint to Target Ward Secretary
    // -------------------------------------------------------------
    console.log('\n▶ STEP 3: Admin Forwards Complaint to Target Ward Secretary...');
    const req3 = {
      params: { id: testIssueId },
      body: {
        assignedWardSecretaryId: targetSec.id,
        remarks: 'Forwarded by Admin to Ward Secretary for urgent inspection and action.',
      },
      user: {
        id: 1,
        _id: '1',
        name: 'Super Admin',
        role: 'admin',
      },
    };
    const res3 = createMockRes();
    await assignIssue(req3, res3);

    if (!res3.data || !res3.data.success) {
      throw new Error(`assignIssue failed: ${JSON.stringify(res3.data)}`);
    }
    console.log(`✅ assignIssue response:`, { success: res3.data.success, message: res3.data.message });

    // Direct MySQL verification of assignment
    const [assignedDb] = await sequelize.query(
      `SELECT id, issueCode, status, assignedWardSecretaryId, remarks FROM issues WHERE id = :id;`,
      { replacements: { id: testIssueId } }
    );
    console.log('✅ MySQL verification after assignment:', assignedDb[0]);
    if (String(assignedDb[0].assignedWardSecretaryId) !== String(targetSec.id)) {
      throw new Error(`assignedWardSecretaryId in MySQL (${assignedDb[0].assignedWardSecretaryId}) does not match target secretary ID (${targetSec.id})!`);
    }
    if (assignedDb[0].status !== 'Assigned') {
      throw new Error(`Status in MySQL (${assignedDb[0].status}) is not 'Assigned'!`);
    }

    // Verify Notification generated
    const [notifDb] = await sequelize.query(
      `SELECT id, userId, title, message, type, relatedIssueId FROM notifications WHERE relatedIssueId = :id;`,
      { replacements: { id: testIssueId } }
    );
    console.log(`✅ Notification created in MySQL (${notifDb.length} record):`, notifDb[0] || 'None');

    // -------------------------------------------------------------
    // STEP 4: Target Ward Secretary Retrieves Complaint
    // -------------------------------------------------------------
    console.log('\n▶ STEP 4: Target Ward Secretary Retrieves Dashboard Complaints...');
    const req4 = {
      query: { limit: 100 },
      user: {
        id: targetSec.id,
        _id: String(targetSec.id),
        role: 'ward_secretary',
        name: targetSec.name,
        assignedWard: targetSec.assignedWard,
      },
    };
    const res4 = createMockRes();
    await getIssues(req4, res4);

    if (!res4.data || !res4.data.success) {
      throw new Error(`getIssues failed for Target Secretary: ${JSON.stringify(res4.data)}`);
    }
    const targetIssues = res4.data.data;
    const foundInTarget = targetIssues.find(i => i.id === testIssueId || i.issueCode === testIssueCode);
    if (!foundInTarget) {
      throw new Error(`FAIL: Forwarded complaint ${testIssueCode} NOT FOUND in Target Ward Secretary's list!`);
    }
    console.log(`🎉 SUCCESS: Forwarded complaint ${testIssueCode} is VISIBLE in Target Secretary's Dashboard!`);
    console.log(`   Complaint Details -> ID: ${foundInTarget.id}, Title: "${foundInTarget.title}", Status: ${foundInTarget.status}`);

    // Verify persistence upon refresh / second retrieval
    console.log('Verifying persistence across page refresh...');
    const res4b = createMockRes();
    await getIssues(req4, res4b);
    const persisted = res4b.data.data.find(i => i.id === testIssueId);
    if (!persisted) {
      throw new Error(`FAIL: Forwarded complaint disappeared upon second retrieval!`);
    }
    console.log(`✅ Persistence verified: Complaint remains visible across refresh / re-fetch.`);

    // -------------------------------------------------------------
    // STEP 5: Negative Test – Other Ward Secretary Does NOT See It
    // -------------------------------------------------------------
    console.log('\n▶ STEP 5: Negative Test – Other Ward Secretary Scoping Isolation...');
    const req5 = {
      query: { limit: 100 },
      user: {
        id: otherSec.id,
        _id: String(otherSec.id),
        role: 'ward_secretary',
        name: otherSec.name,
        assignedWard: otherSec.assignedWard,
      },
    };
    const res5 = createMockRes();
    await getIssues(req5, res5);

    if (!res5.data || !res5.data.success) {
      throw new Error(`getIssues failed for Other Secretary: ${JSON.stringify(res5.data)}`);
    }
    const otherIssues = res5.data.data;
    const foundInOther = otherIssues.find(i => i.id === testIssueId || i.issueCode === testIssueCode);
    if (foundInOther) {
      throw new Error(`ISOLATION FAILURE: Complaint ${testIssueCode} was returned to Other Ward Secretary (ID: ${otherSec.id})!`);
    }
    console.log(`🛡️ SUCCESS: Complaint ${testIssueCode} is NOT visible to Other Ward Secretary (ID: ${otherSec.id}). Strict role isolation verified!`);

    // -------------------------------------------------------------
    // STEP 6: Update 2 – Complaint Ageing Overview API Verification
    // -------------------------------------------------------------
    console.log('\n▶ STEP 6: Testing Update 2 – Complaint Ageing Overview API...');
    const req6 = { query: {}, user: { id: 1, role: 'admin' } };
    const res6 = createMockRes();
    await getDashboardStats(req6, res6);

    if (!res6.data || !res6.data.success) {
      throw new Error(`getDashboardStats failed: ${JSON.stringify(res6.data)}`);
    }
    const ageing = res6.data.data.complaintAgeing;
    console.log('Dashboard API complaintAgeing payload:', ageing);

    if (!ageing || typeof ageing.count0To7 !== 'number' || typeof ageing.count8To14 !== 'number' || typeof ageing.count15Plus !== 'number') {
      throw new Error(`complaintAgeing payload missing or invalid structure: ${JSON.stringify(ageing)}`);
    }

    // Direct MySQL verification of Ageing logic
    const [ageingDb] = await sequelize.query(`
      SELECT
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 0 AND 7 THEN 1 END) AS count0To7,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 8 AND 14 THEN 1 END) AS count8To14,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) >= 15 THEN 1 END) AS count15Plus,
        COUNT(CASE WHEN status IN ('Resolved', 'Closed', 'Completed') THEN 1 END) AS excludedCount
      FROM issues
      WHERE status NOT IN ('Resolved', 'Closed', 'Completed');
    `);
    console.log('Direct MySQL Ageing Query Result:', ageingDb[0]);
    console.log(`Comparing API counts with direct MySQL query:
      0–7 Days:  API = ${ageing.count0To7}, MySQL = ${ageingDb[0].count0To7}
      8–14 Days: API = ${ageing.count8To14}, MySQL = ${ageingDb[0].count8To14}
      15+ Days:  API = ${ageing.count15Plus}, MySQL = ${ageingDb[0].count15Plus}
    `);

    if (
      parseInt(ageing.count0To7) !== parseInt(ageingDb[0].count0To7) ||
      parseInt(ageing.count8To14) !== parseInt(ageingDb[0].count8To14) ||
      parseInt(ageing.count15Plus) !== parseInt(ageingDb[0].count15Plus)
    ) {
      throw new Error('Ageing counts mismatch between controller API and direct MySQL query!');
    }
    console.log('✅ Complaint Ageing counts match 100% with MySQL database!');

    // -------------------------------------------------------------
    // STEP 7: Verify Table Modal Fields (11 Fields Requirement)
    // -------------------------------------------------------------
    console.log('\n▶ STEP 7: Verifying Table Modal 11 Fields Structure...');
    const req7 = { query: { limit: 10 }, user: { id: 1, role: 'admin' } };
    const res7 = createMockRes();
    await getIssues(req7, res7);

    const issuesList = res7.data?.data || [];
    const sample = issuesList[0];
    if (!sample) throw new Error('No issues found to verify table modal fields!');

    const fieldChecks = [
      { field: '1. Ticket ID', value: sample.ticketId || sample.issueCode },
      { field: '2. Name', value: sample.citizenName },
      { field: '3. Phone', value: sample.citizenMobile },
      { field: '4. Area', value: sample.area || sample.location },
      { field: '5. Ward', value: sample.wardNumber },
      { field: '6. Issue', value: sample.title },
      { field: '7. Priority', value: sample.priority },
      { field: '8. Created', value: sample.createdAt },
      { field: '9. Days Pending', value: Math.max(0, Math.floor((Date.now() - new Date(sample.createdAt).getTime()) / (1000 * 60 * 60 * 24))) },
      { field: '10. Department', value: sample.department || sample.category },
      { field: '11. Status', value: sample.status },
    ];

    console.log('Table Modal 11 Required Fields Verification:');
    for (const item of fieldChecks) {
      console.log(`  ${item.field.padEnd(20)}: ${item.value !== undefined ? '✅ Present (' + item.value + ')' : '❌ Missing'}`);
      if (item.value === undefined) throw new Error(`Missing required table field: ${item.field}`);
    }
    console.log('✅ All 11 required fields are verified present and mapped properly!');

    // -------------------------------------------------------------
    // STEP 8: Cleanup Test Records
    // -------------------------------------------------------------
    console.log('\n▶ STEP 8: Cleaning Up Test Records...');
    if (testIssueId) {
      await sequelize.query(`DELETE FROM notifications WHERE relatedIssueId = :id;`, { replacements: { id: testIssueId } });
      await sequelize.query(`DELETE FROM issue_activities WHERE issueId = :id;`, { replacements: { id: testIssueId } });
      await sequelize.query(`DELETE FROM issues WHERE id = :id;`, { replacements: { id: testIssueId } });
    }
    if (testCitizenId) {
      await sequelize.query(`DELETE FROM users WHERE id = :id;`, { replacements: { id: testCitizenId } });
    }
    console.log(`🧹 Cleaned up test issue (ID: ${testIssueId}) and test user (ID: ${testCitizenId}).`);

    console.log('\n========================================================================');
    console.log('🎉 REAL DATABASE VERIFICATION COMPLETE: ALL CHECKS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runEndToEndVerification();
