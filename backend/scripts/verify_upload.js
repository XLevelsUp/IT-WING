import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUploadAndServing() {
  console.log('Testing Image Upload & Static Serving...');

  // 1. Login to get token
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;

  // 2. Create a minimal 1x1 PNG file in scratch or temp
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const testImgPath = path.join(__dirname, 'test_sample.png');
  fs.writeFileSync(testImgPath, png1x1);

  // 3. Upload using multipart form-data
  const formData = new FormData();
  const blob = new Blob([png1x1], { type: 'image/png' });
  formData.append('image', blob, 'test_sample.png');

  const uploadRes = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const uploadJson = await uploadRes.json();
  console.log('Upload Response:', uploadJson);

  if (!uploadJson.success || !uploadJson.url) {
    throw new Error('Upload failed or no URL returned');
  }

  // 4. Fetch the uploaded image via static endpoint
  const fullUrl = `http://localhost:5000${uploadJson.url}`;
  console.log('Fetching uploaded image from:', fullUrl);
  const getRes = await fetch(fullUrl);
  console.log('HTTP Status from Static Serving:', getRes.status, getRes.statusText);
  console.log('Content-Type Header:', getRes.headers.get('content-type'));

  const arrayBuffer = await getRes.arrayBuffer();
  console.log('Image bytes received:', arrayBuffer.byteLength);

  // Cleanup test sample file
  if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);

  if (getRes.status === 200 && arrayBuffer.byteLength > 0) {
    console.log('✅ Image upload and static serving verified successfully!');
  } else {
    throw new Error('Static serving verification failed!');
  }
}

testUploadAndServing().catch(err => {
  console.error('❌ Upload verification error:', err);
  process.exit(1);
});
