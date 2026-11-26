import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

async function waitForServer(retries = 25, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://localhost:5000/api/health');
      if (res.ok) {
        console.log('✅ Connected to backend server at http://localhost:5000\n');
        return true;
      }
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING DYNAMIC ACHIEVEMENTS & PROJECTS E2E TESTS');
  console.log('====================================================\n');

  let serverProcess = null;

  // Check if server is already running, if not start it
  let serverRunning = await waitForServer(2, 500);
  if (!serverRunning) {
    console.log('Starting backend server process for testing...');
    const serverPath = path.resolve(__dirname, '../server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (d) => {
      const out = d.toString();
      if (out.includes('running on port') || out.includes('initialization complete')) {
        console.log(`[SERVER]: ${out.trim()}`);
      }
    });

    serverProcess.stderr.on('data', (d) => {
      console.error(`[SERVER ERR]: ${d.toString().trim()}`);
    });

    serverRunning = await waitForServer(20, 1000);
  }

  if (!serverRunning) {
    console.error('❌ Failed to start or connect to backend server on port 5000.');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Admin Authentication
    console.log('--- Step 1: Admin Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123', selectedRole: 'admin' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    assert(loginRes.ok && token, `Admin successfully logged in with valid JWT token (role: ${loginData.data?.role})`);

    // 2. Test File Upload (POST /api/upload)
    console.log('\n--- Step 2: Image Upload via Multer ---');
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    const blob = new Blob([pngHeader], { type: 'image/png' });
    formData.append('image', blob, 'test_project_preview.png');

    const uploadRes = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.ok && uploadData.success && uploadData.url, `Image successfully uploaded to permanent storage: ${uploadData.url}`);
    const uploadedImageUrl = uploadData.url;

    // 3. Validation: Test Creating Project Without Required Fields
    console.log('\n--- Step 3: Project Validation on Required Fields ---');
    const invalidRes1 = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Missing title and image'
      })
    });
    const invalidData1 = await invalidRes1.json();
    assert(invalidRes1.status === 400 && !invalidData1.success, 'Rejects project creation missing Title and Image');

    const invalidRes2 = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Has Title but no image or description'
      })
    });
    const invalidData2 = await invalidRes2.json();
    assert(invalidRes2.status === 400 && !invalidData2.success, 'Rejects project creation missing Image URL and Description');

    // 4. Create New Project via Admin (POST /api/projects)
    console.log('\n--- Step 4: Admin Adds New Dynamic Project ---');
    const newProjectPayload = {
      title: 'Singanallur Smart Solar Street Lighting Project',
      description: 'Installation of high-efficiency LED solar streetlights with automated dusk-to-dawn sensors along the Singanallur lake peripheral corridor, ensuring safer transit and 24/7 illumination.',
      imageUrl: uploadedImageUrl,
      startDate: '2026-11-15',
      category: 'Infrastructure',
      status: 'Ongoing',
      location: 'Singanallur, Coimbatore',
      department: 'Electrical & Lighting',
      budget: 4500000,
      progressPercentage: 45
    };

    const createRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newProjectPayload)
    });
    const createData = await createRes.json();
    assert(createRes.ok && createData.success && createData.data?.id, `Successfully created project: ${createData.data?.projectId || createData.data?.id}`);
    const createdProject = createData.data;

    // 5. Verify Public API Access (GET /api/projects without token)
    console.log('\n--- Step 5: Public Access & Ordering Verification ---');
    const publicRes = await fetch(`${BASE_URL}/projects`);
    const publicData = await publicRes.json();
    assert(publicRes.ok && publicData.success && Array.isArray(publicData.data), 'Public GET /api/projects returns 200 without token for citizen portal');
    assert(publicData.data.length >= 1, `Projects list contains dynamic records (count: ${publicData.data.length})`);

    const latestProject = publicData.data[0];
    assert(latestProject.id === createdProject.id || latestProject.title === newProjectPayload.title, 'Projects are returned in latest-first order (createdAt DESC)');
    assert(latestProject.imageUrl === uploadedImageUrl, 'Stored image URL matches permanently uploaded file path');
    assert(latestProject.title === newProjectPayload.title, 'Project title correctly persisted in MySQL');
    assert(latestProject.description === newProjectPayload.description, 'Project description correctly persisted in MySQL');

    // 6. Test Single Project Retrieval (GET /api/projects/:id)
    console.log('\n--- Step 6: Single Project Retrieval ---');
    const singleRes = await fetch(`${BASE_URL}/projects/${createdProject.id}`);
    const singleData = await singleRes.json();
    assert(singleRes.ok && singleData.data?.id === createdProject.id, `Single project fetched correctly by ID: ${createdProject.id}`);

    // 7. Test Admin Update (PUT /api/projects/:id)
    console.log('\n--- Step 7: Admin Updates Project ---');
    const updateRes = await fetch(`${BASE_URL}/projects/${createdProject.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        progressPercentage: 75,
        status: 'Ongoing'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.ok && updateData.data?.progressPercentage === 75, 'Admin updated project progress percentage to 75%');

    // 8. Create a 2nd project to verify multiple dynamic cards in citizen portal
    console.log('\n--- Step 8: Add 2nd Project for Multi-Card Bento Layout ---');
    const proj2Payload = {
      title: 'Gandhipuram Modern Bus Shelter & RO Drinking Water Station',
      description: 'Modernized commuter transit pavilion featuring clean purified RO drinking water dispensing kiosks and digital civic governance display panels.',
      imageUrl: uploadedImageUrl,
      startDate: '2026-11-18',
      category: 'Water Security',
      status: 'Completed',
      location: 'Gandhipuram Central, Coimbatore',
      budget: 2800000,
      progressPercentage: 100
    };
    const createRes2 = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proj2Payload)
    });
    const createData2 = await createRes2.json();
    assert(createRes2.ok && createData2.success, 'Successfully added 2nd dynamic project');

    // Check listing again
    const listRes2 = await fetch(`${BASE_URL}/projects`);
    const listData2 = await listRes2.json();
    assert(listData2.data.length >= 2, `Total dynamic projects in database: ${listData2.data.length}`);
    assert(listData2.data[0].title === proj2Payload.title, 'Latest project is ordered first');

    // 9. Static Code Analysis: Verify Official Quick Links in CitizenPortalPage.jsx
    console.log('\n--- Step 9: Verify Citizen Dashboard Quick Links ---');
    const citizenPortalPath = path.resolve(__dirname, '../../frontend/src/pages/citizen/CitizenPortalPage.jsx');
    const citizenContent = fs.readFileSync(citizenPortalPath, 'utf-8');

    assert(citizenContent.includes('https://myaadhaar.uidai.gov.in/'), 'Contains Aadhaar Card link: https://myaadhaar.uidai.gov.in/');
    assert(citizenContent.includes('Aadhaar Card – Apply / Download'), 'Contains label: Aadhaar Card – Apply / Download');
    assert(citizenContent.includes('https://www.incometaxindia.gov.in/en/pan'), 'Contains PAN Card link: https://www.incometaxindia.gov.in/en/pan');
    assert(citizenContent.includes('PAN Card – Apply / Download'), 'Contains label: PAN Card – Apply / Download');
    assert(citizenContent.includes('https://tvk.family/'), 'Contains Membership Drive link: https://tvk.family/');
    assert(citizenContent.includes('Membership Drive'), 'Contains label: Membership Drive');
    assert(citizenContent.includes('target="_blank"'), 'Quick links have target="_blank"');
    assert(citizenContent.includes('rel="noopener noreferrer"'), 'Quick links have rel="noopener noreferrer"');

    // Verify Quick Links section appears directly ABOVE Section 6 (Connect with K. Vignesh)
    const quickLinksIndex = citizenContent.indexOf('OFFICIAL QUICK LINKS SECTION');
    const connectSectionIndex = citizenContent.indexOf('CONNECT WITH K. VIGNESH SECTION');
    const instagramIndex = citizenContent.indexOf('Connect with K. Vignesh on Instagram');
    assert(quickLinksIndex !== -1, 'Official Quick Links section exists');
    assert(connectSectionIndex !== -1, 'Connect with K. Vignesh section exists');
    assert(quickLinksIndex < connectSectionIndex, 'Quick Links section is placed directly ABOVE Connect with K. Vignesh section');
    assert(quickLinksIndex < instagramIndex, 'Quick Links section is placed directly ABOVE Instagram');

    // Verify static achievements array is removed
    assert(!citizenContent.includes('const achievements = ['), 'Static achievements dummy array is completely removed from CitizenPortalPage.jsx');

    // 10. Static Code Analysis: Verify Admin ProjectsPage.jsx
    console.log('\n--- Step 10: Verify Admin ProjectsPage.jsx ---');
    const adminProjectsPath = path.resolve(__dirname, '../../frontend/src/pages/projects/ProjectsPage.jsx');
    const adminContent = fs.readFileSync(adminProjectsPath, 'utf-8');

    assert(adminContent.includes('Add New Project'), 'Admin page contains "Add New Project" button');
    assert(adminContent.includes('handleImageChange'), 'Admin page has image upload validation handler');
    assert(adminContent.includes('imagePreview'), 'Admin page has image preview functionality');
    assert(adminContent.includes('api.post(\'/upload\''), 'Admin page uploads image to backend upload API');
    assert(adminContent.includes('api.post(\'/projects\''), 'Admin page submits project to backend projects API');
    assert(adminContent.includes('fetchProjects'), 'Admin page refreshes projects list automatically');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
