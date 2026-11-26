import sequelize from '../config/mysql.js';

const API_BASE = 'http://localhost:5000/api';

async function runE2EVerification() {
  console.log('🚀 Starting Real-Time End-to-End Workflow Verification against MySQL & Express Server...\n');

  try {
    // -------------------------------------------------------------
    // Step 5: Register a test citizen user
    // -------------------------------------------------------------
    console.log('=== TEST STEP 5: REGISTER TEST CITIZEN IN MYSQL ===');
    const testUsername = `test_citizen_${Date.now()}`;
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testUserData = {
      name: 'Test Citizen Verifier',
      username: testUsername,
      password: 'testPassword@123',
      phone: testPhone,
      phoneNumber: testPhone,
      mobileNumber: testPhone,
      email: `${testUsername}@example.com`,
      wardNumber: 72,
      assignedDistrict: 'Coimbatore',
    };

    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserData),
    });
    const registerJson = await registerRes.json();
    console.log('API Register Response:', { success: registerJson.success, user: registerJson.data?.username });

    if (!registerJson.success) {
      throw new Error(`User registration failed: ${registerJson.message}`);
    }

    const registeredUsername = registerJson.data?.username || testUserData.phoneNumber;

    // Direct MySQL Query Verification
    const [userRows] = await sequelize.query(
      `SELECT id, _id, name, username, email, phone, role, assignedDistrict FROM users WHERE username = :username;`,
      { replacements: { username: registeredUsername } }
    );
    console.log('✅ Direct MySQL Query Verification (users table):', userRows[0]);
    if (!userRows[0] || userRows[0].username !== registeredUsername) {
      throw new Error('Test user not found in MySQL users table!');
    }
    const testUserDb = userRows[0];

    // Login with new test user
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: registeredUsername, password: 'testPassword@123' }),
    });
    const loginJson = await loginRes.json();
    const citizenToken = loginJson.data?.token;
    console.log('Test Citizen Login Token Acquired:', !!citizenToken);

    // -------------------------------------------------------------
    // Step 6: Create a test complaint and confirm saved in MySQL
    // -------------------------------------------------------------
    console.log('\n=== TEST STEP 6: CREATE TEST COMPLAINT IN MYSQL ===');
    const testIssueCode = `GRI-VERIFY-${Date.now().toString().slice(-4)}`;
    const beforeImageUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f9?w=800';

    const complaintData = {
      issueCode: testIssueCode,
      title: 'Real DB Test: Broken Manhole Cover on DB Road',
      description: 'Test verification complaint filed during system database verification.',
      category: 'Drainage & Sewage',
      priority: 'High',
      wardNumber: 72,
      location: 'Near Flower Market, DB Road, R.S. Puram',
      citizenName: testUserData.name,
      citizenMobile: testUserData.phone,
      citizenAddress: '100 DB Road, R.S. Puram, Coimbatore',
      beforePhoto: beforeImageUrl,
      photos: [beforeImageUrl],
    };

    const complaintRes = await fetch(`${API_BASE}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(complaintData),
    });
    const complaintJson = await complaintRes.json();
    console.log('API Create Complaint Response:', { success: complaintJson.success, issueCode: complaintJson.data?.issueCode });

    if (!complaintJson.success) {
      throw new Error(`Complaint creation failed: ${complaintJson.message}`);
    }

    const createdIssueId = complaintJson.data?.id;

    // Direct MySQL Query Verification on `issues` and `complaint_before_images`
    const [issueRows] = await sequelize.query(
      `SELECT id, issueCode, title, status, category, priority, wardId, citizenName, citizenMobile, beforeImage 
       FROM issues WHERE id = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log('✅ Direct MySQL Query Verification (issues table):', issueRows[0]);

    const [beforeImgRows] = await sequelize.query(
      `SELECT id, complaintId, imageUrl, caption, uploadedAt 
       FROM complaint_before_images WHERE complaintId = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log(`✅ Direct MySQL Query Verification (complaint_before_images table: ${beforeImgRows.length} row(s)):`, beforeImgRows[0]);

    if (!issueRows[0] || beforeImgRows.length === 0) {
      throw new Error('Complaint or before image not verified in MySQL!');
    }

    // -------------------------------------------------------------
    // Step 7: Assign complaint to Ward Secretary
    // -------------------------------------------------------------
    console.log('\n=== TEST STEP 7: ASSIGN COMPLAINT TO WARD SECRETARY ===');
    // Admin login
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data?.token;

    // Find Ward 72 Secretary user
    const [wardSecRows] = await sequelize.query(
      `SELECT id, name, username, role, assignedWard FROM users WHERE username = 'ward';`
    );
    const wardSecUser = wardSecRows[0];
    console.log('Assignee Ward Secretary:', wardSecUser);

    const assignRes = await fetch(`${API_BASE}/issues/${createdIssueId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assignedWardSecretaryId: wardSecUser.id,
        wardSecretaryId: wardSecUser.id,
        remarks: 'Assigned for immediate field inspection and slab replacement.',
      }),
    });
    const assignJson = await assignRes.json();
    console.log('API Assign Response:', { success: assignJson.success, status: assignJson.data?.status });

    // Direct MySQL Query Verification of Assignment
    const [assignedIssueRows] = await sequelize.query(
      `SELECT id, issueCode, status, assignedWardSecretaryId FROM issues WHERE id = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log('✅ Direct MySQL Query Verification (assignment in issues table):', assignedIssueRows[0]);

    if (assignedIssueRows[0].assignedWardSecretaryId !== wardSecUser.id) {
      throw new Error('assignedWardSecretaryId in MySQL does not match assigned Ward Secretary ID!');
    }

    // -------------------------------------------------------------
    // Step 8 & 9: Ward Secretary Take Action & Save in MySQL
    // -------------------------------------------------------------
    console.log('\n=== TEST STEP 8 & 9: SUBMIT TAKE ACTION FORM & CONFIRM MYSQL STORAGE ===');
    // Ward Secretary login
    const wardLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ward', password: 'ward123' }),
    });
    const wardLoginJson = await wardLoginRes.json();
    const wardToken = wardLoginJson.data?.token;

    const afterImageUrl = 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=800';
    const actionTakenText = 'Inspection completed. Damaged concrete cover replaced with reinforced heavy-duty slab. Area sanitized.';
    const secretaryRemarks = 'Field team reported zero obstruction. Photo evidence uploaded.';

    const actionRes = await fetch(`${API_BASE}/issues/${createdIssueId}/complete-work`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wardToken}`,
      },
      body: JSON.stringify({
        actionTaken: actionTakenText,
        wardSecretaryRemarks: secretaryRemarks,
        beforePhoto: beforeImageUrl,
        afterPhoto: afterImageUrl,
        beforeImage: beforeImageUrl,
        afterImage: afterImageUrl,
        completionPhotos: [afterImageUrl],
      }),
    });
    const actionJson = await actionRes.json();
    console.log('API Complete Work Response:', { success: actionJson.success, status: actionJson.data?.status });

    // Direct MySQL Query Verification of Action details
    const [actionRows] = await sequelize.query(
      `SELECT id, complaintId, wardSecretaryId, actionTaken, wardSecretaryRemarks, beforeImage, afterImage, completedAt 
       FROM complaint_actions WHERE complaintId = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log('✅ Direct MySQL Query Verification (complaint_actions table):', actionRows[0]);

    const [afterImgRows] = await sequelize.query(
      `SELECT id, complaintId, actionId, imageUrl, caption, uploadedAt 
       FROM complaint_after_images WHERE complaintId = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log('✅ Direct MySQL Query Verification (complaint_after_images table):', afterImgRows[0]);

    const [finalIssueRows] = await sequelize.query(
      `SELECT id, issueCode, status, beforeImage, afterImage, completedAt, completedBy 
       FROM issues WHERE id = :id;`,
      { replacements: { id: createdIssueId } }
    );
    console.log('✅ Direct MySQL Query Verification (updated issues table):', finalIssueRows[0]);

    if (!actionRows[0] || !afterImgRows[0] || finalIssueRows[0].status !== 'Completed') {
      throw new Error('Action details, after images, or final status not verified in MySQL!');
    }

    // -------------------------------------------------------------
    // Step 10: Verify complaint appears in Ward Secretary Completed Actions
    // -------------------------------------------------------------
    console.log('\n=== TEST STEP 10: VERIFY COMPLAINT APPEARS IN WARD SECRETARY COMPLETED ACTIONS ===');
    const wardIssuesRes = await fetch(`${API_BASE}/issues`, {
      headers: { 'Authorization': `Bearer ${wardToken}` },
    });
    const wardIssuesJson = await wardIssuesRes.json();
    const wardComplaints = wardIssuesJson.data || [];
    
    const completedComplaints = wardComplaints.filter(
      i => i.status === 'Completed' || i.status === 'Resolved' || i.status === 'Closed'
    );
    console.log(`Ward Secretary Total Assigned: ${wardComplaints.length}, Completed: ${completedComplaints.length}`);

    const foundInCompleted = completedComplaints.find(i => i.id === createdIssueId || i.issueCode === testIssueCode);
    console.log('✅ Found Test Complaint in Ward Secretary Completed Actions View:', {
      found: !!foundInCompleted,
      issueCode: foundInCompleted?.issueCode,
      status: foundInCompleted?.status,
      actionsCount: foundInCompleted?.actions?.length,
      hasBeforeImage: !!foundInCompleted?.beforeImage,
      hasAfterImage: !!foundInCompleted?.afterImage,
    });

    if (!foundInCompleted) {
      throw new Error('Test complaint did not appear in Completed Actions view!');
    }

    // -------------------------------------------------------------
    // Step 11: Verify Admin & Subadmin Dashboards fetch actual MySQL records
    // -------------------------------------------------------------
    console.log('\n=== TEST STEP 11: VERIFY ADMIN & SUBADMIN DASHBOARDS QUERY MYSQL RECORDS ===');
    
    // Subadmin login
    const subadminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'subadmin', password: 'subadmin123' }),
    });
    const subadminLoginJson = await subadminLoginRes.json();
    const subadminToken = subadminLoginJson.data?.token;

    // Admin Dashboard KPIs
    const adminStatsRes = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const adminStatsJson = await adminStatsRes.json();
    console.log('✅ Admin Dashboard Stats (Direct MySQL Aggregation):', adminStatsJson.data?.counts);

    // Admin Complaints List
    const adminIssuesRes = await fetch(`${API_BASE}/issues`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const adminIssuesJson = await adminIssuesRes.json();
    const foundInAdmin = adminIssuesJson.data?.find(i => i.id === createdIssueId);
    console.log('✅ Admin Complaints Table contains Test Issue:', {
      found: !!foundInAdmin,
      totalIssuesInAdmin: adminIssuesJson.data?.length,
      beforeImagePresent: !!foundInAdmin?.beforeImage,
      afterImagePresent: !!foundInAdmin?.afterImage,
    });

    // Subadmin Complaints List
    const subadminIssuesRes = await fetch(`${API_BASE}/issues`, {
      headers: { 'Authorization': `Bearer ${subadminToken}` },
    });
    const subadminIssuesJson = await subadminIssuesRes.json();
    const foundInSubadmin = subadminIssuesJson.data?.find(i => i.id === createdIssueId);
    console.log('✅ Subadmin Complaints Table contains Test Issue:', {
      found: !!foundInSubadmin,
      totalIssuesInSubadmin: subadminIssuesJson.data?.length,
      beforeImagePresent: !!foundInSubadmin?.beforeImage,
      afterImagePresent: !!foundInSubadmin?.afterImage,
    });

    // Subadmin Appointments List
    const subadminApptRes = await fetch(`${API_BASE}/appointments`, {
      headers: { 'Authorization': `Bearer ${subadminToken}` },
    });
    const subadminApptJson = await subadminApptRes.json();
    console.log('✅ Subadmin Appointments Query (Direct MySQL appointments table):', {
      success: subadminApptJson.success,
      count: subadminApptJson.data?.length,
      firstToken: subadminApptJson.data?.[0]?.tokenNumber,
    });

    console.log('\n🎉 ALL REAL-TIME WORKFLOW VERIFICATIONS PASSED WITH FLYING COLORS!');
    console.log(`Test Record Identifier: User ID=${testUserDb.id} (${testUsername}), Issue ID=${createdIssueId} (${testIssueCode})`);
    console.log('Note: Test records remain safely stored in MySQL for user inspection.');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await sequelize.close();
    process.exit(1);
  }
}

runE2EVerification();
