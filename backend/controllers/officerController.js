import { Op } from 'sequelize';
import DepartmentOfficer from '../models/DepartmentOfficer.js';
import Issue from '../models/Issue.js';
import Ward from '../models/Ward.js';
import XLSX from 'xlsx';

// @desc    Get all department officers
// @route   GET /api/officers
// @access  Private
export const getOfficers = async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let where = {};

    if (department && department !== 'All') {
      where.department = department;
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { officerName: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } },
        { contactNumber: { [Op.like]: `%${search}%` } },
        { workingArea: { [Op.like]: `%${search}%` } },
      ];
    }

    const officers = await DepartmentOfficer.findAll({
      where,
      order: [
        ['department', 'ASC'],
        ['officerName', 'ASC'],
      ],
    });

    // Augment with active grievance count
    const augmented = await Promise.all(
      officers.map(async (o) => {
        const assignedIssuesCount = await Issue.count({ where: { assignedOfficerId: o.id } });
        const pendingIssuesCount = await Issue.count({
          where: {
            assignedOfficerId: o.id,
            status: { [Op.ne]: 'Resolved' },
          },
        });
        return {
          ...o.toObject(),
          assignedIssuesCount,
          pendingIssuesCount,
        };
      })
    );

    const totalCount = await DepartmentOfficer.count();
    const activeCount = await DepartmentOfficer.count({ where: { status: 'Active' } });

    res.json({
      success: true,
      data: augmented,
      summary: {
        total: totalCount,
        active: activeCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single officer by ID with assigned issues
// @route   GET /api/officers/:id
// @access  Private
export const getOfficerById = async (req, res) => {
  try {
    const officer = await DepartmentOfficer.findById(req.params.id);
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    const issues = await Issue.findAll({
      where: { assignedOfficerId: officer.id },
      include: [{ model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] }],
      order: [['createdAt', 'DESC']],
    });

    const formattedIssues = issues.map((i) => ({
      ...i.toObject(),
      wardId: i.ward,
    }));

    res.json({
      success: true,
      data: {
        officer,
        assignedIssues: formattedIssues,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new officer
// @route   POST /api/officers
// @access  Private
export const createOfficer = async (req, res) => {
  try {
    const officer = await DepartmentOfficer.create(req.body);
    res.status(201).json({ success: true, data: officer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update officer
// @route   PUT /api/officers/:id
// @access  Private
export const updateOfficer = async (req, res) => {
  try {
    const officer = await DepartmentOfficer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    res.json({ success: true, data: officer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete officer
// @route   DELETE /api/officers/:id
// @access  Private
export const deleteOfficer = async (req, res) => {
  try {
    const officer = await DepartmentOfficer.findByIdAndDelete(req.params.id);
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    res.json({ success: true, message: 'Officer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export officers to Excel
// @route   GET /api/officers/export
// @access  Private
export const exportOfficersExcel = async (req, res) => {
  try {
    const officers = await DepartmentOfficer.findAll({
      order: [
        ['department', 'ASC'],
        ['officerName', 'ASC'],
      ],
    });

    const data = officers.map((o) => ({
      'Officer Name': o.officerName,
      Department: o.department,
      Designation: o.designation,
      'Contact Number': o.contactNumber,
      Email: o.email || '-',
      'Office Address': o.officeAddress || '-',
      'Working Area': o.workingArea,
      Status: o.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Department_Officers');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Coimbatore_Department_Officers.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
