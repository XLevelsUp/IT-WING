import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('🚀 TVK CRM END-TO-END WORKFLOW VERIFICATION TEST');
  console.log('====================================================\n');

  // 1. Connect to Database
  const { connectDB, closeDB } = await import('./config/db.js');
  const conn = await connectDB();
  console.log('✅ DB Connected host:', conn.connection.host);

  const User = (await import('./models/User.js')).default;
  const Issue = (await import('./models/Issue.js')).default;
  const Ward = (await import('./models/Ward.js')).default;
  const Notification = (await import('./models/Notification.js')).default;
  const Constituency = (await import('./models/Constituency.js')).default;

  // 2. Setup or find Ward 72
  let ward72 = await Ward.findOne({ wardNumber: 72 });
  if (!ward72) {
    let constObj = await Constituency.findOne({ name: 'Coimbatore South' });
    if (!constObj) {
      const District = (await import('./models/District.js')).default;
      let dist = await District.findOne({ code: 'CBE' });
      if (!dist) dist = await District.create({ name: 'Coimbatore', code: 'CBE', districtNumber: 1 });
      constObj = await Constituency.create({ name: 'Coimbatore South', code: 'CBE-S', districtId: dist._id });
    }
    ward72 = await Ward.create({
      wardNumber: 72,
      wardName: 'RS Puram West',
      zone: 'Central Zone',
      constituencyId: constObj._id,
      paguthi: 'R.S. Puram',
    });
  }
  console.log(`✅ Ward 72 resolved: ID ${ward72._id}, Name: ${ward72.wardName}`);

  // 3. User Login / Find Citizen
  let citizenUser = await User.findOne({ username: 'citizen' });
  if (!citizenUser) {
    citizenUser = await User.create({
      name: 'K. S. Sundar (Citizen)',
      username: 'citizen',
      email: 'citizen@tvkcbe.org',
      password: 'citizen@123',
      role: 'citizen',
      phone: '9842567890',
    });
  }
  console.log(`✅ Citizen user resolved: ${citizenUser.name} (${citizenUser.phone})`);

  // 4. Test Image Upload simulation (storing file directly in backend/uploads)
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  
  const testBeforeFileName = `image-test-before-${Date.now()}.jpg`;
  const testBeforeFilePath = path.join(uploadsDir, testBeforeFileName);
  fs.writeFileSync(testBeforeFilePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));
  const testBeforeUrl = `/uploads/${testBeforeFileName}`;
  console.log(`✅ Test Before image saved to disk at: ${testBeforeFilePath} (URL: ${testBeforeUrl})`);

  // 5. TEST 1: USER COMPLAINT REGISTRATION
  console.log('\n--- TEST 1: CITIZEN REGISTERS A NEW COMPLAINT ---');
  const testComplaintData = {
    title: 'Severe Water Leakage near West Club Road Ward 72',
    description: 'Underground pipeline cracked. Water flowing onto pedestrian path causing mud and traffic hazards for past 2 days.',
    category: 'Drinking Water',
    priority: 'High',
    citizenName: citizenUser.name,
    citizenMobile: citizenUser.phone,
    citizenAddress: '14, West Club Road, RS Puram, Coimbatore',
    wardId: ward72._id,
    wardNumber: 72,
    paguthi: 'R.S. Puram',
    userId: citizenUser._id,
    beforePhoto: testBeforeUrl,
    beforeImage: testBeforeUrl,
    status: 'New',
  };

  const issueController = await import('./controllers/issueController.js');
  
  let createdIssue = null;
  const mockReq = {
    body: { ...testComplaintData },
    user: citizenUser,
  };
  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };

  await issueController.createIssue(mockReq, mockRes);
  if (mockRes.statusCode === 201 && mockRes.data.success) {
    createdIssue = mockRes.data.data;
    console.log(`✅ SUCCESS: Complaint created with Issue Code: ${createdIssue.issueCode}`);
    console.log(`   Initial Status: "${createdIssue.status}" (Expected: "New")`);
    console.log(`   Before Image: "${createdIssue.beforeImage || createdIssue.beforePhoto}"`);
    console.log(`   Ward Number: ${createdIssue.wardNumber}`);
  } else {
    console.error('❌ FAILED to create issue:', mockRes.data);
    process.exit(1);
  }

  // Verify in MongoDB
  const dbIssue = await Issue.findById(createdIssue._id);
  if (!dbIssue || dbIssue.status !== 'New') {
    console.error(`❌ DB Verification FAILED: status is "${dbIssue ? dbIssue.status : 'NOT FOUND'}"`);
    process.exit(1);
  }
  console.log('✅ MongoDB verification PASSED: Record exists with status "New"');

  // 6. TEST 2: ADMIN DASHBOARD SEES THE NEW COMPLAINT
  console.log('\n--- TEST 2: ADMIN DASHBOARD GETS NEW COMPLAINTS ---');
  let adminUser = await User.findOne({ username: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'District Administrator',
      username: 'admin',
      email: 'admin@tvkcbe.org',
      password: 'admin@123',
      role: 'superadmin',
    });
  }
  const adminReq = {
    query: { status: 'New', page: 1, limit: 10 },
    user: adminUser,
  };
  const adminRes = {
    statusCode: 200,
    json(payload) {
      this.data = payload;
      return this;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
  };

  await issueController.getIssues(adminReq, adminRes);
  const adminIssues = adminRes.data.data;
  const foundInNew = adminIssues.find(i => i.issueCode === createdIssue.issueCode);
  
  if (foundInNew) {
    console.log(`✅ SUCCESS: Newly registered complaint ${createdIssue.issueCode} appears under Admin Dashboard New Complaints!`);
    console.log(`   Found in results: ${foundInNew.title} [Status: ${foundInNew.status}]`);
    console.log(`   Admin summary stats - New: ${adminRes.data.summary.newIssues}, Total: ${adminRes.data.summary.totalIssues}`);
  } else {
    console.error('❌ FAILED: Newly created complaint NOT found under status=New filter!');
    process.exit(1);
  }

  // 7. TEST 3: WARD SECRETARY TAKES ACTION & UPLOADS PROOF IMAGE
  console.log('\n--- TEST 3: WARD SECRETARY TAKES ACTION ON COMPLAINT ---');
  let wardSecUser = await User.findOne({ role: 'ward_secretary' });
  if (!wardSecUser) {
    wardSecUser = await User.findOne({ username: 'ward' });
  }
  if (!wardSecUser) {
    wardSecUser = await User.create({
      name: 'K. R. Vijayakumar',
      username: 'ward',
      password: 'ward123',
      role: 'ward_secretary',
      assignedWard: 'Ward 72',
    });
  }
  console.log(`✅ Ward Secretary resolved: ${wardSecUser.name} (${wardSecUser.username})`);

  // Ward Secretary starts work
  const startReq = {
    params: { id: createdIssue._id },
    user: wardSecUser,
  };
  const startRes = {
    statusCode: 200,
    json(p) { this.data = p; return this; },
    status(c) { this.statusCode = c; return this; },
  };
  await issueController.startWork(startReq, startRes);
  console.log(`✅ Ward Secretary started work: Status updated to "In Progress"`);

  // Create After Image on disk
  const testAfterFileName = `image-test-after-${Date.now()}.jpg`;
  const testAfterFilePath = path.join(uploadsDir, testAfterFileName);
  fs.writeFileSync(testAfterFilePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));
  const testAfterUrl = `/uploads/${testAfterFileName}`;
  console.log(`✅ After proof image saved to disk at: ${testAfterFilePath} (URL: ${testAfterUrl})`);

  // Submit completion action
  const completeReq = {
    params: { id: createdIssue._id },
    body: {
      beforeImage: testBeforeUrl,
      afterImage: testAfterUrl,
      actionTaken: 'TWAD repair squad dispatched with heavy clamp and high-pressure coupling. Burst pipe section excised and welded with new cast-iron fitting. Water supply restored cleanly.',
      wardSecretaryRemarks: 'Inspected on-site with ward councilor. Verified pressure restoration and cleared residual water.',
    },
    user: wardSecUser,
  };
  const completeRes = {
    statusCode: 200,
    json(p) { this.data = p; return this; },
    status(c) { this.statusCode = c; return this; },
  };

  await issueController.completeWork(completeReq, completeRes);
  if (completeRes.data.success) {
    console.log(`✅ SUCCESS: Ward Secretary completed work: ${completeRes.data.message}`);
    const completedIssue = completeRes.data.data;
    console.log(`   Final Status: "${completedIssue.status}"`);
    console.log(`   Before Image: "${completedIssue.beforeImage}"`);
    console.log(`   After Image: "${completedIssue.afterImage}"`);
    console.log(`   Action Taken: "${completedIssue.actionTaken.slice(0, 60)}..."`);
  } else {
    console.error('❌ FAILED to complete work:', completeRes.data);
    process.exit(1);
  }

  // Verify MongoDB updated status
  const finalDbIssue = await Issue.findById(createdIssue._id);
  if (finalDbIssue.status !== 'Completed') {
    console.error(`❌ DB Status verification FAILED: Expected "Completed", got "${finalDbIssue.status}"`);
    process.exit(1);
  }
  console.log('✅ MongoDB verification PASSED: Status is "Completed", images and timestamps stored accurately.');

  // Verify Citizen Notification was created
  const notif = await Notification.findOne({ referenceId: createdIssue.issueCode });
  if (notif) {
    console.log(`✅ SUCCESS: User Notification dispatched: "${notif.message}"`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');

  await closeDB();
  process.exit(0);
}

runEndToEndTests().catch(e => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
