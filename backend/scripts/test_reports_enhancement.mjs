import jwt from 'jsonwebtoken';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, User, Issue } from '../models/index.js';
import { getReportData, exportReportExcel } from '../controllers/reportController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('=== TVK DIGITAL GOVERNANCE CRM: REPORTS ENHANCEMENT TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Verify User & Token
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    assert(adminUser !== null, 'Admin user exists in database');
    const token = jwt.sign(
      { id: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET || 'tvk_coimbatore_digital_governance_crm_secret_key_2026',
      { expiresIn: '1d' }
    );
    assert(!!token, 'Generated valid JWT token for Admin');

    // 2. Test getReportData: Page 1 default pagination (15 records per page)
    console.log('\n--- Testing Task 1: Default 15 Records Pagination ---');
    let page1Data = null;
    await getReportData(
      { query: { reportType: 'grievances', page: '1', limit: '15' }, user: adminUser },
      {
        json: (res) => { page1Data = res.data; },
        status: () => ({ json: () => {} }),
      }
    );

    assert(page1Data !== null, 'Report data returned successfully');
    assert(page1Data.records.length === 15, `Page 1 displays exactly 15 records (got ${page1Data.records.length})`);
    assert(page1Data.total === 19, `Total records correctly reports 19 (got ${page1Data.total})`);
    assert(page1Data.page === 1, `Current page is 1 (got ${page1Data.page})`);
    assert(page1Data.totalPages === 2, `Total pages calculated as 2 (got ${page1Data.totalPages})`);
    assert(page1Data.title === 'Coimbatore District Grievances Comprehensive Report', `Title is correct: ${page1Data.title}`);

    // Verify all relevant fields exist on the records
    const sample = page1Data.records[0];
    assert(!!sample.issueCode, `Record has Grievance ID: ${sample.issueCode}`);
    assert(!!sample.citizenName, `Record has Complainant Name: ${sample.citizenName}`);
    assert(!!sample.citizenMobile, `Record has Mobile: ${sample.citizenMobile}`);
    assert(sample.wardNumber !== undefined, `Record has Ward: ${sample.wardNumber}`);
    assert(sample.paguthi !== undefined, `Record has Paguthi: ${sample.paguthi}`);
    assert(!!sample.assignedDepartment, `Record has Department: ${sample.assignedDepartment}`);
    assert(!!sample.title, `Record has Grievance Subject: ${sample.title}`);
    assert(!!sample.status, `Record has Status: ${sample.status}`);
    assert(!!sample.priority, `Record has Priority: ${sample.priority}`);

    // 3. Test getReportData: Page 2 navigation
    console.log('\n--- Testing Task 1: Page 2 Navigation (Records 16-19) ---');
    let page2Data = null;
    await getReportData(
      { query: { reportType: 'grievances', page: '2', limit: '15' }, user: adminUser },
      {
        json: (res) => { page2Data = res.data; },
        status: () => ({ json: () => {} }),
      }
    );

    assert(page2Data !== null, 'Page 2 data returned successfully');
    assert(page2Data.records.length === 4, `Page 2 displays remaining 4 records (got ${page2Data.records.length})`);
    assert(page2Data.page === 2, `Current page is 2 (got ${page2Data.page})`);

    // Verify records on Page 1 and Page 2 do not overlap
    const p1Codes = new Set(page1Data.records.map((r) => r.issueCode));
    const p2Codes = page2Data.records.map((r) => r.issueCode);
    const hasOverlap = p2Codes.some((code) => p1Codes.has(code));
    assert(!hasOverlap, 'Records between Page 1 and Page 2 do not overlap or skip');

    // 4. Test Date Filtering
    console.log('\n--- Testing Task 1: Date Range Filtering ---');
    // Filter for 2026-11-18 only
    let nov18Data = null;
    await getReportData(
      {
        query: {
          reportType: 'grievances',
          startDate: '2026-11-18',
          endDate: '2026-11-18',
          page: '1',
          limit: '15',
        },
        user: adminUser,
      },
      {
        json: (res) => { nov18Data = res.data; },
        status: () => ({ json: () => {} }),
      }
    );
    assert(nov18Data.total === 6, `Date filter 2026-11-18 matches exactly 6 records (got ${nov18Data.total})`);
    assert(nov18Data.records.length === 6, `Page 1 displays all 6 records for 2026-11-18`);
    assert(nov18Data.totalPages === 1, `Total pages for 6 records is 1`);

    // Filter for out-of-range date (2026-10-01 to 2026-10-05)
    let emptyData = null;
    await getReportData(
      {
        query: {
          reportType: 'grievances',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          page: '1',
          limit: '15',
        },
        user: adminUser,
      },
      {
        json: (res) => { emptyData = res.data; },
        status: () => ({ json: () => {} }),
      }
    );
    assert(emptyData.total === 0, `Out-of-range date filter returns 0 records (got ${emptyData.total})`);
    assert(emptyData.records.length === 0, `No unrelated records shown for out-of-range filter`);

    // 5. Test Tasks 2 & 3: Export Excel Functionality & Download
    console.log('\n--- Testing Tasks 2 & 3: Export Excel & Generate Report Download ---');
    let exportBuffer = null;
    let exportHeaders = {};

    await exportReportExcel(
      {
        query: {
          reportType: 'grievances',
          startDate: '2026-11-01',
          endDate: '2026-11-19',
        },
        user: adminUser,
      },
      {
        setHeader: (k, v) => { exportHeaders[k] = v; },
        send: (buf) => { exportBuffer = buf; },
        status: (code) => ({
          json: (err) => console.error('Export error:', code, err),
        }),
      }
    );

    assert(exportBuffer !== null && exportBuffer.length > 0, `Excel file buffer generated (${exportBuffer?.length} bytes)`);
    assert(
      exportHeaders['Content-Type'] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      `Correct Content-Type header set: ${exportHeaders['Content-Type']}`
    );
    assert(
      exportHeaders['Content-Disposition'] ===
        'attachment; filename="Coimbatore_District_Grievance_Report_2026-11-01_to_2026-11-19.xlsx"',
      `Meaningful filename with date range in Content-Disposition: ${exportHeaders['Content-Disposition']}`
    );

    // Read and validate the generated Excel file structure using XLSX
    const workbook = XLSX.read(exportBuffer, { type: 'buffer' });
    assert(workbook.SheetNames.includes('Comprehensive_Report'), 'Workbook contains "Comprehensive_Report" sheet');
    assert(workbook.SheetNames.includes('Grievances_Data'), 'Workbook contains "Grievances_Data" sheet');

    const reportSheet = workbook.Sheets['Comprehensive_Report'];
    const sheetData = XLSX.utils.sheet_to_json(reportSheet, { header: 1 });

    // Verify Title and Headings
    assert(
      sheetData[0][0] === 'TAMILAGA VETTRI KAZHAGAM (TVK) - COIMBATORE DISTRICT',
      `Header Row 1 matches TVK branding: "${sheetData[0][0]}"`
    );
    assert(
      sheetData[1][0] === 'Coimbatore District Grievances Comprehensive Report',
      `Header Row 2 matches Report title: "${sheetData[1][0]}"`
    );

    // Verify Summary Statistics Block
    assert(
      sheetData[4][0] === 'REPORT SUMMARY & REDRESSAL STATISTICS',
      'Summary statistics header present'
    );
    const summaryRow = sheetData[5];
    assert(summaryRow[0] === 'Total Grievances' && summaryRow[1] === 19, `Summary Row total is 19 (got ${summaryRow[1]})`);

    // Verify Required Column Headings
    const expectedHeaders = [
      'S.No',
      'Grievance ID',
      'Complainant Name',
      'Mobile Number',
      'Constituency',
      'Paguthi',
      'Ward',
      'Department',
      'Grievance Subject',
      'Grievance Description',
      'Submitted Date',
      'Assigned Officer',
      'Current Status',
      'Priority',
      'Resolution Date',
    ];

    const actualHeaders = sheetData[7];
    const headersMatch = expectedHeaders.every((h, i) => actualHeaders[i] === h);
    assert(headersMatch, `All 15 specified export column headers are accurately present`);

    // Verify all 19 records are exported (Rows 8 to 26 in sheet)
    const exportRecordRows = sheetData.slice(8);
    assert(
      exportRecordRows.length === 19,
      `All 19 matching records exported to Excel, NOT just the 15 visible records (got ${exportRecordRows.length})`
    );

    // 6. Test Task 4: Removal of 3 Unwanted Cards from Frontend UI
    console.log('\n--- Testing Task 4: Verify Removal of 3 Unwanted Cards from UI ---');
    const reportsPageFile = path.resolve(__dirname, '../../frontend/src/pages/reports/ReportsPage.jsx');
    const reportsPageContent = fs.readFileSync(reportsPageFile, 'utf8');

    const hasWardCard = reportsPageContent.includes("id: 'wards'");
    const hasDeptCard = reportsPageContent.includes("id: 'departments'");
    const hasProjCard = reportsPageContent.includes("id: 'projects'");

    assert(!hasWardCard, '1. Ward Governance Performance card is completely removed from Reports UI');
    assert(!hasDeptCard, '2. Department Resolution Scorecard card is completely removed from Reports UI');
    assert(!hasProjCard, '3. District Infrastructure Projects card is completely removed from Reports UI');

    // Verify Main report and download features remain intact
    assert(reportsPageContent.includes("id: 'grievances'"), 'Coimbatore District Grievances Comprehensive Report is preserved');
    assert(reportsPageContent.includes('handleApplyFilter'), 'Apply Filter functionality is present');
    assert(reportsPageContent.includes('handleDownloadReport'), 'Generate Report download functionality is present');
    assert(reportsPageContent.includes('handlePageChange'), 'Pagination controls are present');

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
