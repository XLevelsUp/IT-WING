import { Op } from 'sequelize';
import {
  Issue,
  Member,
  Ward,
  DepartmentOfficer,
  Project,
  Constituency,
} from '../models/index.js';
import XLSX from 'xlsx';

// Helper to construct normalized date query for local day boundaries
const buildDateQuery = (startDate, endDate) => {
  if (startDate && endDate) {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T23:59:59.999');
    return {
      createdAt: {
        [Op.between]: [s, e],
      },
    };
  } else if (startDate) {
    const s = new Date(startDate + 'T00:00:00');
    return {
      createdAt: {
        [Op.gte]: s,
      },
    };
  } else if (endDate) {
    const e = new Date(endDate + 'T23:59:59.999');
    return {
      createdAt: {
        [Op.lte]: e,
      },
    };
  }
  return {};
};

// @desc    Get Detailed Consolidated Report Data with Date Filter and Pagination
// @route   GET /api/reports/data
// @access  Private
export const getReportData = async (req, res) => {
  try {
    const {
      reportType = 'grievances',
      startDate,
      endDate,
      fromDate,
      toDate,
      page = 1,
      limit = 15,
      constituencyId,
      wardId,
    } = req.query;

    const start = startDate || fromDate;
    const end = endDate || toDate;
    const dateQuery = buildDateQuery(start, end);

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 15);
    const offset = (currentPage - 1) * pageSize;

    let result = {};

    switch (reportType) {
      case 'grievances': {
        const where = { ...dateQuery };
        if (constituencyId) {
          const cNum = Number(constituencyId);
          if (!isNaN(cNum) && cNum > 0) where.constituencyId = cNum;
          else {
            const c = await Constituency.findOne({ where: { _id: String(constituencyId) } });
            if (c) where.constituencyId = c.id;
          }
        }
        if (wardId) {
          const wNum = Number(wardId);
          if (!isNaN(wNum) && wNum > 0) where.wardId = wNum;
          else {
            const w = await Ward.findOne({ where: { _id: String(wardId) } });
            if (w) where.wardId = w.id;
          }
        }

        // Fetch paginated records matching date filter and optional ward/constituency filter
        const { count: total, rows: issues } = await Issue.findAndCountAll({
          where,
          include: [
            { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
            { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name'] },
            { model: DepartmentOfficer, as: 'assignedOfficerDetails', attributes: ['id', '_id', 'officerName', 'department'] },
          ],
          order: [['createdAt', 'DESC']],
          limit: pageSize,
          offset,
        });

        const records = issues.map((r) => {
          const obj = r.toObject ? r.toObject() : r.toJSON();
          return {
            ...obj,
            wardId: r.ward,
            constituencyId: r.constituency,
            assignedOfficerId: r.assignedOfficerDetails,
          };
        });

        // Compute summary statistics across all matching records (not just the 15 records on the current page)
        const resolved = await Issue.count({
          where: { ...where, status: ['Resolved', 'Completed'] },
        });
        const pending = await Issue.count({
          where: { ...where, status: ['Pending', 'New'] },
        });
        const inProgress = await Issue.count({
          where: { ...where, status: ['In Progress', 'Under Review', 'Assigned'] },
        });

        const totalPages = Math.ceil(total / pageSize) || 1;

        result = {
          title: 'Coimbatore District Grievances Comprehensive Report',
          records,
          total,
          page: currentPage,
          limit: pageSize,
          totalPages,
          resolved,
          pending,
          inProgress,
          filter: {
            startDate: start || null,
            endDate: end || null,
          },
        };
        break;
      }

      case 'members': {
        const where = { ...dateQuery };
        if (constituencyId) {
          const cNum = Number(constituencyId);
          if (!isNaN(cNum) && cNum > 0) where.constituencyId = cNum;
          else {
            const c = await Constituency.findOne({ where: { _id: String(constituencyId) } });
            if (c) where.constituencyId = c.id;
          }
        }
        if (wardId) {
          const wNum = Number(wardId);
          if (!isNaN(wNum) && wNum > 0) where.wardId = wNum;
          else {
            const w = await Ward.findOne({ where: { _id: String(wardId) } });
            if (w) where.wardId = w.id;
          }
        }

        const { count: total, rows: members } = await Member.findAndCountAll({
          where,
          include: [
            { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
            { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name'] },
          ],
          order: [['memberId', 'ASC']],
          limit: pageSize,
          offset,
        });

        const records = members.map((m) => {
          const obj = m.toObject ? m.toObject() : m.toJSON();
          return {
            ...obj,
            wardId: m.ward,
            constituencyId: m.constituency,
          };
        });

        const male = await Member.count({ where: { ...where, gender: 'Male' } });
        const female = await Member.count({ where: { ...where, gender: 'Female' } });
        const officeBearers = await Member.count({ where: { ...where, isOfficeBearer: true } });
        const totalPages = Math.ceil(total / pageSize) || 1;

        result = {
          title: 'TVK Coimbatore Cadre & Office Bearers Roster',
          records,
          total,
          page: currentPage,
          limit: pageSize,
          totalPages,
          male,
          female,
          officeBearers,
          filter: {
            startDate: start || null,
            endDate: end || null,
          },
        };
        break;
      }

      case 'wards': {
        const wards = await Ward.findAll({
          include: [{ model: Constituency, as: 'constituency', attributes: ['name'] }],
        });

        const augmented = await Promise.all(
          wards.map(async (w) => {
            const totalIssues = await Issue.count({ where: { wardId: w.id } });
            const resolved = await Issue.count({ where: { wardId: w.id, status: 'Resolved' } });
            const members = await Member.count({ where: { wardId: w.id } });
            return {
              wardNumber: w.wardNumber,
              wardName: w.wardName,
              zone: w.zone,
              constituency: w.constituency ? w.constituency.name : '-',
              totalIssues,
              resolvedIssues: resolved,
              pendingIssues: totalIssues - resolved,
              totalMembers: members,
            };
          })
        );

        result = {
          title: 'Ward-wise Governance & Performance Audit',
          records: augmented,
          totalWards: augmented.length,
        };
        break;
      }

      case 'departments': {
        const officers = await DepartmentOfficer.findAll();
        const depts = [
          'Corporation / Municipal Admin',
          'TWAD Board (Water Supply)',
          'TANGEDCO (Electricity)',
          'Highways & Road Infrastructure',
          'Public Health & Sanitation',
          'Police & Traffic Management',
        ];

        const records = await Promise.all(
          depts.map(async (d) => {
            const total = await Issue.count({ where: { assignedDepartment: d } });
            const resolved = await Issue.count({ where: { assignedDepartment: d, status: 'Resolved' } });
            const officersInDept = officers.filter((o) => o.department.includes(d.split(' ')[0])).length;
            return {
              department: d,
              totalIssues: total,
              resolvedIssues: resolved,
              pendingIssues: total - resolved,
              officersCount: officersInDept,
              resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
            };
          })
        );

        result = {
          title: 'Department Redressal Performance Scorecard',
          records,
        };
        break;
      }

      case 'projects': {
        const projects = await Project.findAll({
          include: [
            { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
            { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name'] },
          ],
        });

        const records = projects.map((p) => {
          const obj = p.toObject ? p.toObject() : p.toJSON();
          return {
            ...obj,
            wardId: p.ward,
            constituencyId: p.constituency,
          };
        });

        result = {
          title: 'District Initiatives & Infrastructure Projects',
          records,
          total: records.length,
          completed: records.filter((p) => p.status === 'Completed').length,
          ongoing: records.filter((p) => p.status === 'Ongoing').length,
        };
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getReportData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Consolidated Report to Excel with Date Range Filtering & Summary Statistics
// @route   GET /api/reports/export/excel
// @access  Private
export const exportReportExcel = async (req, res) => {
  try {
    const { reportType = 'grievances', startDate, endDate, fromDate, toDate, constituencyId, wardId } = req.query;

    const start = startDate || fromDate;
    const end = endDate || toDate;
    const dateQuery = buildDateQuery(start, end);

    if (reportType === 'grievances') {
      const where = { ...dateQuery };
      if (constituencyId) {
        const cNum = Number(constituencyId);
        if (!isNaN(cNum) && cNum > 0) where.constituencyId = cNum;
        else {
          const c = await Constituency.findOne({ where: { _id: String(constituencyId) } });
          if (c) where.constituencyId = c.id;
        }
      }
      if (wardId) {
        const wNum = Number(wardId);
        if (!isNaN(wNum) && wNum > 0) where.wardId = wNum;
        else {
          const w = await Ward.findOne({ where: { _id: String(wardId) } });
          if (w) where.wardId = w.id;
        }
      }

      // Fetch ALL matching grievance records across constituencies, paguthis, wards, departments
      const issues = await Issue.findAll({
        where,
        include: [
          { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
          { model: Constituency, as: 'constituency', attributes: ['id', 'name'] },
          { model: DepartmentOfficer, as: 'assignedOfficerDetails', attributes: ['id', 'officerName', 'department'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Calculate Summary Statistics for Report
      const total = issues.length;
      const resolved = issues.filter((i) => ['Resolved', 'Completed'].includes(i.status)).length;
      const pending = issues.filter((i) => ['Pending', 'New'].includes(i.status)).length;
      const inProgress = issues.filter((i) => ['In Progress', 'Under Review', 'Assigned'].includes(i.status)).length;
      const criticalPriority = issues.filter((i) => ['High', 'Critical'].includes(i.priority)).length;

      // Table Headers matching specification:
      // S.No, Grievance ID, Complainant Name, Mobile Number, Constituency, Paguthi, Ward, Department,
      // Grievance Subject, Grievance Description, Submitted Date, Assigned Officer, Current Status, Priority, Resolution Date
      const tableHeaders = [
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

      const dataRows = issues.map((r, idx) => {
        const wardLabel = r.ward
          ? `Ward ${r.ward.wardNumber || ''}${r.ward.wardName ? ` - ${r.ward.wardName}` : ''}`
          : r.wardNumber
          ? `Ward ${r.wardNumber}${r.wardName ? ` - ${r.wardName}` : ''}`
          : '-';

        const paguthiLabel =
          r.paguthi || (r.ward?.wardName ? r.ward.wardName.split(' ')[0] : '-');

        const submittedDate = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '-';

        const resolutionDate = r.resolvedAt
          ? new Date(r.resolvedAt).toISOString().split('T')[0]
          : r.completedAt
          ? new Date(r.completedAt).toISOString().split('T')[0]
          : '-';

        const officerName =
          r.assignedOfficer || r.assignedOfficerDetails?.officerName || 'Unassigned';

        return [
          idx + 1,
          r.issueCode || r.complaintId || String(r.id),
          r.citizenName || '-',
          r.citizenMobile || '-',
          r.constituency?.name || 'Kinathukadavu',
          paguthiLabel,
          wardLabel,
          r.assignedDepartment || r.assignedOfficerDetails?.department || 'Corporation Admin',
          r.title || '-',
          r.description || '-',
          submittedDate,
          officerName,
          r.status || 'New',
          r.priority || 'Medium',
          resolutionDate,
        ];
      });

      const dateFilterText =
        start && end
          ? `${start} to ${end}`
          : start
          ? `From ${start} onwards`
          : end
          ? `Up to ${end}`
          : 'All Records (Full History)';

      // Build Sheet 1: Comprehensive Report with Header Banner & Summary Statistics
      const aoaMain = [
        ['TAMILAGA VETTRI KAZHAGAM (TVK) - COIMBATORE DISTRICT'],
        ['Coimbatore District Grievances Comprehensive Report'],
        [
          `Date Filter: ${dateFilterText}`,
          '',
          '',
          `Generated Date: ${new Date().toISOString().split('T')[0]}`,
          '',
          '',
          `Total Matching Records: ${total}`,
        ],
        [],
        ['REPORT SUMMARY & REDRESSAL STATISTICS'],
        [
          'Total Grievances',
          total,
          'Resolved / Completed',
          resolved,
          'In Progress / Assigned',
          inProgress,
          'Pending / New',
          pending,
          'High / Critical Priority',
          criticalPriority,
        ],
        [],
        tableHeaders,
        ...dataRows,
      ];

      const wsMain = XLSX.utils.aoa_to_sheet(aoaMain);
      wsMain['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 18 }, // Grievance ID
        { wch: 22 }, // Complainant Name
        { wch: 15 }, // Mobile Number
        { wch: 18 }, // Constituency
        { wch: 18 }, // Paguthi
        { wch: 25 }, // Ward
        { wch: 28 }, // Department
        { wch: 32 }, // Grievance Subject
        { wch: 45 }, // Grievance Description
        { wch: 14 }, // Submitted Date
        { wch: 20 }, // Assigned Officer
        { wch: 14 }, // Current Status
        { wch: 12 }, // Priority
        { wch: 16 }, // Resolution Date
      ];

      // Build Sheet 2: Raw tabular data for direct pivot / spreadsheet filtering
      const rawAoa = [tableHeaders, ...dataRows];
      const wsRaw = XLSX.utils.aoa_to_sheet(rawAoa);
      wsRaw['!cols'] = wsMain['!cols'];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, wsMain, 'Comprehensive_Report');
      XLSX.utils.book_append_sheet(workbook, wsRaw, 'Grievances_Data');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Generate meaningful filename containing report name and selected date range
      let filename = 'Coimbatore_District_Grievance_Report';
      if (start && end) {
        filename += `_${start}_to_${end}`;
      } else if (start) {
        filename += `_from_${start}`;
      } else if (end) {
        filename += `_up_to_${end}`;
      } else {
        filename += `_All_Records_${new Date().toISOString().split('T')[0]}`;
      }
      filename += '.xlsx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.send(buffer);
    }

    if (reportType === 'members') {
      const where = { ...dateQuery };
      if (constituencyId) {
        const cNum = Number(constituencyId);
        if (!isNaN(cNum) && cNum > 0) where.constituencyId = cNum;
      }
      if (wardId) {
        const wNum = Number(wardId);
        if (!isNaN(wNum) && wNum > 0) where.wardId = wNum;
      }

      const members = await Member.findAll({
        where,
        include: [
          { model: Ward, as: 'ward', attributes: ['wardNumber', 'wardName'] },
          { model: Constituency, as: 'constituency', attributes: ['name'] },
        ],
        order: [['memberId', 'ASC']],
      });

      const data = members.map((m, idx) => ({
        'S.No': idx + 1,
        'Member ID': m.memberId,
        'Full Name': m.fullName,
        Gender: m.gender,
        Mobile: m.mobileNumber,
        Designation: m.designation,
        Constituency: m.constituency ? m.constituency.name : 'Kinathukadavu',
        Ward: m.ward ? `Ward ${m.ward.wardNumber} - ${m.ward.wardName}` : '-',
        Status: m.status,
        'Enrolled Date': m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Members_Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      let filename = 'TVK_Members_Report';
      if (start && end) filename += `_${start}_to_${end}`;
      filename += '.xlsx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.send(buffer);
    }

    res.status(400).json({ success: false, message: 'Invalid report export type' });
  } catch (error) {
    console.error('exportReportExcel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
