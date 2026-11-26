import { Op } from 'sequelize';
import Member from '../models/Member.js';
import Constituency from '../models/Constituency.js';
import Ward from '../models/Ward.js';
import XLSX from 'xlsx';

// @desc    Get all members with filters and pagination
// @route   GET /api/members
// @access  Private
export const getMembers = async (req, res) => {
  try {
    const {
      search,
      gender,
      status,
      constituencyId,
      wardId,
      designation,
      isOfficeBearer,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    let where = {};

    if (gender && gender !== 'All' && gender !== 'All Gender') {
      where.gender = gender;
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (constituencyId) {
      const cNum = Number(constituencyId);
      if (!isNaN(cNum) && cNum > 0) {
        where.constituencyId = cNum;
      } else {
        const c = await Constituency.findOne({ where: { _id: String(constituencyId) } });
        if (c) where.constituencyId = c.id;
      }
    }
    if (wardId) {
      const wNum = Number(wardId);
      if (!isNaN(wNum) && wNum > 0) {
        where.wardId = wNum;
      } else {
        const w = await Ward.findOne({ where: { _id: String(wardId) } });
        if (w) where.wardId = w.id;
      }
    }
    if (designation && designation !== 'All') {
      where.designation = designation;
    }
    if (isOfficeBearer !== undefined && isOfficeBearer !== '') {
      where.isOfficeBearer = isOfficeBearer === 'true';
    }

    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { tamilName: { [Op.like]: `%${search}%` } },
        { memberId: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const validSortCol = ['createdAt', 'fullName', 'memberId', 'joiningDate'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    const validSortDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { count: total, rows: members } = await Member.findAndCountAll({
      where,
      include: [
        { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code'] },
        { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName', 'zone'] },
      ],
      order: [[validSortCol, validSortDir]],
      offset,
      limit: limitNum,
    });

    // Also calculate summary statistics
    const totalCount = await Member.count();
    const maleCount = await Member.count({ where: { gender: 'Male' } });
    const femaleCount = await Member.count({ where: { gender: 'Female' } });
    const officeBearerCount = await Member.count({ where: { isOfficeBearer: true } });

    // Format for frontend compatibility
    const formattedMembers = members.map((m) => {
      const obj = m.toObject();
      return {
        ...obj,
        constituencyId: m.constituency,
        wardId: m.ward,
      };
    });

    res.json({
      success: true,
      data: formattedMembers,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        totalMembers: totalCount,
        maleMembers: maleCount,
        femaleMembers: femaleCount,
        officeBearers: officeBearerCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single member by ID
// @route   GET /api/members/:id
// @access  Private
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const constituency = member.constituencyId ? await Constituency.findByPk(member.constituencyId) : null;
    const ward = member.wardId ? await Ward.findByPk(member.wardId) : null;

    res.json({
      success: true,
      data: {
        ...member.toObject(),
        constituencyId: constituency,
        wardId: ward,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new member
// @route   POST /api/members
// @access  Private
export const createMember = async (req, res) => {
  try {
    // Generate unique memberId if not provided
    if (!req.body.memberId) {
      const count = await Member.count();
      req.body.memberId = `TVK-CBE-${String(count + 1001).padStart(5, '0')}`;
    }

    const member = await Member.create(req.body);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private
export const updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export members to Excel
// @route   GET /api/members/export
// @access  Private
export const exportMembersExcel = async (req, res) => {
  try {
    const members = await Member.findAll({
      include: [
        { model: Constituency, as: 'constituency', attributes: ['name'] },
        { model: Ward, as: 'ward', attributes: ['wardNumber', 'wardName'] },
      ],
      order: [['memberId', 'ASC']],
    });

    const data = members.map((m) => ({
      'Member ID': m.memberId,
      'Full Name': m.fullName,
      'Tamil Name': m.tamilName || '-',
      'Gender': m.gender,
      'Mobile Number': m.mobileNumber,
      'Email': m.email || '-',
      'Designation': m.designation,
      'Office Bearer': m.isOfficeBearer ? 'Yes' : 'No',
      'Constituency': m.constituency ? m.constituency.name : '-',
      'Ward': m.ward ? `Ward ${m.ward.wardNumber} - ${m.ward.wardName}` : '-',
      'Status': m.status,
      'Joining Date': m.joiningDate ? new Date(m.joiningDate).toLocaleDateString() : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TVK_Members');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="TVK_Coimbatore_Members.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
