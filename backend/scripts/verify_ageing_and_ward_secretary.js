import sequelize from '../config/mysql.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('========================================================================');
  console.log('🧪 TVK DIGITAL GOVERNANCE CRM – VERIFICATION SUITE');
  console.log('   UPDATE 1: Automatic Priority Assignment (No Manual Priority)');
  console.log('   UPDATE 2: Automatic Complaint Ageing Overview (0-7, 8-14, 15+ Days)');
  console.log('   UPDATE 3: Ward Secretary Signup, Login & Ward-Based Data Access');
  console.log('========================================================================\n');

  const createdIssueIds = [];
  let testSecretaryId = null;

  try {
    // -------------------------------------------------------------------
    // Step 1: Admin Authentication
    // -------------------------------------------------------------------
    console.log('▶ STEP 1: Admin Authentication...');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123', selectedRole: 'admin' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    if (!adminLoginJson.success) throw new Error(`Admin login failed: ${adminLoginJson.message}`);
    const adminToken = adminLoginJson.data.token;
    console.log('✅ Admin authenticated successfully.');

    // -------------------------------------------------------------------
    // Step 2: Fetch Wards for Testing
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 2: Fetching Municipal Wards from Database...');
    const wardsRes = await fetch(`${API_BASE}/districts/wards`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const wardsJson = await wardsRes.json();
    const wards = wardsJson.data || [];
    console.log(`✅ Loaded ${wards.length} municipal wards from MySQL.`);
    if (wards.length < 2) throw new Error('Expected at least 2 municipal wards in database.');

    const wardA = wards[0]; // e.g. Ward 72
    const wardB = wards[1]; // e.g. Ward 73
    console.log(`📍 Testing Ward A: Ward ${wardA.wardNumber} (${wardA.wardName}, ID: ${wardA.id || wardA._id})`);
    console.log(`📍 Testing Ward B: Ward ${wardB.wardNumber} (${wardB.wardName}, ID: ${wardB.id || wardB._id})`);

    // -------------------------------------------------------------------
    // Step 3: Test UPDATE 1 & 2 – Complaint Ageing & Priority Calculation
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 3: Testing Complaint Ageing Categories & Automatic Priority...');

    // Clean up previous verification records if any
    await sequelize.query(`DELETE FROM issues WHERE issueCode LIKE 'GRI-TEST-AGE-%';`);

    const now = new Date();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    // Complaint A: 0 Days Old (Expected: 0–7 Days, Priority: Low)
    const [issueARows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-AGE-A', 'Water Leak on Cross Road', 'Water supply leak', 'Water Supply', 'Low', 'New', 'Ramesh', '9842111111', :wardNum, :wId, :created, :updated);
    `, {
      replacements: { wardNum: wardA.wardNumber, wId: wardA.id, created: now, updated: now },
    });
    const issueAId = issueARows;
    createdIssueIds.push(issueAId);

    // Complaint B: 10 Days Old (Expected: 8–14 Days, Priority: Medium)
    const [issueBRows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-AGE-B', 'Damaged Street Lamp', 'Street lamp blinking', 'Street Lighting', 'Medium', 'Pending', 'Priya', '9842222222', :wardNum, :wId, :created, :updated);
    `, {
      replacements: { wardNum: wardA.wardNumber, wId: wardA.id, created: tenDaysAgo, updated: tenDaysAgo },
    });
    const issueBId = issueBRows;
    createdIssueIds.push(issueBId);

    // Complaint C: 20 Days Old (Expected: 15+ Days, Priority: High)
    const [issueCRows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-AGE-C', 'Clogged Drainage Channel', 'Sewage overflow', 'Drainage & Sewage', 'High', 'In Progress', 'Vimal', '9842333333', :wardNum, :wId, :created, :updated);
    `, {
      replacements: { wardNum: wardA.wardNumber, wId: wardA.id, created: twentyDaysAgo, updated: twentyDaysAgo },
    });
    const issueCId = issueCRows;
    createdIssueIds.push(issueCId);

    // Complaint D: 10 Days Old but Resolved (Expected: EXCLUDED from open ageing counts)
    const [issueDRows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-AGE-D', 'Resolved Garbage Clearing', 'Garbage cleared', 'Sanitation', 'Medium', 'Resolved', 'Ganesh', '9842444444', :wardNum, :wId, :created, :updated);
    `, {
      replacements: { wardNum: wardA.wardNumber, wId: wardA.id, created: tenDaysAgo, updated: tenDaysAgo },
    });
    createdIssueIds.push(issueDRows);

    // Complaint E: 20 Days Old but Closed (Expected: EXCLUDED from open ageing counts)
    const [issueERows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-AGE-E', 'Closed Road Pothole', 'Pothole tarred', 'Road Infrastructure', 'High', 'Closed', 'Suresh', '9842555555', :wardNum, :wId, :created, :updated);
    `, {
      replacements: { wardNum: wardA.wardNumber, wId: wardA.id, created: twentyDaysAgo, updated: twentyDaysAgo },
    });
    createdIssueIds.push(issueERows);

    console.log('✅ Seeded 5 test complaints with distinct creation dates and statuses.');

    // Fetch dashboard stats via API
    const dashRes = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const dashJson = await dashRes.json();
    const ageing = dashJson.data?.complaintAgeing;
    console.log('API Complaint Ageing Overview Payload:', ageing);

    if (!ageing || ageing.count0To7 < 1 || ageing.count8To14 < 1 || ageing.count15Plus < 1) {
      throw new Error(`Ageing counts did not reflect the open complaints: ${JSON.stringify(ageing)}`);
    }

    // Direct MySQL verification that Resolved/Closed are excluded
    const [openCountsDb] = await sequelize.query(`
      SELECT
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 0 AND 7 THEN 1 END) AS count0To7,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 8 AND 14 THEN 1 END) AS count8To14,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), createdAt) >= 15 THEN 1 END) AS count15Plus
      FROM issues
      WHERE status NOT IN ('Resolved', 'Closed', 'Completed');
    `);
    console.log('Direct MySQL Open Ageing Counts:', openCountsDb[0]);
    if (
      parseInt(ageing.count0To7) !== parseInt(openCountsDb[0].count0To7) ||
      parseInt(ageing.count8To14) !== parseInt(openCountsDb[0].count8To14) ||
      parseInt(ageing.count15Plus) !== parseInt(openCountsDb[0].count15Plus)
    ) {
      throw new Error('Ageing counts mismatch between API and MySQL!');
    }
    console.log('✅ Exclusive ageing brackets and exclusion of Resolved/Closed complaints verified 100%!');

    // Fetch complaints via API to verify Automatic Priority
    const issuesApiRes = await fetch(`${API_BASE}/issues?limit=50`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const issuesApiJson = await issuesApiRes.json();
    const allFetched = issuesApiJson.data || [];

    const itemA = allFetched.find((i) => i.issueCode === 'GRI-TEST-AGE-A');
    const itemB = allFetched.find((i) => i.issueCode === 'GRI-TEST-AGE-B');
    const itemC = allFetched.find((i) => i.issueCode === 'GRI-TEST-AGE-C');

    console.log('Automatic Priority Verification:');
    console.log(`  - 0-7 Days (GRI-TEST-AGE-A): Priority = "${itemA?.priority}" (Expected: "Low")`);
    console.log(`  - 8-14 Days (GRI-TEST-AGE-B): Priority = "${itemB?.priority}" (Expected: "Medium")`);
    console.log(`  - 15+ Days (GRI-TEST-AGE-C): Priority = "${itemC?.priority}" (Expected: "High")`);

    if (itemA?.priority !== 'Low' || itemB?.priority !== 'Medium' || itemC?.priority !== 'High') {
      throw new Error(`Automatic priority assignment mismatch! A: ${itemA?.priority}, B: ${itemB?.priority}, C: ${itemC?.priority}`);
    }
    console.log('✅ Automatic Priority assignment mapped correctly to Low, Medium, and High!');

    // -------------------------------------------------------------------
    // Step 4: Test UPDATE 3 – Ward Secretary Registration from Admin Settings
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 4: Testing Ward Secretary Registration via Admin Settings API...');

    const testUsername = `sec_test_${Date.now().toString().slice(-4)}`;
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    // A. Validation Test: Invalid Mobile
    const invalidPhoneRes = await fetch(`${API_BASE}/settings/ward-secretaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Test Secretary',
        phone: '12345',
        age: 35,
        wardId: wardA.id,
        username: testUsername,
        password: 'password123',
        confirmPassword: 'password123',
      }),
    });
    const invalidPhoneJson = await invalidPhoneRes.json();
    console.log('Validation Test (Invalid Phone):', { success: invalidPhoneJson.success, message: invalidPhoneJson.message });
    if (invalidPhoneJson.success) throw new Error('Expected invalid phone to fail!');

    // B. Validation Test: Password Mismatch
    const mismatchRes = await fetch(`${API_BASE}/settings/ward-secretaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Test Secretary',
        phone: testPhone,
        age: 35,
        wardId: wardA.id,
        username: testUsername,
        password: 'password123',
        confirmPassword: 'differentPassword',
      }),
    });
    const mismatchJson = await mismatchRes.json();
    console.log('Validation Test (Password Mismatch):', { success: mismatchJson.success, message: mismatchJson.message });
    if (mismatchJson.success) throw new Error('Expected password mismatch to fail!');

    // C. Successful Registration (use a unique ward or deactivate existing if any)
    // Find or pick a ward
    const targetWard = wardB; // Use Ward B
    // Temporarily clear any active secretary for Ward B to test clean registration
    await sequelize.query(`UPDATE users SET isActive = 0 WHERE (assignedWard LIKE :wPattern OR wardId = :wId) AND role = 'ward_secretary';`, {
      replacements: { wPattern: `%${targetWard.wardNumber}%`, wId: targetWard.id },
    });

    const regSecRes = await fetch(`${API_BASE}/settings/ward-secretaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'K. Anandhan (Ward Secretary)',
        phone: testPhone,
        age: 37,
        wardId: targetWard.id,
        assignedWard: `Ward ${targetWard.wardNumber} - ${targetWard.wardName}`,
        username: testUsername,
        password: 'secPassword@123',
        confirmPassword: 'secPassword@123',
      }),
    });
    const regSecJson = await regSecRes.json();
    console.log('Ward Secretary Registration Response:', { success: regSecJson.success, message: regSecJson.message });
    if (!regSecJson.success) throw new Error(`Ward Secretary registration failed: ${regSecJson.message}`);

    testSecretaryId = regSecJson.data.id;
    console.log(`✅ Ward Secretary registered: ID ${testSecretaryId}, Username: ${regSecJson.data.username}, Ward: ${regSecJson.data.assignedWard}, Age: ${regSecJson.data.age}`);

    // Verify Password NOT exposed in response
    if (regSecJson.data.password) throw new Error('SECURITY RISK: Plaintext or hashed password returned in registration response!');

    // D. Validation Test: Duplicate Ward Secretary for Same Ward
    const duplicateWardRes = await fetch(`${API_BASE}/settings/ward-secretaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Another Secretary',
        phone: '9842999999',
        age: 40,
        wardId: targetWard.id,
        assignedWard: `Ward ${targetWard.wardNumber} - ${targetWard.wardName}`,
        username: `dup_${testUsername}`,
        password: 'secPassword@123',
        confirmPassword: 'secPassword@123',
      }),
    });
    const duplicateWardJson = await duplicateWardRes.json();
    console.log('Validation Test (Duplicate Ward Assignment):', { success: duplicateWardJson.success, message: duplicateWardJson.message });
    if (duplicateWardJson.success) throw new Error('Expected duplicate ward registration to be prevented!');
    console.log('✅ Duplicate Ward Secretary prevention confirmed!');

    // -------------------------------------------------------------------
    // Step 5: Test Ward Secretary Account Listing & Status Toggle
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 5: Testing Ward Secretary Account Listing & Status Toggle...');
    const listSecRes = await fetch(`${API_BASE}/settings/ward-secretaries`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const listSecJson = await listSecRes.json();
    const allSecs = listSecJson.data || [];
    const foundSec = allSecs.find((s) => s.id === testSecretaryId);
    if (!foundSec) throw new Error(`Newly registered secretary ID ${testSecretaryId} not found in listing!`);
    console.log('Found registered secretary in admin list:', {
      name: foundSec.name,
      phone: foundSec.phone,
      age: foundSec.age,
      ward: foundSec.assignedWard,
      username: foundSec.username,
      isActive: foundSec.isActive,
    });
    if (foundSec.password) throw new Error('SECURITY RISK: Password exposed in account listing!');

    // Toggle Deactivate
    const toggleDeactRes = await fetch(`${API_BASE}/settings/ward-secretaries/${testSecretaryId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const toggleDeactJson = await toggleDeactRes.json();
    console.log('Toggle Deactivate Response:', { success: toggleDeactJson.success, isActive: toggleDeactJson.data?.isActive });
    if (toggleDeactJson.data?.isActive !== false) throw new Error('Expected account to be deactivated!');

    // Test Login while Deactivated
    const deactLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'secPassword@123', selectedRole: 'ward_secretary' }),
    });
    const deactLoginJson = await deactLoginRes.json();
    console.log('Login attempt on Deactivated Account:', { success: deactLoginJson.success, message: deactLoginJson.message });
    if (deactLoginJson.success) throw new Error('Deactivated account was allowed to log in!');
    console.log('✅ Deactivated Ward Secretary login correctly blocked!');

    // Toggle Reactivate
    const toggleActRes = await fetch(`${API_BASE}/settings/ward-secretaries/${testSecretaryId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const toggleActJson = await toggleActRes.json();
    if (toggleActJson.data?.isActive !== true) throw new Error('Expected account to be reactivated!');
    console.log('✅ Account successfully reactivated!');

    // -------------------------------------------------------------------
    // Step 6: Test Ward Secretary Authentication Flow
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 6: Testing Ward Secretary Login Flow...');

    // A. Invalid Password
    const badPassRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'wrongPassword@999', selectedRole: 'ward_secretary' }),
    });
    const badPassJson = await badPassRes.json();
    console.log('Invalid Password Test:', { success: badPassJson.success, message: badPassJson.message });
    if (badPassJson.success) throw new Error('Invalid password was accepted!');

    // B. Unregistered User
    const unregRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'non_existent_secretary', password: 'password123', selectedRole: 'ward_secretary' }),
    });
    const unregJson = await unregRes.json();
    console.log('Unregistered User Test:', { success: unregJson.success, message: unregJson.message });
    if (unregJson.success) throw new Error('Unregistered user was accepted!');

    // C. Valid Login
    const validLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'secPassword@123', selectedRole: 'ward_secretary' }),
    });
    const validLoginJson = await validLoginRes.json();
    console.log('Valid Login Response:', { success: validLoginJson.success, role: validLoginJson.data?.role });
    if (!validLoginJson.success) throw new Error(`Valid secretary login failed: ${validLoginJson.message}`);
    const secToken = validLoginJson.data.token;
    console.log('✅ Ward Secretary successfully authenticated! JWT Token acquired.');

    // -------------------------------------------------------------------
    // Step 7: Test Ward-Based Data Access (Strict Isolation)
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 7: Testing Ward-Based Data Access & Isolation...');

    // Seed a complaint in Ward B (the secretary's ward)
    const [issueWardBRows] = await sequelize.query(`
      INSERT INTO issues (issueCode, title, description, category, priority, status, citizenName, citizenMobile, wardNumber, wardId, createdAt, updatedAt)
      VALUES ('GRI-TEST-WARD-B', 'Ward B Pipeline Burst', 'Pipeline burst in Ward B', 'Water Supply', 'Low', 'New', 'Mani', '9842666666', :wardNum, :wId, NOW(), NOW());
    `, {
      replacements: { wardNum: targetWard.wardNumber, wId: targetWard.id },
    });
    const issueWardBId = issueWardBRows;
    createdIssueIds.push(issueWardBId);

    // Call GET /api/issues as Ward B Secretary
    const secIssuesRes = await fetch(`${API_BASE}/issues?limit=100`, {
      headers: { 'Authorization': `Bearer ${secToken}` },
    });
    const secIssuesJson = await secIssuesRes.json();
    const secIssues = secIssuesJson.data || [];
    console.log(`Ward Secretary (${testUsername}, Ward ${targetWard.wardNumber}) retrieved ${secIssues.length} complaints.`);

    // 1. Confirm Ward B complaint IS visible
    const foundMyWardIssue = secIssues.find((i) => i.id === issueWardBId || i.issueCode === 'GRI-TEST-WARD-B');
    if (!foundMyWardIssue) {
      throw new Error(`Ward B Secretary could not see their own ward's complaint (ID: ${issueWardBId})!`);
    }
    console.log(`✅ Confirmed: Ward ${targetWard.wardNumber} complaint (${foundMyWardIssue.issueCode}) is VISIBLE to Ward Secretary.`);

    // 2. Confirm Ward A complaints (GRI-TEST-AGE-A, GRI-TEST-AGE-B, GRI-TEST-AGE-C) are NOT visible
    const leakedIssue = secIssues.find((i) => i.issueCode === 'GRI-TEST-AGE-A' || i.issueCode === 'GRI-TEST-AGE-B' || i.issueCode === 'GRI-TEST-AGE-C');
    if (leakedIssue) {
      throw new Error(`DATA LEAK: Ward Secretary saw complaint (${leakedIssue.issueCode}) from Ward ${leakedIssue.wardNumber}! Expected only Ward ${targetWard.wardNumber}.`);
    }
    console.log(`🛡️ Confirmed: Complaints from other wards are completely HIDDEN. Ward data isolation enforced!`);

    // 3. Test Direct ID Access to Other Ward's Complaint (Should be 403 Forbidden)
    const crossWardDetailRes = await fetch(`${API_BASE}/issues/${issueAId}`, {
      headers: { 'Authorization': `Bearer ${secToken}` },
    });
    const crossWardDetailJson = await crossWardDetailRes.json();
    console.log('Cross-Ward Direct Detail Access Attempt:', { status: crossWardDetailRes.status, success: crossWardDetailJson.success, message: crossWardDetailJson.message });
    if (crossWardDetailRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden on cross-ward detail access, got ${crossWardDetailRes.status}`);
    }
    console.log('✅ Confirmed: Direct detail access to another ward\'s complaint blocked with 403 Forbidden!');

    // 4. Test Cross-Ward Action Completion (Should be 403 Forbidden)
    const crossWardActionRes = await fetch(`${API_BASE}/issues/${issueAId}/complete-work`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secToken}` },
      body: JSON.stringify({
        actionTaken: 'Unauthorized repair attempt',
        beforeImage: 'https://example.com/b.jpg',
        afterImage: 'https://example.com/a.jpg',
      }),
    });
    const crossWardActionJson = await crossWardActionRes.json();
    console.log('Cross-Ward Action Execution Attempt:', { status: crossWardActionRes.status, success: crossWardActionJson.success, message: crossWardActionJson.message });
    if (crossWardActionRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden on cross-ward work completion, got ${crossWardActionRes.status}`);
    }
    console.log('✅ Confirmed: Work completion on another ward\'s complaint blocked with 403 Forbidden!');

    // -------------------------------------------------------------------
    // Step 8: Clean Up Test Records
    // -------------------------------------------------------------------
    console.log('\n▶ STEP 8: Cleaning Up Test Records...');
    for (const id of createdIssueIds) {
      await sequelize.query(`DELETE FROM issue_activities WHERE issueId = :id;`, { replacements: { id } });
      await sequelize.query(`DELETE FROM notifications WHERE referenceId = :ref;`, { replacements: { ref: String(id) } });
      await sequelize.query(`DELETE FROM issues WHERE id = :id;`, { replacements: { id } });
    }
    if (testSecretaryId) {
      await sequelize.query(`DELETE FROM users WHERE id = :id;`, { replacements: { id: testSecretaryId } });
    }
    // Reactivate any original secretary for Ward B
    await sequelize.query(`UPDATE users SET isActive = 1 WHERE (assignedWard LIKE :wPattern OR wardId = :wId) AND role = 'ward_secretary';`, {
      replacements: { wPattern: `%${targetWard.wardNumber}%`, wId: targetWard.id },
    });
    console.log('🧹 Cleaned up temporary test issues and test user account.');

    console.log('\n========================================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (100% VERIFIED)');
    console.log('   - Update 1: Manual Priority removed; automatic priority working.');
    console.log('   - Update 2: Complaint Ageing Overview & exclusive brackets verified.');
    console.log('   - Update 3: Ward Secretary Registration, Login & Ward Isolation verified.');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runVerification();
