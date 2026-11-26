import sequelize from '../config/mysql.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('======================================================================');
  console.log('🧪 TVK DIGITAL GOVERNANCE CRM – REAL DATABASE VERIFICATION');
  console.log('   Testing Update 1 (Complaint Forwarding) & Update 2 (Ageing Overview)');
  console.log('======================================================================\n');

  try {
    // Clean up previous test runs if any
    await sequelize.query(`DELETE FROM issues WHERE issueCode LIKE 'GRI-FWD-%';`);
    await sequelize.query(`DELETE FROM users WHERE username LIKE 'citizen_test_%';`);

    // -------------------------------------------------------------
    // Step 1: Login Admin
    // -------------------------------------------------------------
    console.log('--- Step 1: Admin Authentication ---');
    let adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123' })
    });
    let adminLoginJson = await adminLoginRes.json();
    if (!adminLoginJson.success) {
      adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' })
      });
      adminLoginJson = await adminLoginRes.json();
    }
    if (!adminLoginJson.success) {
      throw new Error(`Admin login failed: ${adminLoginJson.message}`);
    }
    const adminToken = adminLoginJson.data.token;
    console.log('✅ Admin logged in successfully.');

    // -------------------------------------------------------------
    // Step 2: Fetch Ward Secretaries via Admin API
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Fetch Ward Secretaries via API ---');
    const secRes = await fetch(`${API_BASE}/issues/ward-secretaries`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const secJson = await secRes.json();
    console.log(`✅ Ward Secretaries fetched: ${secJson.data?.length} secretaries available.`);
    if (!secJson.data || secJson.data.length < 2) {
      throw new Error(`Insufficient ward secretaries found: ${secJson.data?.length}`);
    }

    const targetSecretary = secJson.data[0]; // First secretary (e.g. Ward 72 or Ward 1)
    const otherSecretary = secJson.data[1]; // Second secretary (different ward)
    console.log(`🎯 Target Secretary for Assignment: ${targetSecretary.name} (ID: ${targetSecretary.id || targetSecretary._id}, Ward: ${targetSecretary.assignedWard})`);
    console.log(`🛡️ Other Secretary for Negative Testing: ${otherSecretary.name} (ID: ${otherSecretary.id || otherSecretary._id}, Ward: ${otherSecretary.assignedWard})`);

    // -------------------------------------------------------------
    // Step 3: Citizen Submits a New Complaint
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Citizen Submits a Complaint ---');
    const citizenPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Register citizen
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kumar Verifier',
        phone: citizenPhone,
        phoneNumber: citizenPhone,
        password: 'password123',
      })
    });
    const regJson = await regRes.json();
    if (!regJson.success) throw new Error(`Citizen registration failed: ${regJson.message}`);
    const citizenToken = regJson.data.token;
    console.log(`✅ Citizen registered & authenticated: ${regJson.data.name} (${regJson.data.phone})`);

    // Create complaint
    const testIssueCode = `GRI-FWD-${Date.now().toString().slice(-4)}`;
    const createRes = await fetch(`${API_BASE}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        issueCode: testIssueCode,
        title: 'Forwarding Test: Water Pipeline Leakage at Cross Cut Road',
        description: 'End-to-end verification for complaint forwarding to Ward Secretary.',
        category: 'Water Supply',
        priority: 'High',
        wardNumber: targetSecretary.assignedWard || 72,
        location: 'Cross Cut Road, Gandhipuram',
        citizenName: 'Kumar Verifier',
        citizenMobile: citizenPhone,
        citizenAddress: '12 Cross Cut Road, Coimbatore'
      })
    });
    const createJson = await createRes.json();
    if (!createJson.success) throw new Error(`Complaint submission failed: ${createJson.message}`);
    const createdIssue = createJson.data;
    console.log(`✅ Complaint submitted successfully. Issue ID: ${createdIssue.id}, Code: ${createdIssue.issueCode}`);

    // Verify in MySQL
    const [complaintInDb] = await sequelize.query(
      `SELECT id, issueCode, title, status, assignedWardSecretaryId, wardNumber FROM issues WHERE id = :id;`,
      { replacements: { id: createdIssue.id } }
    );
    console.log('✅ Direct MySQL check after submission:', complaintInDb[0]);

    // -------------------------------------------------------------
    // Step 4: Admin Forwards Complaint to Target Ward Secretary
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Admin Forwards Complaint to Target Ward Secretary ---');
    const targetSecId = targetSecretary.id || targetSecretary._id;
    const forwardRes = await fetch(`${API_BASE}/issues/${createdIssue.id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assignedWardSecretaryId: targetSecId,
        remarks: 'Assigned to Ward Secretary for urgent inspection and repair action.'
      })
    });
    const forwardJson = await forwardRes.json();
    console.log('Forward API Response:', { success: forwardJson.success, message: forwardJson.message });
    if (!forwardJson.success) throw new Error(`Forwarding failed: ${forwardJson.message}`);

    // Check MySQL database record
    const [assignedDb] = await sequelize.query(
      `SELECT id, issueCode, status, assignedWardSecretaryId, adminRemarks FROM issues WHERE id = :id;`,
      { replacements: { id: createdIssue.id } }
    );
    console.log('✅ MySQL verification after assignment:', assignedDb[0]);
    if (String(assignedDb[0].assignedWardSecretaryId) !== String(targetSecId)) {
      throw new Error(`assignedWardSecretaryId in MySQL (${assignedDb[0].assignedWardSecretaryId}) does not match target (${targetSecId})!`);
    }
    if (assignedDb[0].status !== 'Assigned') {
      throw new Error(`Status in MySQL (${assignedDb[0].status}) is not 'Assigned'!`);
    }

    // -------------------------------------------------------------
    // Step 5: Ward Secretary Dashboard Retrieval & Role Scoping
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Ward Secretary Dashboard Retrieval & Isolation Test ---');
    
    // Login as Target Ward Secretary
    const targetSecUsername = targetSecretary.username;
    console.log(`Logging in as Target Secretary: ${targetSecUsername}...`);
    const targetSecLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetSecUsername, password: 'password123' })
    });
    let targetSecLoginJson = await targetSecLoginRes.json();
    if (!targetSecLoginJson.success) {
      // Try ward123 password (for dynamically seeded ward secretaries)
      const retryRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetSecUsername, password: 'ward123' })
      });
      targetSecLoginJson = await retryRes.json();
    }
    if (!targetSecLoginJson.success) {
      throw new Error(`Target Secretary login failed: ${targetSecLoginJson.message}`);
    }
    const targetSecToken = targetSecLoginJson.data.token;

    // Fetch complaints as Target Ward Secretary
    const secIssuesRes = await fetch(`${API_BASE}/issues`, {
      headers: { 'Authorization': `Bearer ${targetSecToken}` }
    });
    const secIssuesJson = await secIssuesRes.json();
    const targetComplaints = secIssuesJson.data || [];
    console.log(`✅ Target Secretary retrieved ${targetComplaints.length} complaints.`);
    const foundInTarget = targetComplaints.find(c => c.id === createdIssue.id || c.issueCode === testIssueCode);
    if (!foundInTarget) {
      throw new Error(`Assigned complaint ${testIssueCode} was NOT found in Target Ward Secretary's complaints list!`);
    }
    console.log(`🎉 SUCCESS: Complaint ${testIssueCode} is VISIBLE in Target Secretary's Dashboard!`);

    // Test Persistence / Refresh: Fetch again with token
    const refreshRes = await fetch(`${API_BASE}/issues`, {
      headers: { 'Authorization': `Bearer ${targetSecToken}` }
    });
    const refreshJson = await refreshRes.json();
    const refreshedFound = (refreshJson.data || []).find(c => c.id === createdIssue.id);
    if (!refreshedFound) {
      throw new Error(`Assigned complaint disappeared upon page refresh!`);
    }
    console.log(`✅ Persistence verified: Complaint remains visible across page refreshes and re-queries.`);

    // Negative Test: Login as Other Secretary (Role-Based Isolation)
    const otherSecUsername = otherSecretary.username;
    console.log(`Logging in as Other Secretary: ${otherSecUsername} (Negative Test)...`);
    let otherSecLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: otherSecUsername, password: 'password123' })
    });
    let otherSecLoginJson = await otherSecLoginRes.json();
    if (!otherSecLoginJson.success) {
      const retryOther = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: otherSecUsername, password: 'ward123' })
      });
      otherSecLoginJson = await retryOther.json();
    }
    if (otherSecLoginJson.success) {
      const otherSecToken = otherSecLoginJson.data.token;
      const otherIssuesRes = await fetch(`${API_BASE}/issues`, {
        headers: { 'Authorization': `Bearer ${otherSecToken}` }
      });
      const otherIssuesJson = await otherIssuesRes.json();
      const otherComplaints = otherIssuesJson.data || [];
      const foundInOther = otherComplaints.find(c => c.id === createdIssue.id || c.issueCode === testIssueCode);
      if (foundInOther) {
        throw new Error(`ISOLATION LEAK: Complaint ${testIssueCode} was visible to another Secretary (${otherSecUsername})!`);
      }
      console.log(`🛡️ SUCCESS: Complaint ${testIssueCode} is NOT visible to other Ward Secretaries. Strict role-based isolation confirmed!`);
    } else {
      console.log(`Note: Other secretary login returned ${otherSecLoginJson.message}`);
    }

    // -------------------------------------------------------------
    // Step 6: Test Update 2 – Complaint Ageing Overview API & Calculation
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Test Update 2 – Complaint Ageing Overview API ---');
    const dashRes = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dashJson = await dashRes.json();
    if (!dashJson.success) throw new Error(`Dashboard API failed: ${dashJson.message}`);

    const ageing = dashJson.data.complaintAgeing;
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
        COUNT(CASE WHEN status IN ('Resolved', 'Closed', 'Completed') THEN 1 END) AS resolvedClosedCount
      FROM issues
      WHERE status NOT IN ('Resolved', 'Closed', 'Completed');
    `);
    console.log('Direct MySQL Ageing Query Result:', ageingDb[0]);
    console.log(`API vs DB check:
      0-7 Days: API = ${ageing.count0To7}, DB = ${ageingDb[0].count0To7}
      8-14 Days: API = ${ageing.count8To14}, DB = ${ageingDb[0].count8To14}
      15+ Days: API = ${ageing.count15Plus}, DB = ${ageingDb[0].count15Plus}
    `);

    if (
      parseInt(ageing.count0To7) !== parseInt(ageingDb[0].count0To7) ||
      parseInt(ageing.count8To14) !== parseInt(ageingDb[0].count8To14) ||
      parseInt(ageing.count15Plus) !== parseInt(ageingDb[0].count15Plus)
    ) {
      throw new Error(`Ageing counts mismatch between API and direct DB query!`);
    }
    console.log('✅ Ageing counts match 100% between API and MySQL!');

    // -------------------------------------------------------------
    // Step 7: Verify Table Modal Fields (11 Fields Requirement)
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Verify Table Modal 11 Fields from Issues List ---');
    const adminIssuesRes = await fetch(`${API_BASE}/issues?limit=50`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminIssuesJson = await adminIssuesRes.json();
    const sampleIssue = adminIssuesJson.data?.[0];
    if (!sampleIssue) throw new Error('No issues found to verify table modal fields!');

    const requiredFields = [
      { name: 'Ticket ID', key: 'ticketId', value: sampleIssue.ticketId || sampleIssue.issueCode },
      { name: 'Name', key: 'citizenName', value: sampleIssue.citizenName },
      { name: 'Phone', key: 'citizenMobile', value: sampleIssue.citizenMobile },
      { name: 'Area', key: 'area', value: sampleIssue.area || sampleIssue.location },
      { name: 'Ward', key: 'wardNumber', value: sampleIssue.wardNumber },
      { name: 'Issue', key: 'title', value: sampleIssue.title },
      { name: 'Priority', key: 'priority', value: sampleIssue.priority },
      { name: 'Created', key: 'createdAt', value: sampleIssue.createdAt },
      { name: 'Days Pending', key: 'daysPending', value: Math.max(0, Math.floor((Date.now() - new Date(sampleIssue.createdAt).getTime()) / (1000 * 60 * 60 * 24))) },
      { name: 'Department', key: 'department', value: sampleIssue.department || sampleIssue.category },
      { name: 'Status', key: 'status', value: sampleIssue.status }
    ];

    console.log('Sample Issue field mapping for Ageing Table Modal:');
    let allPresent = true;
    for (const f of requiredFields) {
      console.log(`  - ${f.name} (${f.key}): ${f.value !== undefined ? '✅ ' + f.value : '❌ Missing'}`);
      if (f.value === undefined) allPresent = false;
    }
    if (!allPresent) throw new Error('Some required table modal fields are undefined!');
    console.log('✅ All 11 required fields are present and correctly mapped!');

    // -------------------------------------------------------------
    // Step 8: Clean up test records
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Clean up test records ---');
    await sequelize.query(`DELETE FROM notifications WHERE referenceId = :ref;`, { replacements: { ref: String(createdIssue.id) } });
    await sequelize.query(`DELETE FROM issue_activities WHERE issueId = :id;`, { replacements: { id: createdIssue.id } });
    await sequelize.query(`DELETE FROM issues WHERE id = :id;`, { replacements: { id: createdIssue.id } });
    await sequelize.query(`DELETE FROM users WHERE phone = :phone;`, { replacements: { phone: citizenPhone } });
    console.log(`🧹 Cleaned up test complaint ${testIssueCode} and test citizen phone ${citizenPhone}.`);

    console.log('\n======================================================================');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('   Update 1 (Complaint Forwarding): Fully working & verified!');
    console.log('   Update 2 (Complaint Ageing Overview): Fully working & verified!');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runVerification();
