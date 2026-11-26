import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  sequelize,
  syncDatabase,
  User,
  District,
  Constituency,
  Ward,
  DepartmentOfficer,
  Member,
  Issue,
  ComplaintBeforeImage,
  ComplaintAfterImage,
  ComplaintAction,
  ComplaintStatusHistory,
  ComplaintAttachment,
  IssueActivity,
  Project,
  Appointment,
  Notification,
  GeneratedContent,
  AuditLog,
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const seedMySQLDatabase = async () => {
  try {
    console.log('🌱 Checking and seeding initial Coimbatore District data into MySQL...');

    // 1. Admin Users
    let adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Coimbatore District Administrator',
        username: 'admin',
        email: 'admin@tvkcbe.org',
        password: 'Vigneshadmin@2026',
        role: 'superadmin',
        phone: '9443012345',
        assignedDistrict: 'Coimbatore',
        assignedWard: 'All Wards',
        isActive: true,
      });
      console.log('👤 Created default superadmin: admin');
    } else {
      adminUser.password = 'Vigneshadmin@2026';
      await adminUser.save();
    }

    // Role 2: Subadmin
    let subAdmin = await User.findOne({ where: { username: 'subadmin' } });
    if (!subAdmin) {
      subAdmin = await User.create({
        name: 'Coimbatore South Sub-Administrator',
        username: 'subadmin',
        email: 'subadmin@tvkcbe.org',
        password: 'Subadmin@2024',
        role: 'subadmin',
        phone: '9443012346',
        assignedDistrict: 'Coimbatore',
        constituency: 'Coimbatore South',
        assignedWard: 'Wards 71-85',
        isActive: true,
      });
      console.log('👤 Created subadmin: subadmin');
    } else {
      subAdmin.password = 'Subadmin@2024';
      await subAdmin.save();
    }

    // Role 3: Citizen / User
    let citizenUser = await User.findOne({ where: { username: 'citizen' } });
    if (!citizenUser) {
      citizenUser = await User.create({
        name: 'K. S. Sundar (Citizen)',
        username: 'citizen',
        email: 'sundar.citizen@gmail.com',
        password: 'admin123',
        role: 'citizen',
        phone: '9842567890',
        assignedDistrict: 'Coimbatore',
        constituency: 'Coimbatore South',
        assignedWard: 'Ward 72',
        address: '42, D.B. Road, R.S. Puram, Coimbatore',
        isActive: true,
      });
    }


    // Role 4: Ward Secretary (Username: ward & wardsec72)
    let wardUser = await User.findOne({ where: { username: 'ward' } });
    if (!wardUser) {
      wardUser = await User.create({
        name: 'K. R. Vijayakumar (Ward Secretary)',
        username: 'ward',
        email: 'ward@tvkcbe.org',
        password: 'ward123',
        role: 'ward_secretary',
        phone: '9842100072',
        assignedDistrict: 'Coimbatore',
        constituency: 'Coimbatore South',
        assignedWard: 'Ward 72',
        isActive: true,
      });
      console.log('👤 Created ward secretary: ward / ward123');
    } else {
      wardUser.password = 'ward123';
      await wardUser.save();
    }

    let wardSecretary = await User.findOne({ where: { username: 'wardsec72' } });
    if (!wardSecretary) {
      wardSecretary = await User.create({
        name: 'K. R. Vijayakumar (Ward 72 Secretary)',
        username: 'wardsec72',
        email: 'secretary.ward72@tvkcbe.org',
        password: 'ward123',
        role: 'ward_secretary',
        phone: '9842100072',
        assignedDistrict: 'Coimbatore',
        constituency: 'Coimbatore South',
        assignedWard: 'Ward 72',
        isActive: true,
      });
    } else {
      wardSecretary.password = 'ward123';
      await wardSecretary.save();
    }

    // Role 5: Paguthi Seyalaalar Accounts (Pothanur, Kurichi, Sundarapuram)
    const paguthiSeyalaalarAccounts = [
      { username: 'pothanur', password: 'pothanur@2026', paguthi: 'Pothanur', name: 'Pothanur Paguthi Seyalaalar', phone: '9842100101' },
      { username: 'kurichi', password: 'kurichi@2024', paguthi: 'Kurichi', name: 'Kurichi Paguthi Seyalaalar', phone: '9842100102' },
      { username: 'sundarapuram', password: 'sundarapurum@26', paguthi: 'Sundarapuram', name: 'Sundarapuram Paguthi Seyalaalar', phone: '9842100103' },
    ];
    for (const pa of paguthiSeyalaalarAccounts) {
      let pUser = await User.findOne({ where: { username: pa.username } });
      if (!pUser) {
        await User.create({
          name: pa.name,
          username: pa.username,
          password: pa.password,
          role: 'paguthi_seyalaalar',
          paguthi: pa.paguthi,
          phone: pa.phone,
          assignedDistrict: 'Coimbatore',
          constituency: 'Kinathukadavu',
          isActive: true,
        });
      } else {
        pUser.password = pa.password;
        pUser.role = 'paguthi_seyalaalar';
        pUser.paguthi = pa.paguthi;
        await pUser.save();
      }
    }
    console.log('👤 Seeded 3 Paguthi Seyalaalar accounts (Pothanur, Kurichi, Sundarapuram)');

    // 2. District
    let district = await District.findOne({ where: { code: 'CBE' } });
    if (!district) {
      district = await District.create({
        name: 'Coimbatore',
        tamilName: 'கோயம்புத்தூர்',
        code: 'CBE',
        headquarters: 'Coimbatore Corporation Office, Town Hall',
        totalConstituencies: 10,
        totalWards: 100,
        description: 'Coimbatore District Central Governance & Citizen Grievance Portal',
      });
      console.log('🏛️ Created District: Coimbatore');
    }

    // 3. Constituencies
    const constituencyData = [
      { name: 'Coimbatore South', tamilName: 'கோயம்புத்தூர் தெற்கு', code: 'CBE-S', zone: 'South Zone', totalWards: 12, totalPaguthi: 4, paguthis: ['R.S. Puram', 'Ramanathapuram', 'Ukkadam', 'Town Hall'] },
      { name: 'Coimbatore North', tamilName: 'கோயம்புத்தூர் வடக்கு', code: 'CBE-N', zone: 'North Zone', totalWards: 11, totalPaguthi: 3, paguthis: ['Ganapathy', 'Saravanampatti', 'Gandhipuram'] },
      { name: 'Singanallur', tamilName: 'சிங்காநல்லூர்', code: 'SGL', zone: 'East Zone', totalWards: 10, totalPaguthi: 2, paguthis: ['Singanallur', 'Peelamedu'] },
      { name: 'Kavundampalayam', tamilName: 'கவுண்டம்பாளையம்', code: 'KVP', zone: 'West Zone', totalWards: 10, totalPaguthi: 2, paguthis: ['Kavundampalayam', 'Thudiyalur'] },
      { name: 'Thondamuthur', tamilName: 'தொண்டாமுத்தூர்', code: 'TDM', zone: 'West Zone', totalWards: 9, totalPaguthi: 2, paguthis: ['Thondamuthur', 'Vadavalli'] },
      { name: 'Kinathukadavu', tamilName: 'கிணத்துக்கடவு', code: 'KKD', zone: 'South Zone', totalWards: 8, totalPaguthi: 4, paguthis: ['Pothanur', 'Kurichi', 'Sundarapuram', 'Malumachampatti'] },
      { name: 'Pollachi', tamilName: 'பொள்ளாச்சி', code: 'POL', zone: 'South Zone', totalWards: 10, totalPaguthi: 3, paguthis: ['Pollachi Town', 'Mahalingapuram', 'Achipatti'] },
      { name: 'Valparai', tamilName: 'வால்பாறை', code: 'VLP', zone: 'South Zone', totalWards: 7, totalPaguthi: 2, paguthis: ['Valparai Town', 'Stanmore'] },
      { name: 'Sulur', tamilName: 'சூலூர்', code: 'SLR', zone: 'East Zone', totalWards: 9, totalPaguthi: 2, paguthis: ['Sulur', 'Kangeyampalayam'] },
      { name: 'Mettupalayam', tamilName: 'மேட்டுப்பாளையம்', code: 'MPM', zone: 'North Zone', totalWards: 10, totalPaguthi: 2, paguthis: ['Mettupalayam Town', 'Sirumugai'] },
    ];

    const constituencyMap = {};
    for (const c of constituencyData) {
      let existing = await Constituency.findOne({ where: { code: c.code } });
      if (!existing) {
        existing = await Constituency.create({ ...c, districtId: district.id });
      } else {
        existing.totalPaguthi = c.totalPaguthi;
        existing.paguthis = c.paguthis;
        await existing.save();
      }
      constituencyMap[c.name] = existing;
    }
    console.log('📍 Seeded 10 Coimbatore Constituencies with Paguthi mappings');

    // 4. Wards
    const southConst = constituencyMap['Coimbatore South'];
    const northConst = constituencyMap['Coimbatore North'];
    const singaConst = constituencyMap['Singanallur'];
    const kinathuConst = constituencyMap['Kinathukadavu'];

    const wardsData = [
      { constituencyId: southConst.id, paguthi: 'R.S. Puram', wardNumber: 72, wardName: 'R.S. Puram', tamilName: 'ஆர்.எஸ். புரம்', zone: 'Central Zone', officeBearer: 'K. R. Vijayakumar', wardSecretary: 'K. R. Vijayakumar', contactNumber: '9842100072', population: 38500, areaCoverage: 'D.B. Road, TV Samy Road, Cowley Brown Road' },
      { constituencyId: southConst.id, paguthi: 'Ramanathapuram', wardNumber: 73, wardName: 'Ramanathapuram', tamilName: 'இராமநாதபுரம்', zone: 'Central Zone', officeBearer: 'M. Anand', wardSecretary: 'M. Anand', contactNumber: '9842100073', population: 42000, areaCoverage: 'Trichy Road, Sungam, Alagesan Road' },
      { constituencyId: southConst.id, paguthi: 'Ukkadam', wardNumber: 80, wardName: 'Ukkadam', tamilName: 'உக்கடம்', zone: 'South Zone', officeBearer: 'S. Mohammed Ismail', wardSecretary: 'S. Mohammed Ismail', contactNumber: '9842100080', population: 46000, areaCoverage: 'Karumbukadai, Ukkadam Bus Stand, Bilal Nagar' },
      { constituencyId: southConst.id, paguthi: 'Town Hall', wardNumber: 82, wardName: 'Town Hall', tamilName: 'டவுன் ஹால்', zone: 'Central Zone', officeBearer: 'R. Soundararajan', wardSecretary: 'R. Soundararajan', contactNumber: '9842100082', population: 31000, areaCoverage: 'Big Bazaar Street, Raja Street, Oppanakara St' },
      { constituencyId: southConst.id, paguthi: 'Ukkadam', wardNumber: 84, wardName: 'Selvapuram', tamilName: 'செல்வபுரம்', zone: 'South Zone', officeBearer: 'P. Murugesan', wardSecretary: 'P. Murugesan', contactNumber: '9842100084', population: 34000, areaCoverage: 'Perur Main Road, Sivalingam Colony' },
      { constituencyId: southConst.id, paguthi: 'Ukkadam', wardNumber: 85, wardName: 'Kuniamuthur', tamilName: 'குனியமுத்தூர்', zone: 'South Zone', officeBearer: 'N. Palanisamy', wardSecretary: 'N. Palanisamy', contactNumber: '9842100085', population: 48000, areaCoverage: 'Palakkad Main Road, Sundakkamuthur' },
      { constituencyId: northConst.id, paguthi: 'Ganapathy', wardNumber: 54, wardName: 'Ganapathy', tamilName: 'கணபதி', zone: 'North Zone', officeBearer: 'A. Karthik', wardSecretary: 'A. Karthik', contactNumber: '9842100054', population: 52000, areaCoverage: 'Sathy Road, Textool, Maniyakarampalayam' },
      { constituencyId: northConst.id, paguthi: 'Saravanampatti', wardNumber: 57, wardName: 'Saravanampatti', tamilName: 'சரவணம்பட்டி', zone: 'North Zone', officeBearer: 'V. Prakash', wardSecretary: 'V. Prakash', contactNumber: '9842100057', population: 56000, areaCoverage: 'IT Corridor, Sivanandapuram, Keeranatham Rd' },
      { constituencyId: northConst.id, paguthi: 'Gandhipuram', wardNumber: 65, wardName: 'Gandhipuram', tamilName: 'காந்திபுரம்', zone: 'Central Zone', officeBearer: 'D. Selvaraj', wardSecretary: 'D. Selvaraj', contactNumber: '9842100065', population: 29000, areaCoverage: 'Cross Cut Road, 100 Feet Road, 7th Street' },
      { constituencyId: singaConst.id, paguthi: 'Singanallur', wardNumber: 61, wardName: 'Singanallur', tamilName: 'சிங்காநல்லூர்', zone: 'East Zone', officeBearer: 'T. Ravindran', wardSecretary: 'T. Ravindran', contactNumber: '9842100061', population: 45000, areaCoverage: 'Kamarajar Road, Neelikonampalayam, Ondipudur' },
      { constituencyId: singaConst.id, paguthi: 'Peelamedu', wardNumber: 66, wardName: 'Peelamedu', tamilName: 'பீளமேடு', zone: 'East Zone', officeBearer: 'G. Suresh', wardSecretary: 'G. Suresh', contactNumber: '9842100066', population: 49000, areaCoverage: 'Avinashi Road, PSG College, Hopes College' },
      // Kinathukadavu Wards
      { constituencyId: kinathuConst.id, paguthi: 'Kurichi', wardNumber: 96, wardName: 'Kurichi North', tamilName: 'குறிச்சி வடக்கு', zone: 'South Zone', officeBearer: 'K. M. Shanmugam', wardSecretary: 'K. M. Shanmugam', contactNumber: '9842100096', population: 42000, areaCoverage: 'Sundarapuram Junction, LIC Colony' },
      { constituencyId: kinathuConst.id, paguthi: 'Kurichi', wardNumber: 98, wardName: 'Kurichi South', tamilName: 'குறிச்சி தெற்கு', zone: 'South Zone', officeBearer: 'K. M. Shanmugam', wardSecretary: 'K. M. Shanmugam', contactNumber: '9842100098', population: 45000, areaCoverage: 'Eachanari, SIDCO Industrial Estate' },
      { constituencyId: kinathuConst.id, paguthi: 'Pothanur', wardNumber: 99, wardName: 'Pothanur Junction', tamilName: 'போத்தனூர் சந்திப்பு', zone: 'South Zone', officeBearer: 'R. Velusamy', wardSecretary: 'R. Velusamy', contactNumber: '9842100099', population: 38000, areaCoverage: 'Railway Colony, Subbiah Layout' },
      { constituencyId: kinathuConst.id, paguthi: 'Pothanur', wardNumber: 100, wardName: 'Pothanur Ward 100', tamilName: 'போத்தனூர் வார்டு 100', zone: 'South Zone', officeBearer: 'R. Velusamy', wardSecretary: 'R. Velusamy', contactNumber: '9842100010', population: 35000, areaCoverage: 'Pillaiyar Kovil St, Market Area' },
      { constituencyId: kinathuConst.id, paguthi: 'Sundarapuram', wardNumber: 94, wardName: 'Sundarapuram East', tamilName: 'சுந்தராபுரம் கிழக்கு', zone: 'South Zone', officeBearer: 'S. Thirumoorthy', wardSecretary: 'S. Thirumoorthy', contactNumber: '9842100094', population: 32000, areaCoverage: 'Chettipalayam Pirivu, Othakkalmandapam Link' },
      { constituencyId: kinathuConst.id, paguthi: 'Malumachampatti', village: 'Malumachampatti', wardNumber: 95, wardName: 'Malumichampatti South', tamilName: 'மலுமிச்சம்பட்டி தெற்கு', zone: 'South Zone', officeBearer: 'N. Arumugam', wardSecretary: 'N. Arumugam', contactNumber: '9842100095', population: 29000, areaCoverage: 'Bodipalayam, Arasur Link, Bharathi Nagar' },
    ];

    const wardDocs = [];
    for (const w of wardsData) {
      // Ensure each municipal ward has an active Ward Secretary User account
      let secUsername = w.wardNumber === 72 ? 'ward' : `ward${w.wardNumber}`;
      let wardSecUser = await User.findOne({ where: { username: secUsername } });
      if (!wardSecUser && w.contactNumber) {
        wardSecUser = await User.findOne({ where: { phone: w.contactNumber } });
      }
      if (!wardSecUser) {
        const cObj = Object.values(constituencyMap).find((c) => c.id === w.constituencyId);
        wardSecUser = await User.create({
          name: `${w.wardSecretary} (Ward ${w.wardNumber} Secretary)`,
          username: secUsername,
          email: `ward${w.wardNumber}@tvkcbe.org`,
          password: 'ward123',
          role: 'ward_secretary',
          phone: w.contactNumber,
          assignedDistrict: 'Coimbatore',
          constituency: cObj ? cObj.name : 'Coimbatore South',
          assignedWard: `Ward ${w.wardNumber}`,
          isActive: true,
        });
      }

      let existing = await Ward.findOne({ where: { wardNumber: w.wardNumber } });
      if (!existing) {
        w.wardSecretaryId = wardSecUser ? wardSecUser.id : (w.wardNumber === 72 && wardUser ? wardUser.id : null);
        existing = await Ward.create(w);
      } else {
        existing.paguthi = w.paguthi;
        if (w.village) existing.village = w.village;
        existing.wardSecretary = w.wardSecretary;
        existing.constituencyId = w.constituencyId;
        existing.wardSecretaryId = wardSecUser ? wardSecUser.id : (w.wardNumber === 72 && wardUser ? wardUser.id : existing.wardSecretaryId);
        await existing.save();
      }
      wardDocs.push(existing);
    }
    console.log(`🏘️ Seeded ${wardDocs.length} Municipal Wards across Constituencies & Paguthis`);

    // 5. Department Officers
    const officersData = [
      { officerName: 'Er. R. Balasubramaniam', department: 'TWAD Board (Water Supply)', designation: 'Superintending Engineer', contactNumber: '+91 94433 11223', email: 'se.twad.cbe@tn.gov.in', officeAddress: 'TWAD Board Complex, Tatabad, Coimbatore', workingArea: 'Coimbatore District Water Grid' },
      { officerName: 'Er. K. Natarajan', department: 'TANGEDCO (Electricity)', designation: 'Executive Engineer (Distribution)', contactNumber: '+91 94433 44556', email: 'ee.tangedco.cbe@tneb.in', officeAddress: 'TANGEDCO Metro Office, Tatabad', workingArea: 'Central & South Zones' },
      { officerName: 'Dr. K. Arulmozhi', department: 'Public Health & Sanitation', designation: 'City Health Officer', contactNumber: '+91 94433 77889', email: 'cho.cbe@tn.gov.in', officeAddress: 'Corporation Health Wing, Town Hall', workingArea: 'All 5 Corporation Zones' },
      { officerName: 'Er. S. Manickam', department: 'Corporation / Municipal Admin', designation: 'Assistant Executive Engineer (Works)', contactNumber: '+91 94433 99001', email: 'aee.south@ccmc.gov.in', officeAddress: 'CCMC South Zone Office, Kuniamuthur', workingArea: 'South Zone Wards 71-100' },
      { officerName: 'Thiru. P. Chandran', department: 'Highways & Road Infrastructure', designation: 'Divisional Engineer (Highways)', contactNumber: '+91 94433 22334', email: 'de.highways.cbe@tn.gov.in', officeAddress: 'State Highways Complex, Trichy Road', workingArea: 'Major District Roads & Arterials' },
      { officerName: 'Thiru. M. Kathiravan', department: 'Police & Traffic Management', designation: 'Assistant Commissioner of Police (Traffic)', contactNumber: '+91 94433 55667', email: 'acp.traffic.cbe@tnpolice.gov.in', officeAddress: 'City Police Commissionerate, Hosur Road', workingArea: 'Coimbatore City Traffic Limits' },
    ];

    const officerDocs = [];
    for (const o of officersData) {
      let existing = await DepartmentOfficer.findOne({ where: { officerName: o.officerName } });
      if (!existing) {
        existing = await DepartmentOfficer.create(o);
      }
      officerDocs.push(existing);
    }
    console.log(`👨‍💼 Seeded ${officerDocs.length} Department Officers`);

    // 6. TVK Members (Sample Cadre)
    const membersData = [
      { memberId: 'TVK-CBE-10001', fullName: 'K. R. Vijayakumar', tamilName: 'கே. ஆர். விஜயகுமார்', gender: 'Male', mobileNumber: '9842111001', designation: 'District Joint Secretary', isOfficeBearer: true, wardId: wardDocs[0].id, constituencyId: southConst.id, bloodGroup: 'O+' },
      { memberId: 'TVK-CBE-10002', fullName: 'S. Meenakshi', tamilName: 'எஸ். மீனாட்சி', gender: 'Female', mobileNumber: '9842111002', designation: 'Ward Women Wing In-Charge', isOfficeBearer: true, wardId: wardDocs[0].id, constituencyId: southConst.id, bloodGroup: 'B+' },
      { memberId: 'TVK-CBE-10003', fullName: 'M. Anand', tamilName: 'எம். ஆனந்த்', gender: 'Male', mobileNumber: '9842111003', designation: 'Ward Secretary', isOfficeBearer: true, wardId: wardDocs[1].id, constituencyId: southConst.id, bloodGroup: 'A+' },
      { memberId: 'TVK-CBE-10004', fullName: 'R. Vigneshwar', tamilName: 'ஆர். விக்னேஷ்வர்', gender: 'Male', mobileNumber: '9842111004', designation: 'Youth Wing Deputy Organizer', isOfficeBearer: true, wardId: wardDocs[1].id, constituencyId: southConst.id, bloodGroup: 'O-' },
      { memberId: 'TVK-CBE-10005', fullName: 'P. Kavitha', tamilName: 'பி. கவிதா', gender: 'Female', mobileNumber: '9842111005', designation: 'Active Cadre Volunteer', isOfficeBearer: false, wardId: wardDocs[2].id, constituencyId: southConst.id, bloodGroup: 'AB+' },
      { memberId: 'TVK-CBE-10006', fullName: 'S. Mohammed Ismail', tamilName: 'எஸ். முகமது இஸ்மாயில்', gender: 'Male', mobileNumber: '9842111006', designation: 'Ward Organizer', isOfficeBearer: true, wardId: wardDocs[2].id, constituencyId: southConst.id, bloodGroup: 'B+' },
      { memberId: 'TVK-CBE-10007', fullName: 'D. Selvaraj', tamilName: 'டி. செல்வராஜ்', gender: 'Male', mobileNumber: '9842111007', designation: 'Constituency Coordinator', isOfficeBearer: true, wardId: wardDocs[8].id, constituencyId: northConst.id, bloodGroup: 'O+' },
      { memberId: 'TVK-CBE-10008', fullName: 'T. Revathi', tamilName: 'டி. ரேவதி', gender: 'Female', mobileNumber: '9842111008', designation: 'Active Member', isOfficeBearer: false, wardId: wardDocs[6].id, constituencyId: northConst.id, bloodGroup: 'A+' },
      { memberId: 'TVK-CBE-10009', fullName: 'A. Karthik', tamilName: 'ஏ. கார்த்திக்', gender: 'Male', mobileNumber: '9842111009', designation: 'Ward Secretary', isOfficeBearer: true, wardId: wardDocs[6].id, constituencyId: northConst.id, bloodGroup: 'O+' },
      { memberId: 'TVK-CBE-10010', fullName: 'V. Prakash', tamilName: 'வி. பிரகாஷ்', gender: 'Male', mobileNumber: '9842111010', designation: 'IT Wing District Deputy', isOfficeBearer: true, wardId: wardDocs[7].id, constituencyId: northConst.id, bloodGroup: 'B+' },
      { memberId: 'TVK-CBE-10011', fullName: 'G. Suresh', tamilName: 'ஜி. சுரேஷ்', gender: 'Male', mobileNumber: '9842111011', designation: 'Ward Office Bearer', isOfficeBearer: true, wardId: wardDocs[10].id, constituencyId: singaConst.id, bloodGroup: 'AB-' },
      { memberId: 'TVK-CBE-10012', fullName: 'N. Priya', tamilName: 'என். பிரியா', gender: 'Female', mobileNumber: '9842111012', designation: 'Student Wing Coordinator', isOfficeBearer: false, wardId: wardDocs[10].id, constituencyId: singaConst.id, bloodGroup: 'O+' },
      { memberId: 'TVK-CBE-10013', fullName: 'T. Ravindran', tamilName: 'டி. ரவீந்திரன்', gender: 'Male', mobileNumber: '9842111013', designation: 'Ward Secretary', isOfficeBearer: true, wardId: wardDocs[9].id, constituencyId: singaConst.id, bloodGroup: 'A+' },
      { memberId: 'TVK-CBE-10014', fullName: 'N. Palanisamy', tamilName: 'என். பழனிசாமி', gender: 'Male', mobileNumber: '9842111014', designation: 'Senior Cadre Member', isOfficeBearer: true, wardId: wardDocs[5].id, constituencyId: southConst.id, bloodGroup: 'B+' },
      { memberId: 'TVK-CBE-10015', fullName: 'K. Bhuvaneshwari', tamilName: 'கே. புவனேஸ்வரி', gender: 'Female', mobileNumber: '9842111015', designation: 'Women Wing Deputy Secretary', isOfficeBearer: true, wardId: wardDocs[3].id, constituencyId: southConst.id, bloodGroup: 'O+' },
    ];

    for (const m of membersData) {
      let existing = await Member.findOne({ where: { memberId: m.memberId } });
      if (!existing) {
        await Member.create({ ...m, districtId: district.id });
      }
    }
    console.log('👥 Seeded TVK Cadre Members');

    // 7. Realistic Issues & Grievances
    const issuesData = [
      {
        issueCode: 'GRI-2026-1001',
        title: 'Siruvani Drinking Water Pipe Burst on DB Road',
        description: 'Main underground distribution line has burst near DB Road 2nd Street corner. Clean drinking water is flooding into the stormwater drain continuously since morning.',
        category: 'Drinking Water',
        subcategory: 'Pipeline Leakage',
        priority: 'Critical',
        status: 'In Progress',
        citizenName: 'M. S. Sundararajan',
        citizenMobile: '9842567890',
        citizenAddress: '42, D.B. Road, R.S. Puram, Coimbatore',
        location: 'DB Road 2nd St Corner, R.S. Puram',
        paguthi: 'R.S. Puram',
        wardNumber: 72,
        wardId: wardDocs[0].id,
        constituencyId: southConst.id,
        assignedWardSecretaryId: wardUser ? wardUser.id : null,
        assignedDepartment: 'TWAD Board (Water Supply)',
        assignedOfficerId: officerDocs[0].id,
        beforePhoto: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: new Date(Date.now() - 3600000 * 4),
        finalReport: '',
      },
      {
        issueCode: 'GRI-2026-1002',
        title: 'Non-Functional Street Lights for 2 Weeks on Alagesan Road',
        description: 'Ten consecutive LED streetlights are out of order from Sungam junction towards Alagesan Road. Risk of accidents and safety hazard for evening pedestrians.',
        category: 'Street Lighting',
        subcategory: 'LED Failure',
        priority: 'High',
        status: 'New',
        citizenName: 'S. Lakshmi',
        citizenMobile: '9842567891',
        citizenAddress: '15, Alagesan Road, Ramanathapuram',
        location: 'Sungam Junction to Alagesan Road',
        paguthi: 'Ramanathapuram',
        wardNumber: 73,
        wardId: wardDocs[1].id,
        constituencyId: southConst.id,
        assignedDepartment: 'Corporation / Municipal Admin',
        assignedOfficerId: officerDocs[3].id,
        beforePhoto: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: null,
        finalReport: '',
      },
      {
        issueCode: 'GRI-2026-1003',
        title: 'Severe Sewage Overflow & Stagnation near Karumbukadai Junction',
        description: 'Underground drainage manhole is choked with plastic waste, causing raw sewage backflow across the main road near Bilal Nagar.',
        category: 'Sanitation / Drainage',
        subcategory: 'Manhole Choke',
        priority: 'Critical',
        status: 'In Progress',
        citizenName: 'H. Abdul Razzak',
        citizenMobile: '9842567892',
        citizenAddress: '88/2, Karumbukadai Main Rd, Ukkadam',
        location: 'Bilal Nagar, Karumbukadai Main Road',
        paguthi: 'Ukkadam',
        wardNumber: 80,
        wardId: wardDocs[2].id,
        constituencyId: southConst.id,
        assignedDepartment: 'Public Health & Sanitation',
        assignedOfficerId: officerDocs[2].id,
        beforePhoto: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: new Date(Date.now() - 3600000 * 2),
        finalReport: '',
      },
      {
        issueCode: 'GRI-2026-1004',
        title: 'Dangerous Deep Potholes on Oppanakara Street',
        description: 'Heavy rain created multiple deep potholes along the commercial bus route on Oppanakara Street, leading to frequent two-wheeler skids.',
        category: 'Road Infrastructure',
        subcategory: 'Pothole Repair',
        priority: 'High',
        status: 'Resolved',
        citizenName: 'K. Radhakrishnan',
        citizenMobile: '9842567893',
        citizenAddress: '112, Big Bazaar St, Town Hall',
        location: 'Oppanakara Street Commercial Stretch, Town Hall',
        paguthi: 'Town Hall',
        wardNumber: 82,
        wardId: wardDocs[3].id,
        constituencyId: southConst.id,
        assignedDepartment: 'Highways & Road Infrastructure',
        assignedOfficerId: officerDocs[4].id,
        beforePhoto: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        afterPhoto: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80',
        afterImage: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80',
        workStartedAt: new Date(Date.now() - 3600000 * 24),
        resolvedAt: new Date(Date.now() - 3600000 * 3),
        completedAt: new Date(Date.now() - 3600000 * 3),
        actionTaken: 'Wet-mix patching and bituminous cold-mix completed by highways road maintenance squad. Surface leveled and reopened for vehicular movement.',
        finalReport: 'Wet-mix patching and bituminous cold-mix completed by highways road maintenance squad. Surface leveled and reopened for vehicular movement.',
        resolutionDetails: {
          resolvedDate: new Date(),
          resolutionNotes: 'Wet-mix patching and bituminous cold-mix completed by highways road maintenance squad.',
          resolvedBy: 'Er. S. Manickam',
        },
      },
      {
        issueCode: 'GRI-2026-1005',
        title: 'Transformer Sparking and Frequent Low Voltage Fluctuations',
        description: '11KV distribution transformer near Textool junction produces sparks during evening peak hours. Several household electronics were damaged.',
        category: 'Electricity / TANGEDCO',
        subcategory: 'Transformer Defect',
        priority: 'Critical',
        status: 'Resolved',
        citizenName: 'P. Shanmugam',
        citizenMobile: '9842567894',
        citizenAddress: '23, Textool Colony, Ganapathy',
        location: 'Textool Junction, Ganapathy',
        paguthi: 'Ganapathy',
        wardNumber: 54,
        wardId: wardDocs[6].id,
        constituencyId: northConst.id,
        assignedDepartment: 'TANGEDCO (Electricity)',
        assignedOfficerId: officerDocs[1].id,
        beforePhoto: 'https://images.unsplash.com/photo-1509390144018-eeaf65052242?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1509390144018-eeaf65052242?w=800&auto=format&fit=crop&q=80',
        afterPhoto: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        afterImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        workStartedAt: new Date(Date.now() - 3600000 * 20),
        resolvedAt: new Date(Date.now() - 3600000 * 6),
        completedAt: new Date(Date.now() - 3600000 * 6),
        actionTaken: 'Transformer coil replaced and load balanced across feeder line by TANGEDCO power engineers.',
        finalReport: 'Transformer coil replaced and load balanced across feeder line by TANGEDCO power engineers.',
        resolutionDetails: {
          resolvedDate: new Date(),
          resolutionNotes: 'Transformer coil replaced and load balanced across feeder line.',
          resolvedBy: 'Er. K. Natarajan',
        },
      },
      {
        issueCode: 'GRI-2026-1006',
        title: 'Stray Dog Menace & Irregular Garbage Clearance near IT Corridor',
        description: 'Garbage dump yard not cleared for 4 days near Sivanandapuram. Packs of stray dogs are attacking night shift IT employees and two-wheelers.',
        category: 'Public Health',
        subcategory: 'Waste Management',
        priority: 'Medium',
        status: 'Pending',
        citizenName: 'R. Deepika',
        citizenMobile: '9842567895',
        citizenAddress: '404, Green Palms, Saravanampatti',
        location: 'Sivanandapuram Garbage Collection Point',
        paguthi: 'Saravanampatti',
        wardNumber: 57,
        wardId: wardDocs[7].id,
        constituencyId: northConst.id,
        assignedDepartment: 'Public Health & Sanitation',
        assignedOfficerId: officerDocs[2].id,
        beforePhoto: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: null,
        finalReport: '',
      },
      {
        issueCode: 'GRI-2026-1007',
        title: 'Choked Stormwater Drain Causing Inundation in Peelamedu',
        description: 'Rainwater drain connecting Avinashi Road to Singanallur tank is blocked with construction debris, resulting in waterlogging.',
        category: 'Sanitation / Drainage',
        subcategory: 'Stormwater Block',
        priority: 'High',
        status: 'Under Review',
        citizenName: 'V. Murugan',
        citizenMobile: '9842567896',
        citizenAddress: '67, Hopes College Rd, Peelamedu',
        location: 'Hopes College Road, Avinashi Road, Peelamedu',
        paguthi: 'Peelamedu',
        wardNumber: 66,
        wardId: wardDocs[10].id,
        constituencyId: singaConst.id,
        assignedDepartment: 'Corporation / Municipal Admin',
        assignedOfficerId: officerDocs[3].id,
        beforePhoto: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: null,
        finalReport: '',
      },
      {
        issueCode: 'GRI-2026-1008',
        title: 'Traffic Signal Malfunction at Gandhipuram 100 Feet Road Junction',
        description: 'Automated signal timer frozen on amber light causing heavy traffic jam during office hours.',
        category: 'Public Transport',
        subcategory: 'Traffic Signal',
        priority: 'Medium',
        status: 'Resolved',
        citizenName: 'B. Sivakumar',
        citizenMobile: '9842567897',
        citizenAddress: '12, 100 Feet Road, Gandhipuram',
        location: '100 Feet Road & Cross Cut Road Junction, Gandhipuram',
        paguthi: 'Gandhipuram',
        wardNumber: 65,
        wardId: wardDocs[8].id,
        constituencyId: northConst.id,
        assignedDepartment: 'Police & Traffic Management',
        assignedOfficerId: officerDocs[5].id,
        beforePhoto: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
        afterPhoto: 'https://images.unsplash.com/photo-1572978019677-7096fb00877a?w=800&auto=format&fit=crop&q=80',
        afterImage: 'https://images.unsplash.com/photo-1572978019677-7096fb00877a?w=800&auto=format&fit=crop&q=80',
        workStartedAt: new Date(Date.now() - 3600000 * 12),
        resolvedAt: new Date(Date.now() - 3600000 * 2),
        completedAt: new Date(Date.now() - 3600000 * 2),
        actionTaken: 'Microcontroller circuit reset and synchronizer module recalibrated. All 4 direction traffic cycles functioning normally.',
        finalReport: 'Microcontroller circuit reset and synchronizer module recalibrated. All 4 direction traffic cycles functioning normally.',
        resolutionDetails: {
          resolvedDate: new Date(),
          resolutionNotes: 'Microcontroller circuit reset and synchronizer module recalibrated.',
          resolvedBy: 'Thiru. M. Kathiravan',
        },
      },
      {
        issueCode: 'GRI-2026-1009',
        title: 'Broken Storm Drain Slabs near R.S. Puram Market',
        description: 'Pedestrian concrete cover slabs over the primary storm drainage canal near Flower Market are broken, exposing pedestrians and shoppers to hazard.',
        category: 'Sanitation / Drainage',
        subcategory: 'Canal Slab Damage',
        priority: 'High',
        status: 'New',
        citizenName: 'A. Selvaraj',
        citizenMobile: '9842100072',
        citizenAddress: '55, Market Road, Ward 72, R.S. Puram',
        location: 'Flower Market Gate 2, R.S. Puram',
        paguthi: 'R.S. Puram',
        wardNumber: 72,
        wardId: wardDocs[0].id,
        constituencyId: southConst.id,
        assignedWardSecretaryId: wardUser ? wardUser.id : null,
        assignedDepartment: 'Corporation / Municipal Admin',
        assignedOfficerId: officerDocs[3].id,
        beforePhoto: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80',
        beforeImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80',
        afterPhoto: '',
        afterImage: '',
        workStartedAt: null,
        finalReport: '',
        statusHistory: [
          {
            status: 'New',
            updatedBy: wardUser ? String(wardUser.id) : 'ward_secretary',
            updatedByName: 'K. R. Vijayakumar (Ward Secretary)',
            remarks: 'Field complaint registered via Ward Secretary portal',
            timestamp: new Date(),
          },
        ],
      },
    ];

    for (const issue of issuesData) {
      let existing = await Issue.findOne({ where: { issueCode: issue.issueCode } });
      if (!existing) {
        existing = await Issue.create({ ...issue, districtId: district.id });
        // Activity log
        await IssueActivity.create({
          issueId: existing.id,
          performedBy: adminUser ? adminUser.id : null,
          action: 'Created',
          newStatus: existing.status,
          notes: `Grievance officially filed by citizen ${existing.citizenName}`,
        });

        if (existing.status === 'Resolved' || existing.status === 'Completed') {
          await IssueActivity.create({
            issueId: existing.id,
            performedBy: adminUser ? adminUser.id : null,
            action: 'Resolved',
            previousStatus: 'In Progress',
            newStatus: 'Resolved',
            notes: existing.resolutionDetails?.resolutionNotes || 'Resolved satisfactorily',
          });
        }
      } else {
        Object.assign(existing, issue);
        await existing.save();
      }

      // Populate normalized relational tables for Before Images
      const bImg = existing.beforeImage || existing.beforePhoto;
      if (bImg) {
        const hasBefore = await ComplaintBeforeImage.findOne({ where: { complaintId: existing.id } });
        if (!hasBefore) {
          await ComplaintBeforeImage.create({
            complaintId: existing.id,
            imageUrl: bImg,
            caption: 'Citizen Grievance Submission Proof',
            uploadedAt: existing.createdAt || new Date(),
          });
        }
      }

      // Populate normalized relational tables for After Images and Actions
      const aImg = existing.afterImage || existing.afterPhoto;
      if (aImg || existing.actionTaken) {
        let actionRec = await ComplaintAction.findOne({ where: { complaintId: existing.id } });
        if (!actionRec) {
          actionRec = await ComplaintAction.create({
            complaintId: existing.id,
            wardSecretaryId: existing.assignedWardSecretaryId || (wardUser ? wardUser.id : null),
            actionTaken: existing.actionTaken || existing.finalReport || 'Action completed on site',
            wardSecretaryRemarks: existing.wardSecretaryRemarks || '',
            beforeImage: bImg || '',
            afterImage: aImg || '',
            completedAt: existing.completedAt || existing.resolvedAt || new Date(),
          });
        }

        if (aImg) {
          const hasAfter = await ComplaintAfterImage.findOne({ where: { complaintId: existing.id } });
          if (!hasAfter) {
            await ComplaintAfterImage.create({
              complaintId: existing.id,
              actionId: actionRec.id,
              imageUrl: aImg,
              caption: 'On-ground Action Evidence',
              uploadedAt: existing.completedAt || new Date(),
            });
          }
        }
      }
    }
    console.log('📝 Seeded Grievance Records, Before/After Images, and Actions in MySQL');

    // 8. Achievements & Projects - Only dynamically created records by Admin are stored. Static dummy seeds removed.
    console.log('🚀 Achievements & Projects: Using dynamic database records only');

    // 9. Appointments & Notifications Workflow Seeding
    let appt1 = await Appointment.findOne({ where: { tokenNumber: 'APT-2026-0101' } });
    if (!appt1) {
      await Appointment.create({
        tokenNumber: 'APT-2026-0101',
        citizenId: citizenUser ? citizenUser.id : null,
        citizenName: 'K. S. Sundar (Citizen)',
        mobileNumber: '9842567890',
        email: 'sundar.citizen@gmail.com',
        constituency: 'Coimbatore South',
        paguthi: 'R.S. Puram',
        ward: 'Ward 72',
        purpose: 'Memorandum regarding Siruvani Drinking Water Supply Schedule',
        description: 'Need discussion with Minister on low-pressure drinking water delivery in R.S. Puram Ward 72 and replacement of damaged feeder valves.',
        preferredDate: new Date(Date.now() + 86400000 * 3),
        preferredTimeSlot: '10:00 AM - 11:30 AM',
        status: 'Pending Approval',
      });

      await Notification.create({
        recipientId: subAdmin ? subAdmin.id : null,
        recipientRole: 'subadmin',
        title: 'New Appointment Request: K. S. Sundar',
        message: 'K. S. Sundar requested an appointment regarding Siruvani Drinking Water Supply Schedule. Token: APT-2026-0101',
        type: 'appointment_submitted',
        referenceId: 'APT-2026-0101',
      });
    }

    let appt2 = await Appointment.findOne({ where: { tokenNumber: 'APT-2026-0102' } });
    if (!appt2) {
      const scheduledDate = new Date(Date.now() + 86400000 * 5);
      await Appointment.create({
        tokenNumber: 'APT-2026-0102',
        citizenId: citizenUser ? citizenUser.id : null,
        subadminId: subAdmin ? subAdmin.id : null,
        citizenName: 'K. S. Sundar (Citizen)',
        mobileNumber: '9842567890',
        email: 'sundar.citizen@gmail.com',
        constituency: 'Coimbatore South',
        paguthi: 'R.S. Puram',
        ward: 'Ward 72',
        purpose: 'Public Grievance on Road Safety and Traffic Signal at DB Road',
        description: 'Submission of petition on behalf of R.S. Puram Residents Association regarding frequent road skids and missing pedestrian signals.',
        preferredDate: new Date(Date.now() + 86400000 * 4),
        preferredTimeSlot: '11:30 AM - 01:00 PM',
        approvedDate: scheduledDate,
        approvedTimeSlot: '02:30 PM - 04:00 PM',
        approvedVenue: 'Coimbatore South District Party Headquarters, Race Course Road',
        meetingInstructions: 'Please arrive 15 minutes before the scheduled time with copy of petition and valid photo ID.',
        isModifiedBySubadmin: true,
        approvedBy: subAdmin ? subAdmin.id : null,
        approvedByName: 'Coimbatore South Sub-Administrator',
        approvedAt: new Date(Date.now() - 3600000 * 2),
        status: 'Approved',
      });

      await Notification.create({
        recipientId: citizenUser ? citizenUser.id : null,
        recipientRole: 'citizen',
        title: 'Appointment Approved with Updated Schedule',
        message: `Your appointment APT-2026-0102 has been approved with updated date/time: ${scheduledDate.toLocaleDateString()} at 02:30 PM - 04:00 PM.`,
        type: 'appointment_modified',
        referenceId: 'APT-2026-0102',
      });
    }

    console.log('📅 Seeded Appointments & Notifications Workflow in MySQL');
    console.log('✅ Coimbatore District MySQL Database initialization complete!');
  } catch (error) {
    console.error('❌ MySQL Database Seeding Error:', error);
    throw error;
  }
};

// Also export as default seedDatabase so existing seeds/seedData.js can redirect
export const seedDatabase = seedMySQLDatabase;

if (process.argv[1]?.includes('seedMySQL.js') || process.argv[1]?.includes('seedData.js')) {
  seedMySQLDatabase()
    .then(() => {
      console.log('Seeding script completed successfully.');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
