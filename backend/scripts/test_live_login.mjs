async function testLiveLogin() {
  const accounts = [
    { label: 'Admin (admin@123)', username: 'admin', password: 'admin@123', selectedRole: 'admin' },
    { label: 'Admin (admin123 alias)', username: 'admin', password: 'admin123', selectedRole: 'admin' },
    { label: 'Thondamuthur Therkku (Exact)', username: 'thondamuthurtherkku', password: 'thondamuthurtherkku@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Thondamuthur Therkku (selectedRole left as admin)', username: 'thondamuthurtherkku', password: 'thondamuthurtherkku@2026', selectedRole: 'admin' },
    { label: 'Thondamuthur Merkku (Exact case)', username: 'ThondamuthurMerkku', password: 'Merkkuondriyam@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Thondamuthur Merkku (Lowercase)', username: 'thondamuthurmerkku', password: 'Merkkuondriyam@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Madukkarai Therkku', username: 'MadukkaraiTherkku', password: 'MadukkaraiOndriyam@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Madukkarai Merkku', username: 'MadukkaraiMerkkuOndriyam', password: 'MerkkuOndriyam@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Madukkarai Nagaram', username: 'MadukkaraiNagaram', password: 'Nagaram@111222', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Vellalur Nagaram', username: 'VellalurNagaram', password: 'vellalurNagaram@12233', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Kinathukadavu Ondriyam (Double @@)', username: 'KinathukadavuOndriyam', password: 'KinathukadavuOndriyam@@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Kinathukadavu Ondriyam (Single @ alias)', username: 'KinathukadavuOndriyam', password: 'KinathukadavuOndriyam@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Malumachampatti', username: 'Malumachampatti', password: 'Malumachampatti@123123', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Pothanur', username: 'pothanur', password: 'pothanur@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Kurichi (@2026)', username: 'kurichi', password: 'kurichi@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Kurichi (@2024 alias)', username: 'kurichi', password: 'kurichi@2024', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Sundarapuram (@2026)', username: 'sundarapuram', password: 'sundarapuram@2026', selectedRole: 'paguthi_seyalaalar' },
    { label: 'Sundarapuram (sundarapurum@26 alias)', username: 'sundarapuram', password: 'sundarapurum@26', selectedRole: 'paguthi_seyalaalar' },
  ];

  let passed = 0;
  for (const acc of accounts) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc),
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        console.log(`✅ [${res.status}] ${acc.label} -> Logged in as ${data.data.username} (${data.data.role})`);
        passed++;
      } else {
        console.log(`❌ [${res.status}] ${acc.label} ->`, data);
      }
    } catch (err) {
      console.error(`ERROR for ${acc.label}:`, err.message);
    }
  }

  console.log(`\nResults: ${passed} / ${accounts.length} passed.`);
}

testLiveLogin();
