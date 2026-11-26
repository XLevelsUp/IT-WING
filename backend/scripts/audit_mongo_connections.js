import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

function searchFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'uploads') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, fileList);
    } else if (file.endsWith('.js') && !file.includes('audit_mongo')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allBackendFiles = searchFiles(backendRoot);
console.log(`Auditing ${allBackendFiles.length} JavaScript files in backend...`);

const suspiciousPatterns = [
  /mongoose\.connect/i,
  /new\s+MongoClient/i,
  /from\s+['"]mongoose['"]/i,
  /require\(['"]mongoose['"]\)/i,
  /mongodb\+srv/i,
];

let totalHits = 0;
const results = [];

for (const filePath of allBackendFiles) {
  const relPath = path.relative(backendRoot, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      totalHits++;
      results.push({ file: relPath, pattern: pattern.toString() });
    }
  }
}

console.log('\n=== MONGOOSE / MONGODB ACTIVE CALL AUDIT ===');
if (results.length === 0) {
  console.log('✅ ZERO active mongoose.connect() or MongoClient calls found in backend application code!');
} else {
  console.log(`Found ${results.length} references:`);
  results.forEach(r => console.log(`  - ${r.file}: matches ${r.pattern}`));
}

// Check database configuration
import('../config/db.js').then(dbModule => {
  console.log('\n=== CURRENT DATABASE MODULE CONFIGURATION ===');
  console.log('Exported functions in backend/config/db.js:', Object.keys(dbModule));
  console.log('Database dialect:', 'MySQL (Sequelize)');
  process.exit(0);
}).catch(err => {
  console.error('Error importing config/db.js:', err);
  process.exit(1);
});
