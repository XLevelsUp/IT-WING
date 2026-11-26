import http from 'http';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function loginUser(username, password, selectedRole) {
  const payload = { username, password, selectedRole };
  return await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    payload
  );
}

async function runTests() {
  console.log('================================================================');
  console.log('TVK DIGITAL GOVERNANCE CRM: PAGUTHI SEYALAALAR TEST SUITE');
  console.log('================================================================\n');

  // --- 1. Database Schema & Users Verification ---
  console.log('--- 1. Database Schema & Accounts Verification ---');
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tvk',
    port: process.env.MYSQL_PORT || 3306,
  });

  const [cols] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
  assert(cols[0].Type.includes('paguthi_seyalaalar'), 'MySQL users.role column includes paguthi_seyalaalar enum value');

  const [accs] = await connection.query(
    "SELECT username, role, paguthi FROM users WHERE username IN ('pothanur', 'kurichi', 'sundarapuram')"
  );
  assert(accs.length === 3, 'All 3 predefined accounts exist in database');
  const pothanurAcc = accs.find((a) => a.username === 'pothanur');
  assert(pothanurAcc && pothanurAcc.paguthi === 'Pothanur', 'Account pothanur is assigned to Pothanur Paguthi');
  const kurichiAcc = accs.find((a) => a.username === 'kurichi');
  assert(kurichiAcc && kurichiAcc.paguthi === 'Kurichi', 'Account kurichi is assigned to Kurichi Paguthi');
  const sundarAcc = accs.find((a) => a.username === 'sundarapuram');
  assert(sundarAcc && sundarAcc.paguthi === 'Sundarapuram', 'Account sundarapuram is assigned to Sundarapuram Paguthi');

  // --- 2. Task 1: Predefined Accounts Authentication ---
  console.log('\n--- 2. Task 1: Authentication Testing ---');
  const resPothanur = await loginUser('pothanur', 'pothanur@2026', 'paguthi_seyalaalar');
  assert(resPothanur.status === 200, 'Account 1 (pothanur / pothanur@2026) logs in successfully (200 OK)');
  assert(resPothanur.body.data?.role === 'paguthi_seyalaalar', 'pothanur user role is paguthi_seyalaalar');
  assert(resPothanur.body.data?.paguthi === 'Pothanur', 'pothanur user paguthi is Pothanur');
  const tokenPothanur = resPothanur.body.data?.token;

  const resKurichi = await loginUser('kurichi', 'kurichi@2024', 'paguthi_seyalaalar');
  assert(resKurichi.status === 200, 'Account 2 (kurichi / kurichi@2024) logs in successfully (200 OK)');
  assert(resKurichi.body.data?.role === 'paguthi_seyalaalar', 'kurichi user role is paguthi_seyalaalar');
  assert(resKurichi.body.data?.paguthi === 'Kurichi', 'kurichi user paguthi is Kurichi');
  const tokenKurichi = resKurichi.body.data?.token;

  const resSundar = await loginUser('sundarapuram', 'sundarapurum@26', 'paguthi_seyalaalar');
  assert(resSundar.status === 200, 'Account 3 (sundarapuram / sundarapurum@26) logs in successfully (200 OK)');
  assert(resSundar.body.data?.role === 'paguthi_seyalaalar', 'sundarapuram user role is paguthi_seyalaalar');
  assert(resSundar.body.data?.paguthi === 'Sundarapuram', 'sundarapuram user paguthi is Sundarapuram');
  const tokenSundar = resSundar.body.data?.token;

  const resBadPass = await loginUser('pothanur', 'wrong_password_2026', 'paguthi_seyalaalar');
  assert(resBadPass.status === 401, 'Invalid password is rejected with 401 Unauthorized');

  const resRoleMismatch = await loginUser('admin', 'admin@123', 'paguthi_seyalaalar');
  assert(resRoleMismatch.status === 403, 'Non-Paguthi Seyalaalar user selecting Paguthi role is rejected with 403 Forbidden');

  // Existing logins unaffected
  const resAdmin = await loginUser('admin', 'admin@123', 'admin');
  assert(resAdmin.status === 200, 'Existing Admin login unaffected (200 OK)');

  // --- 3. Tasks 2 & 3: Live Paguthi Dashboard Data ---
  console.log('\n--- 3. Tasks 2 & 3: Live Paguthi Dashboard APIs ---');
  const dashPothanur = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/paguthi-seyalaalar/dashboard',
    headers: { Authorization: `Bearer ${tokenPothanur}` },
  });
  assert(dashPothanur.status === 200, 'Pothanur dashboard API returns 200 OK');
  assert(dashPothanur.body.data?.paguthi === 'Pothanur', 'Pothanur dashboard strictly returns Pothanur paguthi');
  assert(dashPothanur.body.data?.stats.totalWards === 4, 'Pothanur actual total wards dynamically equals 4');
  assert(dashPothanur.body.data?.stats.registeredSecretaries === 1, 'Pothanur actual registered secretaries dynamically equals 1');
  assert(dashPothanur.body.data?.stats.totalComplaints >= 1, 'Pothanur actual total complaints calculated dynamically');

  const dashKurichi = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/paguthi-seyalaalar/dashboard',
    headers: { Authorization: `Bearer ${tokenKurichi}` },
  });
  assert(dashKurichi.status === 200, 'Kurichi dashboard API returns 200 OK');
  assert(dashKurichi.body.data?.paguthi === 'Kurichi', 'Kurichi dashboard strictly returns Kurichi paguthi');
  assert(dashKurichi.body.data?.stats.totalWards === 4, 'Kurichi actual total wards dynamically equals 4');
  assert(dashKurichi.body.data?.stats.registeredSecretaries === 2, 'Kurichi actual registered secretaries dynamically equals 2');
  assert(dashKurichi.body.data?.stats.totalComplaints >= 2, 'Kurichi actual total complaints calculated dynamically');

  const dashSundar = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/paguthi-seyalaalar/dashboard',
    headers: { Authorization: `Bearer ${tokenSundar}` },
  });
  assert(dashSundar.status === 200, 'Sundarapuram dashboard API returns 200 OK');
  assert(dashSundar.body.data?.paguthi === 'Sundarapuram', 'Sundarapuram dashboard strictly returns Sundarapuram paguthi');
  assert(dashSundar.body.data?.stats.totalWards === 5, 'Sundarapuram actual total wards dynamically equals 5');
  assert(dashSundar.body.data?.stats.registeredSecretaries === 2, 'Sundarapuram actual registered secretaries dynamically equals 2');
  assert(dashSundar.body.data?.stats.totalComplaints >= 3, 'Sundarapuram actual total complaints calculated dynamically');

  // --- 4. Task 4: Complete Ward Directory & Secretary Info ---
  console.log('\n--- 4. Task 4: Complete Ward Directory Verification ---');
  const pothanurWards = dashPothanur.body.data?.wards || [];
  assert(pothanurWards.length === 4, 'Pothanur ward directory lists all 4 wards');
  const pWard1 = pothanurWards.find((w) => w.wardNumber === 1);
  assert(pWard1 && pWard1.wardSecretary === 'kathir', 'Pothanur Ward 1 secretary is kathir');
  assert(pWard1 && pWard1.contactNumber === '9865815556', 'Pothanur Ward 1 contact number is 9865815556');
  const pWard2 = pothanurWards.find((w) => w.wardNumber === 2);
  assert(pWard2 && pWard2.wardSecretary === 'Not Assigned', 'Pothanur Ward 2 has no secretary -> displays Not Assigned');

  const kurichiWards = dashKurichi.body.data?.wards || [];
  const kWard1 = kurichiWards.find((w) => w.wardNumber === 1);
  assert(kWard1 && kWard1.wardSecretary === 'Kurichi W1 Secretary', 'Kurichi Ward 1 secretary is Kurichi W1 Secretary');
  assert(kWard1 && kWard1.contactNumber === '9842100003', 'Kurichi Ward 1 contact number is 9842100003');

  // --- 5. Task 5: Ward-wise Complaint Tracking ---
  console.log('\n--- 5. Task 5: Ward-wise Complaint Tracking ---');
  assert(pWard1 && pWard1.complaints?.length >= 1, 'Pothanur Ward 1 contains its registered complaint');
  const pIssue = pWard1?.complaints?.[0];
  assert(pIssue && pIssue.issueCode === 'GRI-2026-0119', 'Complaint has accurate issueCode: GRI-2026-0119');
  assert(pIssue && pIssue.wardNumber === 1, 'Complaint accurately belongs to Ward 1');
  assert(pIssue && pIssue.status === 'New', 'Complaint reflects existing database status: New');

  // --- 6. Task 8: Strict Access Control Enforcement ---
  console.log('\n--- 6. Task 8: Strict Cross-Paguthi Boundary Enforcement ---');
  const crossPtoK = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/districts/constituencies/6/paguthi/Kurichi',
    headers: { Authorization: `Bearer ${tokenPothanur}` },
  });
  assert(crossPtoK.status === 403, 'Pothanur account blocked from Kurichi paguthi with 403 Forbidden');

  const crossKtoS = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/districts/constituencies/6/paguthi/Sundarapuram',
    headers: { Authorization: `Bearer ${tokenKurichi}` },
  });
  assert(crossKtoS.status === 403, 'Kurichi account blocked from Sundarapuram paguthi with 403 Forbidden');

  const crossStoP = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/districts/constituencies/6/paguthi/Pothanur',
    headers: { Authorization: `Bearer ${tokenSundar}` },
  });
  assert(crossStoP.status === 403, 'Sundarapuram account blocked from Pothanur paguthi with 403 Forbidden');

  // Admin access remains unrestricted
  const tokenAdmin = resAdmin.body.data?.token;
  const adminAccess = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/districts/constituencies/6/paguthi/Pothanur',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  assert(adminAccess.status === 200, 'Admin retains full access to Pothanur (200 OK)');

  // --- 7. Frontend Code & UI Structure Verification ---
  console.log('\n--- 7. Frontend UI Structure Verification ---');
  const loginSrc = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/auth/LoginPage.jsx'), 'utf8');
  assert(loginSrc.includes('paguthi_seyalaalar:'), 'LoginPage.jsx contains paguthi_seyalaalar role in rolesConfig');
  assert(loginSrc.includes('/paguthi-seyalaalar/dashboard'), 'LoginPage.jsx redirects paguthi_seyalaalar to dashboard');

  const appSrc = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/App.jsx'), 'utf8');
  assert(appSrc.includes('PaguthiSeyalaalarDashboardPage'), 'App.jsx imports PaguthiSeyalaalarDashboardPage');
  assert(appSrc.includes('/paguthi-seyalaalar/dashboard'), 'App.jsx defines /paguthi-seyalaalar/dashboard route');

  const dashSrc = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/dashboard/PaguthiSeyalaalarDashboardPage.jsx'), 'utf8');
  assert(dashSrc.includes("viewMode === 'card'"), 'Dashboard implements single-card landing view mode');
  assert(dashSrc.includes("viewMode === 'detail'"), 'Dashboard implements deep-dive detail view mode');
  assert(dashSrc.includes('Open Paguthi Details & Ward Directory'), 'Dashboard has button to open Paguthi detail');
  assert(dashSrc.includes('selectedWardForComplaints'), 'Dashboard provides ward-wise complaint deep-dive');

  await connection.end();

  console.log('\n================================================================');
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
