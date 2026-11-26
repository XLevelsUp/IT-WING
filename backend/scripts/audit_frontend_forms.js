import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../frontend/src');

function searchFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = searchFiles(frontendSrc);
console.log(`Auditing ${files.length} JSX/JS files in frontend/src...`);

const targetFiles = [
  'RegisterComplaintPage',
  'ComplaintsReportedPage',
  'WardSecretaryPortalPage',
  'SubadminDashboardPage',
  'LoginPage',
  'RegisterPage',
  'CitizenPortalPage',
];

for (const filePath of files) {
  const name = path.basename(filePath, path.extname(filePath));
  if (targetFiles.includes(name)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for API calls
    const apiMatches = content.match(/api\.(get|post|put|patch|delete)|fetch\(['"]\/api/g) || [];
    const mockFlags = content.match(/useMock|isMock|MOCK_DATA|mockGrievances|dummyData/g) || [];

    console.log(`\n📄 ${name}:`);
    console.log(`   - API Endpoint Call Occurrences: ${apiMatches.length}`);
    console.log(`   - Mock Flags Found: ${mockFlags.length ? mockFlags.join(', ') : 'None (Uses Live APIs)'}`);

    // Specifically inspect form submission handlers
    const submitHandlers = content.match(/const\s+(handleSubmit|handleTakeAction|handleAssign|handleSave|handleRegister|handleComplete)\s*=\s*async/g) || [];
    console.log(`   - Async Submit Handlers: ${submitHandlers.map(s => s.replace(/const\s+|\s*=\s*async/g, '')).join(', ') || 'N/A'}`);
  }
}
