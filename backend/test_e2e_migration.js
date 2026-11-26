import {
  sequelize,
  User,
  Issue,
  ComplaintBeforeImage,
  ComplaintAfterImage,
  ComplaintAction,
  ComplaintStatusHistory,
  Ward,
  Constituency,
  District,
  Member,
  Project,
  Appointment,
  DepartmentOfficer,
} from './models/index.js';

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 TVK DIGITAL GOVERNANCE CRM - E2E MIGRATION TEST');
  console.log('=====================================================');

  try {
    await sequelize.authenticate();
    console.log('✅ 1. MySQL Database connection authenticated.');

    // Count records across all primary models
    const userCount = await User.count();
    const districtCount = await District.count();
    const constCount = await Constituency.count();
    const wardCount = await Ward.count();
    const officerCount = await DepartmentOfficer.count();
    const memberCount = await Member.count();
    const issueCount = await Issue.count();
    const beforeImgCount = await ComplaintBeforeImage.count();
    const afterImgCount = await ComplaintAfterImage.count();
    const actionCount = await ComplaintAction.count();
    const statusHistCount = await ComplaintStatusHistory.count();
    const projectCount = await Project.count();
    const apptCount = await Appointment.count();

    console.log('\n📊 2. MySQL Database Record Counts:');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Districts: ${districtCount}`);
    console.log(`   - Constituencies: ${constCount}`);
    console.log(`   - Wards: ${wardCount}`);
    console.log(`   - Department Officers: ${officerCount}`);
    console.log(`   - Members: ${memberCount}`);
    console.log(`   - Complaints / Issues: ${issueCount}`);
    console.log(`   - Before Images: ${beforeImgCount}`);
    console.log(`   - After Images: ${afterImgCount}`);
    console.log(`   - Complaint Actions: ${actionCount}`);
    console.log(`   - Status Histories: ${statusHistCount}`);
    console.log(`   - Projects: ${projectCount}`);
    console.log(`   - Appointments: ${apptCount}`);

    // Verify User Logins & Password Hashing
    console.log('\n🔐 3. Verifying User Credentials & Password Compatibility:');
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) throw new Error('Admin user not found');
    const isAdminMatch = await adminUser.matchPassword('admin@123');
    console.log(`   - Admin login ('admin' / 'admin@123'): ${isAdminMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

    const subadminUser = await User.findOne({ where: { username: 'subadmin' } });
    if (!subadminUser) throw new Error('Subadmin user not found');
    const isSubMatch = await subadminUser.matchPassword('subadmin123');
    console.log(`   - Subadmin login ('subadmin' / 'subadmin123'): ${isSubMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

    const wardUser = await User.findOne({ where: { username: 'ward' } });
    if (!wardUser) throw new Error('Ward user not found');
    const isWardMatch = await wardUser.matchPassword('ward123');
    console.log(`   - Ward Secretary login ('ward' / 'ward123'): ${isWardMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

    const citizenUser = await User.findOne({ where: { username: 'citizen' } });
    if (!citizenUser) throw new Error('Citizen user not found');
    const isCitizenMatch = await citizenUser.matchPassword('admin123');
    console.log(`   - Citizen login ('citizen' / 'admin123'): ${isCitizenMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Test Complete Take Action Lifecycle
    console.log('\n📋 4. Testing End-to-End Complaint Lifecycle in MySQL:');
    
    // Step A: Register new Citizen Complaint
    const testCode = `GRI-TEST-${Date.now().toString().slice(-4)}`;
    const ward72 = await Ward.findOne({ where: { wardNumber: 72 } });
    const constSouth = await Constituency.findOne({ where: { name: 'Coimbatore South' } });

    const newIssue = await Issue.create({
      issueCode: testCode,
      title: 'E2E Test: Overflowing Drainage Slabs',
      description: 'Pipeline leakage observed near D.B. Road entrance.',
      category: 'Sanitation / Drainage',
      priority: 'High',
      status: 'New',
      citizenName: 'P. Ravichandran',
      citizenMobile: '9842199999',
      location: 'D.B. Road, R.S. Puram, Ward 72',
      wardId: ward72 ? ward72.id : null,
      wardNumber: 72,
      constituencyId: constSouth ? constSouth.id : null,
      beforeImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f9?w=800',
    });

    await ComplaintBeforeImage.create({
      complaintId: newIssue.id,
      imageUrl: newIssue.beforeImage,
      caption: 'Initial Citizen Evidence',
    });
    console.log(`   - Step A: Created complaint ${testCode} in MySQL with Before Image ✅`);

    // Step B: Admin assigns complaint to Ward Secretary
    newIssue.status = 'Assigned';
    newIssue.assignedWardSecretaryId = wardUser.id;
    newIssue.adminRemarks = 'Please inspect site immediately and coordinate repair.';
    await newIssue.save();

    await ComplaintStatusHistory.create({
      complaintId: newIssue.id,
      status: 'Assigned',
      updatedBy: String(adminUser.id),
      updatedByName: adminUser.name,
      remarks: newIssue.adminRemarks,
      timestamp: new Date(),
    });
    console.log(`   - Step B: Assigned to Ward Secretary (ID: ${wardUser.id}) with status 'Assigned' ✅`);

    // Step C: Ward Secretary starts work
    newIssue.status = 'In Progress';
    newIssue.workStartedAt = new Date();
    await newIssue.save();
    console.log(`   - Step C: Ward Secretary started work (Status: In Progress) ✅`);

    // Step D: Ward Secretary takes action and submits resolution form
    const afterImgUrl = 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=800';
    const actionDescription = 'Sewerage pipeline cleared and new heavy-duty RCC cover slabs placed and cemented.';
    const secretaryRemarks = 'Inspected with municipal sanitary inspector; water drainage fully normalized.';
    const completionTime = new Date();

    newIssue.status = 'Completed';
    newIssue.afterImage = afterImgUrl;
    newIssue.actionTaken = actionDescription;
    newIssue.finalReport = actionDescription;
    newIssue.wardSecretaryRemarks = secretaryRemarks;
    newIssue.completedAt = completionTime;
    newIssue.resolvedAt = completionTime;
    newIssue.completedBy = wardUser.id;
    await newIssue.save();

    const actionRec = await ComplaintAction.create({
      complaintId: newIssue.id,
      wardSecretaryId: wardUser.id,
      actionTaken: actionDescription,
      wardSecretaryRemarks: secretaryRemarks,
      beforeImage: newIssue.beforeImage,
      afterImage: afterImgUrl,
      completedAt: completionTime,
    });

    await ComplaintAfterImage.create({
      complaintId: newIssue.id,
      actionId: actionRec.id,
      imageUrl: afterImgUrl,
      caption: 'Ground Resolution Proof',
      uploadedAt: completionTime,
    });

    await ComplaintStatusHistory.create({
      complaintId: newIssue.id,
      status: 'Completed',
      updatedBy: String(wardUser.id),
      updatedByName: wardUser.name,
      remarks: actionDescription,
      timestamp: completionTime,
    });
    console.log(`   - Step D: Action submitted & saved to relational MySQL tables ✅`);

    // Step E: Verify Completed Action remains visible and accessible in Ward Secretary Dashboard query
    const verifiedIssue = await Issue.findByPk(newIssue.id, {
      include: [
        { model: ComplaintAction, as: 'actions' },
        { model: ComplaintBeforeImage, as: 'beforeImages' },
        { model: ComplaintAfterImage, as: 'afterImages' },
        { model: ComplaintStatusHistory, as: 'statusHistories' },
        { model: User, as: 'assignedWardSecretary' },
        { model: Ward, as: 'ward' },
      ],
    });

    console.log('\n🔍 5. Verification of Completed Action in Ward Secretary & Subadmin view:');
    console.log(`   - Status: ${verifiedIssue.status} (Expected: Completed)`);
    console.log(`   - Before Image URL: ${verifiedIssue.beforeImage}`);
    console.log(`   - After Image URL: ${verifiedIssue.afterImage}`);
    console.log(`   - Action Taken: ${verifiedIssue.actionTaken}`);
    console.log(`   - Ward Secretary Remarks: ${verifiedIssue.wardSecretaryRemarks}`);
    console.log(`   - Actions count: ${verifiedIssue.actions.length}`);
    console.log(`   - Before Images count: ${verifiedIssue.beforeImages.length}`);
    console.log(`   - After Images count: ${verifiedIssue.afterImages.length}`);
    console.log(`   - Status Histories count: ${verifiedIssue.statusHistories.length}`);

    if (
      verifiedIssue.status === 'Completed' &&
      verifiedIssue.beforeImage &&
      verifiedIssue.afterImage &&
      verifiedIssue.actionTaken &&
      verifiedIssue.actions.length > 0
    ) {
      console.log('\n🎉 ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      throw new Error('Verification assertion failed!');
    }
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
