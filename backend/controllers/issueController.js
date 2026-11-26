import * as XLSX from 'xlsx';
import { Op } from 'sequelize';
import sequelize from '../config/mysql.js';
import { isVillageValidForPaguthi, getCanonicalTargetPaguthis } from '../utils/paguthiVillageData.js';
import {
  Issue,
  IssueActivity,
  User,
  Notification,
  Ward,
  Constituency,
  District,
  DepartmentOfficer,
  ComplaintBeforeImage,
  ComplaintAfterImage,
  ComplaintAction,
  ComplaintStatusHistory,
  ComplaintAttachment,
} from '../models/index.js';

const issueIncludes = [
  { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code', 'zone'] },
  { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName', 'zone', 'paguthi'] },
  { model: DepartmentOfficer, as: 'assignedOfficerDetails', attributes: ['id', '_id', 'officerName', 'department', 'designation', 'contactNumber', 'email', 'officeAddress'] },
  { model: User, as: 'assignedWardSecretary', attributes: ['id', '_id', 'name', 'username', 'phone', 'email', 'role', 'assignedWard'] },
  { model: User, as: 'completedByUser', attributes: ['id', '_id', 'name', 'username'] },
  { model: ComplaintBeforeImage, as: 'beforeImages', attributes: ['id', 'imageUrl', 'caption', 'uploadedAt'] },
  { model: ComplaintAfterImage, as: 'afterImages', attributes: ['id', 'actionId', 'imageUrl', 'caption', 'uploadedAt'] },
  { model: ComplaintAction, as: 'actions', attributes: ['id', 'wardSecretaryId', 'actionTaken', 'wardSecretaryRemarks', 'beforeImage', 'afterImage', 'completedAt'] },
  { model: ComplaintStatusHistory, as: 'statusHistories', attributes: ['id', 'status', 'updatedBy', 'updatedByName', 'remarks', 'photoURLs', 'timestamp'] },
  { model: ComplaintAttachment, as: 'attachmentList', attributes: ['id', 'fileName', 'fileUrl', 'mimeType', 'uploadedAt'] },
];

// Calculate automatic complaint priority based on ageing rules:
// 0–7 Days  -> Low
// 8–14 Days -> Medium
// 15+ Days  -> High
export const computeAgeingPriority = (createdAt) => {
  if (!createdAt) return 'Low';
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  if (diffDays <= 7) return 'Low';
  if (diffDays <= 14) return 'Medium';
  return 'High';
};

// Helper to format issue document so frontend gets both relational aliases and traditional mongoose properties
export const formatIssue = (issueInstance) => {
  if (!issueInstance) return null;
  const raw = issueInstance.toJSON ? issueInstance.toJSON() : issueInstance;
  const autoPriority = computeAgeingPriority(raw.createdAt);

  const beforeImg =
    (raw.beforeImage && String(raw.beforeImage).trim()) ||
    (raw.beforePhoto && String(raw.beforePhoto).trim()) ||
    (Array.isArray(raw.beforeImages) && raw.beforeImages[0]?.imageUrl) ||
    '';
  const afterImg =
    (raw.afterImage && String(raw.afterImage).trim()) ||
    (raw.afterPhoto && String(raw.afterPhoto).trim()) ||
    (Array.isArray(raw.afterImages) && raw.afterImages[0]?.imageUrl) ||
    (Array.isArray(raw.actions) && raw.actions[0]?.afterImage) ||
    '';
  const actionDesc =
    (raw.actionTaken && String(raw.actionTaken).trim()) ||
    (raw.finalReport && String(raw.finalReport).trim()) ||
    (Array.isArray(raw.actions) && raw.actions[0]?.actionTaken) ||
    '';
  const secRemarks =
    (raw.wardSecretaryRemarks && String(raw.wardSecretaryRemarks).trim()) ||
    (Array.isArray(raw.actions) && raw.actions[0]?.wardSecretaryRemarks) ||
    '';
  const completedDate =
    raw.completedAt ||
    raw.resolvedAt ||
    (Array.isArray(raw.actions) && raw.actions[0]?.completedAt) ||
    null;

  return {
    ...raw,
    village: raw.village || '',
    priority: autoPriority,
    _id: raw._id || String(raw.id),
    beforeImage: beforeImg,
    beforePhoto: beforeImg,
    afterImage: afterImg,
    afterPhoto: afterImg,
    actionTaken: actionDesc,
    finalReport: actionDesc,
    wardSecretaryRemarks: secRemarks,
    completedAt: completedDate,
    resolvedAt: completedDate || raw.resolvedAt,
    constituencyId: raw.constituency || raw.constituencyId,
    wardId: raw.ward || raw.wardId,
    assignedOfficerId: raw.assignedOfficerDetails || raw.assignedOfficerId,
    assignedWardSecretaryId: raw.assignedWardSecretary || raw.assignedWardSecretaryId,
    assignedWardSecretary: raw.assignedWardSecretary || null,
    assignedWardSecretaryName: raw.assignedWardSecretary?.name || raw.assignedWardSecretary?.username || '',
    completedBy: raw.completedByUser || raw.completedBy,
  };
};

// @desc    Get all issues / grievances with filters & pagination
// @route   GET /api/issues
// @access  Private
export const getIssues = async (req, res) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      paguthi,
      constituencyId,
      wardId,
      wardNumber,
      ward,
      assignedDepartment,
      department,
      dateFilter,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const whereConditions = [];

    // Role-based scoping
    if (req.user) {
      if (req.user.role === 'ward_secretary' || req.user.role === 'ward' || req.user.role === 'ward_officer') {
        // Enforce strict Paguthi + Ward-Based Data Access:
        // "Every registered Ward Secretary must see only their own assigned data."
        const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
        const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
        const wardConditions = [{ assignedWardSecretaryId: req.user.id }];
        if (req.user._id) wardConditions.push({ assignedWardSecretaryId: req.user._id });
        if (req.user.wardId) {
          wardConditions.push({
            wardId: req.user.wardId,
            ...(req.user.paguthi ? { paguthi: req.user.paguthi } : {}),
          });
        }
        if (userWardNum && req.user.paguthi) {
          wardConditions.push({
            wardNumber: userWardNum,
            paguthi: req.user.paguthi,
          });
        }
        whereConditions.push({ [Op.or]: wardConditions });
      } else if (req.user.role === 'subadmin') {
        // Subadmin can view complaints across the jurisdiction or filtered by constituency if specified
        if (constituencyId) {
          const cId = Number(constituencyId) || constituencyId;
          whereConditions.push({ [Op.or]: [{ constituencyId: cId }] });
        } else if (req.user.constituency && req.user.constituency !== 'All' && req.user.constituency !== 'Coimbatore') {
          const constObj = await Constituency.findOne({ where: { name: req.user.constituency } });
          if (constObj) {
            whereConditions.push({ [Op.or]: [{ constituencyId: constObj.id }, { districtId: { [Op.ne]: null } }] });
          }
        }
      } else if (req.user.role === 'citizen' || req.user.role === 'user') {
        const citizenOrs = [];
        if (req.user.id) citizenOrs.push({ userId: req.user.id });
        if (req.user.phone) citizenOrs.push({ citizenMobile: req.user.phone });
        if (citizenOrs.length > 0) whereConditions.push({ [Op.or]: citizenOrs });
      } else if (req.user.role === 'paguthi_seyalaalar') {
        const userPaguthi = req.user.paguthi || '';
        if (userPaguthi) {
          const normPaguthi = userPaguthi === 'Podanur' ? 'Pothanur' : userPaguthi;
          const targetPaguthis = (normPaguthi === 'Pothanur') ? ['Pothanur', 'Podanur'] : [normPaguthi];
          const pWards = await Ward.findAll({
            where: { paguthi: { [Op.in]: targetPaguthis } },
            attributes: ['id'],
          });
          const pWardIds = pWards.map((w) => w.id);
          whereConditions.push({
            [Op.or]: [
              { paguthi: { [Op.in]: targetPaguthis } },
              ...(pWardIds.length > 0 ? [{ wardId: { [Op.in]: pWardIds } }] : []),
            ],
          });
        }
      }
    }

    if (status && status !== 'All' && status !== 'All Status' && status !== 'All Statuses') {
      if (status === 'Completed' || status === 'Resolved') {
        whereConditions.push({ status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] } });
      } else if (status === 'New') {
        whereConditions.push({ status: 'New' });
      } else if (status === 'Pending') {
        whereConditions.push({ status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } });
      } else if (status === 'In Progress') {
        whereConditions.push({ status: 'In Progress' });
      } else {
        whereConditions.push({ status });
      }
    }

    if (priority && priority !== 'All' && priority !== 'All Priorities') {
      whereConditions.push({ priority });
    }

    if (category && category !== 'All') {
      whereConditions.push({ category });
    }

    if (paguthi && paguthi !== 'All' && paguthi !== 'All Paguthis') {
      whereConditions.push({ paguthi: paguthi.trim() });
    }

    if (constituencyId) {
      const cNum = Number(constituencyId);
      if (!isNaN(cNum)) {
        whereConditions.push({ constituencyId: cNum });
      }
    }

    // Ward filtering (handles wardId, wardNumber, ward, and resolves ward number vs DB id)
    const rawWard = wardId || wardNumber || ward;
    if (rawWard && rawWard !== 'All' && rawWard !== 'all' && rawWard !== 'All Wards') {
      const matchDigits = String(rawWard).match(/\d+/);
      const extractedNum = matchDigits ? parseInt(matchDigits[0], 10) : null;
      let matchedWard = null;

      if (extractedNum !== null) {
        matchedWard = await Ward.findOne({
          where: {
            [Op.or]: [
              { wardNumber: extractedNum },
              { id: extractedNum }
            ]
          }
        });
      } else {
        matchedWard = await Ward.findOne({
          where: { _id: String(rawWard) }
        });
      }

      if (matchedWard) {
        whereConditions.push({
          [Op.or]: [
            { wardId: matchedWard.id },
            { wardNumber: matchedWard.wardNumber }
          ]
        });
      } else if (extractedNum !== null) {
        whereConditions.push({
          [Op.or]: [
            { wardNumber: extractedNum },
            { wardId: extractedNum }
          ]
        });
      } else {
        whereConditions.push({ wardId: rawWard });
      }
    }

    // Department filtering (handles assignedDepartment or department)
    const rawDept = assignedDepartment || department;
    if (rawDept && rawDept !== 'All' && rawDept !== 'all' && rawDept !== 'All Departments') {
      whereConditions.push({ assignedDepartment: rawDept });
    }

    // Date filtering (handles dateFilter: today, thisWeek, thisMonth)
    const rawDateFilter = req.query.dateFilter || dateFilter;
    if (rawDateFilter && rawDateFilter !== 'All' && rawDateFilter !== 'all' && rawDateFilter !== 'All Dates') {
      const now = new Date();
      if (rawDateFilter === 'today' || rawDateFilter === 'Today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        whereConditions.push({ createdAt: { [Op.gte]: startOfToday } });
      } else if (rawDateFilter === 'thisWeek' || rawDateFilter === 'week' || rawDateFilter === 'This Week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        whereConditions.push({ createdAt: { [Op.gte]: weekAgo } });
      } else if (rawDateFilter === 'thisMonth' || rawDateFilter === 'month' || rawDateFilter === 'This Month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        whereConditions.push({ createdAt: { [Op.gte]: monthAgo } });
      }
    }

    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { issueCode: { [Op.like]: pattern } },
          { title: { [Op.like]: pattern } },
          { citizenName: { [Op.like]: pattern } },
          { citizenMobile: { [Op.like]: pattern } },
          { category: { [Op.like]: pattern } },
          { description: { [Op.like]: pattern } },
        ],
      });
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortCol = ['id', 'createdAt', 'updatedAt', 'issueCode', 'status', 'priority'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    const validSortDir = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { count: total, rows: issuesList } = await Issue.findAndCountAll({
      where: whereClause,
      include: issueIncludes,
      order: [[validSortCol, validSortDir]],
      offset,
      limit: limitNum,
      distinct: true,
    });

    // Summary statistics without status filter
    const summaryWhereConditions = whereConditions.filter(
      (cond) => !cond.status && (!cond[Op.in] || !cond.status)
    );
    const summaryWhere = summaryWhereConditions.length > 0 ? { [Op.and]: summaryWhereConditions } : {};

    const [totalCount, newCount, closedCount, inProgressCount, pendingCount] = await Promise.all([
      Issue.count({ where: summaryWhere }),
      Issue.count({ where: { ...summaryWhere, status: 'New' } }),
      Issue.count({ where: { ...summaryWhere, status: { [Op.in]: ['Resolved', 'Closed', 'Completed'] } } }),
      Issue.count({ where: { ...summaryWhere, status: 'In Progress' } }),
      Issue.count({ where: { ...summaryWhere, status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } } }),
    ]);

    res.json({
      success: true,
      data: issuesList.map(formatIssue),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      summary: {
        totalIssues: totalCount,
        newIssues: newCount,
        closedIssues: closedCount,
        inProgressIssues: inProgressCount,
        pendingIssues: pendingCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single issue by ID with timeline and action details
// @route   GET /api/issues/:id
// @access  Private
export const getIssueById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId, { include: issueIncludes });
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { [Op.or]: [{ _id: rawId }, { issueCode: rawId }] }, include: issueIncludes });
    }

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Strict Data Filtering: Ward Secretary can only view complaints assigned to them or their assigned Paguthi + Ward
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isDirectAssigned = (issue.assignedWardSecretaryId === req.user.id) || (String(issue.assignedWardSecretaryId) === String(req.user._id));
      const isSameWardAndPaguthi = Boolean(
        (req.user.wardId && issue.wardId === req.user.wardId) ||
        (req.user.paguthi && issue.paguthi === req.user.paguthi && (
          issue.wardNumber === userWardNum
        ))
      );
      if (!isDirectAssigned && !isSameWardAndPaguthi) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view complaints in your assigned municipal ward and paguthi.',
        });
      }
    }

    // Strict Data Filtering: Paguthi Seyalaalar can only view complaints in their assigned Paguthi / Ondriyam / Nagaram
    if (req.user?.role === 'paguthi_seyalaalar') {
      const userPaguthi = req.user.paguthi || '';
      const allowed = userPaguthi === 'Podanur' ? 'Pothanur' : userPaguthi;
      const issuePaguthi = issue.paguthi === 'Podanur' ? 'Pothanur' : (issue.paguthi || issue.ward?.paguthi || '');
      if (allowed && issuePaguthi && allowed.toLowerCase() !== issuePaguthi.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only view complaints in your assigned jurisdiction (${allowed}).`,
        });
      }
    }

    // Strict Data Filtering: Citizen / User can ONLY view and download their own complaints
    if (['citizen', 'user'].includes(req.user?.role)) {
      const isOwnerById = issue.userId && (Number(issue.userId) === Number(req.user.id) || String(issue.userId) === String(req.user._id));
      const isOwnerByPhone = req.user.phone && issue.citizenMobile && (String(issue.citizenMobile).trim() === String(req.user.phone).trim());
      if (!isOwnerById && !isOwnerByPhone) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view and download your own complaints.',
        });
      }
    }

    const activities = await IssueActivity.findAll({
      where: { issueId: issue.id },
      include: [{ model: User, as: 'performer', attributes: ['id', 'name', 'role'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        issue: formatIssue(issue),
        activities,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new grievance / issue
// @route   POST /api/issues
// @access  Private
export const createIssue = async (req, res) => {
  try {
    if (!req.body.issueCode) {
      const year = new Date().getFullYear();
      const count = await Issue.count();
      req.body.issueCode = `GRI-${year}-${String(count + 101).padStart(4, '0')}`;
    }
    req.body.complaintId = req.body.issueCode;

    if (!req.body.status || req.body.status === 'Pending') {
      req.body.status = 'New';
    }

    // Automatic Priority Assignment based on complaint age (Update 1 & 2):
    // Newly created complaints (0 days old) are automatically assigned 'Low' priority.
    req.body.priority = computeAgeingPriority(new Date());

    if (req.user) {
      req.body.userId = req.user.id;
    }

    // Resolve Ward by wardId or (wardNumber + paguthi)
    let wardDoc = null;
    const requestedPaguthi = (req.body.paguthi || '').trim();
    const rawWard = req.body.wardNumber !== undefined && req.body.wardNumber !== null && req.body.wardNumber !== ''
      ? req.body.wardNumber
      : req.body.wardId;
    const parsedWardNum = rawWard ? parseInt(String(rawWard).replace(/\D+/g, ''), 10) : null;

    if (requestedPaguthi && parsedWardNum && !isNaN(parsedWardNum)) {
      // 1. Strictly look for a ward with both wardNumber and paguthi
      const targetPaguthis = getCanonicalTargetPaguthis(requestedPaguthi);
      wardDoc = await Ward.findOne({
        where: {
          wardNumber: parsedWardNum,
          paguthi: { [Op.in]: targetPaguthis },
        },
      });

      // 2. If no ward exists yet for this paguthi, create it dynamically
      if (!wardDoc) {
        const kinathu = await Constituency.findOne({ where: { name: 'Kinathukadavu' } });
        wardDoc = await Ward.create({
          wardNumber: parsedWardNum,
          wardName: `${requestedPaguthi} Ward ${parsedWardNum}`,
          tamilName: `${requestedPaguthi} வார்டு ${parsedWardNum}`,
          paguthi: requestedPaguthi,
          constituencyId: kinathu?.id || 6,
          zone: 'South Zone',
        });
      }
    } else if (req.body.wardId) {
      const wNum = Number(req.body.wardId);
      if (!isNaN(wNum) && wNum > 0) {
        wardDoc = await Ward.findByPk(wNum);
      }
      if (!wardDoc) {
        wardDoc = await Ward.findOne({ where: { _id: String(req.body.wardId) } });
      }
    }

    const finalPaguthi = (requestedPaguthi || wardDoc?.paguthi || '').trim();

    // Village validation & assignment
    const cleanVillage = (req.body.village || '').trim();
    const paguthiForValidation = finalPaguthi || requestedPaguthi;
    if (paguthiForValidation && !isVillageValidForPaguthi(paguthiForValidation, cleanVillage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid village "${cleanVillage}" for selected Paguthi "${paguthiForValidation}". Please select a valid village from the list.`,
      });
    }
    req.body.village = cleanVillage;

    if (wardDoc) {
      req.body.wardId = wardDoc.id;
      req.body.wardNumber = wardDoc.wardNumber;
      req.body.wardName = wardDoc.wardName || (finalPaguthi ? `${finalPaguthi} Ward ${wardDoc.wardNumber}` : req.body.wardName || '');
      req.body.paguthi = finalPaguthi;
      if (wardDoc.constituencyId && !req.body.constituencyId) {
        req.body.constituencyId = wardDoc.constituencyId;
      }
    } else if (requestedPaguthi) {
      req.body.paguthi = requestedPaguthi;
      if (parsedWardNum && !isNaN(parsedWardNum)) {
        req.body.wardNumber = parsedWardNum;
      }
    }

    if (!req.body.districtId) {
      const districtDoc = await District.findOne({ where: { code: 'CBE' } });
      if (districtDoc) req.body.districtId = districtDoc.id;
    }

    // AUTOMATIC WARD SECRETARY ASSIGNMENT based on Paguthi + Ward combination
    let assignedSec = null;
    if (req.body.assignedWardSecretaryId) {
      const secNum = Number(req.body.assignedWardSecretaryId);
      if (!isNaN(secNum) && secNum > 0) {
        assignedSec = await User.findByPk(secNum);
      } else {
        assignedSec = await User.findOne({
          where: {
            [Op.or]: [
              { _id: String(req.body.assignedWardSecretaryId) },
              { username: String(req.body.assignedWardSecretaryId) },
            ],
          },
        });
      }
    }

    if (!assignedSec && (wardDoc || (requestedPaguthi && req.body.wardNumber))) {
      const targetWardNum = wardDoc ? wardDoc.wardNumber : parseInt(String(req.body.wardNumber).replace(/\D+/g, ''), 10);

      // 1. Direct match on wardId
      if (wardDoc) {
        assignedSec = await User.findOne({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            wardId: wardDoc.id,
          },
        });
      }

      // 2. Strict Paguthi + Ward combination match
      if (!assignedSec && finalPaguthi && targetWardNum) {
        assignedSec = await User.findOne({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            paguthi: finalPaguthi,
            [Op.or]: [
              { assignedWard: `Ward ${targetWardNum}` },
              { assignedWard: `Ward ${targetWardNum} - ${wardDoc ? wardDoc.wardName : ''}` },
              { assignedWard: { [Op.like]: `Ward ${targetWardNum} - %` } },
              { assignedWard: { [Op.like]: `Ward ${targetWardNum} %` } },
            ],
          },
        });
      }

      // 3. Fallback to wardDoc.wardSecretaryId
      if (!assignedSec && wardDoc && wardDoc.wardSecretaryId) {
        assignedSec = await User.findOne({
          where: {
            id: wardDoc.wardSecretaryId,
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
          },
        });
      }
    }

    if (assignedSec) {
      req.body.assignedWardSecretaryId = assignedSec.id;
      req.body.assignedWard = assignedSec.assignedWard || (wardDoc ? `Ward ${wardDoc.wardNumber}` : '');
    } else {
      req.body.assignedWardSecretaryId = null;
    }

    // Sync beforeImage & beforePhoto
    const bImg = (req.body.beforeImage || req.body.beforePhoto || '').trim();
    if (bImg) {
      req.body.beforeImage = bImg;
      req.body.beforePhoto = bImg;
    }

    // Set attachments if photo provided
    if (bImg && (!req.body.attachments || req.body.attachments.length === 0)) {
      req.body.attachments = [
        {
          fileName: 'Supporting Evidence Photo',
          fileUrl: bImg,
          mimeType: 'image/jpeg',
          uploadedAt: new Date(),
        },
      ];
    }

    if (req.body.complainantName && !req.body.citizenName) {
      req.body.citizenName = req.body.complainantName;
    }
    if (req.body.complainantMobile && !req.body.citizenMobile) {
      req.body.citizenMobile = req.body.complainantMobile;
    }
    if (req.body.subject && !req.body.title) {
      req.body.title = req.body.subject;
    }

    if (req.user && (req.user.role === 'ward_secretary' || req.user.role === 'ward')) {
      req.body.assignedWardSecretaryId = req.user.id;
    }

    req.body.statusHistory = [
      {
        status: req.body.status,
        updatedBy: req.user ? String(req.user.id) : 'System',
        updatedByName: req.user ? (req.user.name || req.user.username) : 'Citizen User',
        remarks: req.body.adminRemarks || 'Complaint registered',
        timestamp: new Date(),
        photoURLs: bImg ? [bImg] : [],
      },
    ];

    const issue = await Issue.create(req.body);

    // Save into relational Before Images table
    if (bImg) {
      await ComplaintBeforeImage.create({
        complaintId: issue.id,
        imageUrl: bImg,
        caption: 'Citizen Original Complaint Proof',
        uploadedAt: new Date(),
      });
      await ComplaintAttachment.create({
        complaintId: issue.id,
        fileName: 'Supporting Evidence Photo',
        fileUrl: bImg,
        mimeType: 'image/jpeg',
      });
    }

    // Save into relational Status History table
    await ComplaintStatusHistory.create({
      complaintId: issue.id,
      status: issue.status,
      updatedBy: req.user ? String(req.user.id) : 'System',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Citizen User',
      remarks: req.body.adminRemarks || 'Complaint registered',
      photoURLs: bImg ? [bImg] : [],
      timestamp: new Date(),
    });

    // Create initial activity log
    await IssueActivity.create({
      issueId: issue.id,
      performedBy: req.user ? req.user.id : null,
      action: 'Created',
      newStatus: issue.status,
      notes: `Grievance registered under ${issue.category} for Ward ${req.body.wardNumber || ''}`,
    });

    const populated = await Issue.findByPk(issue.id, { include: issueIncludes });
    res.status(201).json({ success: true, data: formatIssue(populated || issue) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update issue (Status, Officer, Remarks, Photos, Final Report)
// @route   PUT /api/issues/:id
// @access  Private
export const updateIssue = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let currentIssue = null;
    if (!isNaN(numId) && numId > 0) {
      currentIssue = await Issue.findByPk(numId);
    }
    if (!currentIssue) {
      currentIssue = await Issue.findOne({ where: { _id: rawId } });
    }

    if (!currentIssue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Ward-Based Data Access (Update 3.D): Ward Secretary can only update complaints for their assigned ward
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isAssigned = (currentIssue.assignedWardSecretaryId === req.user.id) || (String(currentIssue.assignedWardSecretaryId) === String(req.user._id));
      const isSameWard = userWardNum && (currentIssue.wardNumber === userWardNum);
      if (!isAssigned && !isSameWard) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update complaints in your assigned municipal ward.',
        });
      }
    }

    const oldStatus = currentIssue.status;
    const oldOfficer = currentIssue.assignedOfficerId ? String(currentIssue.assignedOfficerId) : '';
    const updateData = { ...req.body };

    if (req.body.status === 'In Progress' && !currentIssue.workStartedAt) {
      updateData.workStartedAt = new Date();
    }

    if (req.body.status === 'Resolved' || req.body.status === 'Closed' || req.body.status === 'Completed') {
      if (!currentIssue.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (!currentIssue.completedAt) {
        updateData.completedAt = new Date();
      }
      if (req.body.finalReport) {
        updateData.finalReport = req.body.finalReport;
      }
    }

    const statusChanged = req.body.status && req.body.status !== oldStatus;
    const remarksProvided = req.body.adminRemarks && req.body.adminRemarks !== currentIssue.adminRemarks;

    if (statusChanged || remarksProvided) {
      const historyList = Array.isArray(currentIssue.statusHistory) ? [...currentIssue.statusHistory] : [];
      const historyEntry = {
        status: req.body.status || currentIssue.status,
        updatedBy: req.user ? String(req.user.id) : 'Admin',
        updatedByName: req.user ? (req.user.name || req.user.username) : 'Administrator',
        remarks: req.body.adminRemarks || req.body.notes || `Status transitioned to ${req.body.status || currentIssue.status}`,
        timestamp: new Date(),
        photoURLs: req.body.afterPhoto ? [req.body.afterPhoto] : [],
      };
      historyList.push(historyEntry);
      updateData.statusHistory = historyList;

      await ComplaintStatusHistory.create({
        complaintId: currentIssue.id,
        status: historyEntry.status,
        updatedBy: historyEntry.updatedBy,
        updatedByName: historyEntry.updatedByName,
        remarks: historyEntry.remarks,
        photoURLs: historyEntry.photoURLs,
        timestamp: historyEntry.timestamp,
      });
    }

    await currentIssue.update(updateData);

    if (statusChanged) {
      await IssueActivity.create({
        issueId: currentIssue.id,
        performedBy: req.user ? req.user.id : null,
        action: req.body.status === 'Resolved' ? 'Resolved' : 'Status Changed',
        previousStatus: oldStatus,
        newStatus: req.body.status,
        notes: req.body.adminRemarks || req.body.resolutionNotes || req.body.notes || `Status transitioned from ${oldStatus} to ${req.body.status}`,
      });
    }

    if (req.body.assignedOfficerId && String(req.body.assignedOfficerId) !== oldOfficer) {
      await IssueActivity.create({
        issueId: currentIssue.id,
        performedBy: req.user ? req.user.id : null,
        action: 'Officer Assigned',
        notes: `Assigned to department officer`,
      });
    }

    const updated = await Issue.findByPk(currentIssue.id, { include: issueIncludes });
    res.json({ success: true, data: formatIssue(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Add remark or activity to issue
// @route   POST /api/issues/:id/activity
// @access  Private
export const addIssueActivity = async (req, res) => {
  try {
    const { action = 'Remark Added', notes, newStatus } = req.body;
    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId);
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { _id: rawId } });
    }

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Strict Data Filtering: Ward Secretary can only view complaints assigned to them or their assigned Paguthi + Ward
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isDirectAssigned = (issue.assignedWardSecretaryId === req.user.id) || (String(issue.assignedWardSecretaryId) === String(req.user._id));
      const isSameWardAndPaguthi = Boolean(
        (req.user.wardId && issue.wardId === req.user.wardId) ||
        (req.user.paguthi && issue.paguthi === req.user.paguthi && (
          issue.wardNumber === userWardNum
        ))
      );
      if (!isDirectAssigned && !isSameWardAndPaguthi) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view complaints in your assigned municipal ward and paguthi.',
        });
      }
    }

    // Strict Data Filtering: Paguthi Seyalaalar can only view complaints in their assigned Paguthi / Ondriyam / Nagaram
    if (req.user?.role === 'paguthi_seyalaalar') {
      const userPaguthi = req.user.paguthi || '';
      const allowed = userPaguthi === 'Podanur' ? 'Pothanur' : userPaguthi;
      const issuePaguthi = issue.paguthi === 'Podanur' ? 'Pothanur' : (issue.paguthi || issue.ward?.paguthi || '');
      if (allowed && issuePaguthi && allowed.toLowerCase() !== issuePaguthi.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only view complaints in your assigned jurisdiction (${allowed}).`,
        });
      }
    }

    // Strict Data Filtering: Citizen / User can ONLY view and download their own complaints
    if (['citizen', 'user'].includes(req.user?.role)) {
      const isOwnerById = issue.userId && (Number(issue.userId) === Number(req.user.id) || String(issue.userId) === String(req.user._id));
      const isOwnerByPhone = req.user.phone && issue.citizenMobile && (String(issue.citizenMobile).trim() === String(req.user.phone).trim());
      if (!isOwnerById && !isOwnerByPhone) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view and download your own complaints.',
        });
      }
    }

    const activity = await IssueActivity.create({
      issueId: issue.id,
      performedBy: req.user ? req.user.id : null,
      action,
      previousStatus: issue.status,
      newStatus: newStatus || issue.status,
      notes,
    });

    if (newStatus && newStatus !== issue.status) {
      issue.status = newStatus;
      if (newStatus === 'Resolved') {
        issue.resolutionDetails = {
          resolvedDate: new Date(),
          resolutionNotes: notes,
          resolvedBy: req.user ? req.user.name : 'District Officer',
        };
      }
      await issue.save();
    }

    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private
export const deleteIssue = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId);
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { _id: rawId } });
    }

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Strict Data Filtering: Ward Secretary can only view complaints assigned to them or their assigned Paguthi + Ward
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isDirectAssigned = (issue.assignedWardSecretaryId === req.user.id) || (String(issue.assignedWardSecretaryId) === String(req.user._id));
      const isSameWardAndPaguthi = Boolean(
        (req.user.wardId && issue.wardId === req.user.wardId) ||
        (req.user.paguthi && issue.paguthi === req.user.paguthi && (
          issue.wardNumber === userWardNum
        ))
      );
      if (!isDirectAssigned && !isSameWardAndPaguthi) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view complaints in your assigned municipal ward and paguthi.',
        });
      }
    }

    // Strict Data Filtering: Paguthi Seyalaalar can only view complaints in their assigned Paguthi / Ondriyam / Nagaram
    if (req.user?.role === 'paguthi_seyalaalar') {
      const userPaguthi = req.user.paguthi || '';
      const allowed = userPaguthi === 'Podanur' ? 'Pothanur' : userPaguthi;
      const issuePaguthi = issue.paguthi === 'Podanur' ? 'Pothanur' : (issue.paguthi || issue.ward?.paguthi || '');
      if (allowed && issuePaguthi && allowed.toLowerCase() !== issuePaguthi.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only view complaints in your assigned jurisdiction (${allowed}).`,
        });
      }
    }

    // Strict Data Filtering: Citizen / User can ONLY view and download their own complaints
    if (['citizen', 'user'].includes(req.user?.role)) {
      const isOwnerById = issue.userId && (Number(issue.userId) === Number(req.user.id) || String(issue.userId) === String(req.user._id));
      const isOwnerByPhone = req.user.phone && issue.citizenMobile && (String(issue.citizenMobile).trim() === String(req.user.phone).trim());
      if (!isOwnerById && !isOwnerByPhone) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view and download your own complaints.',
        });
      }
    }

    const issueId = issue.id;
    await ComplaintBeforeImage.destroy({ where: { complaintId: issueId } });
    await ComplaintAfterImage.destroy({ where: { complaintId: issueId } });
    await ComplaintAction.destroy({ where: { complaintId: issueId } });
    await ComplaintStatusHistory.destroy({ where: { complaintId: issueId } });
    await ComplaintAttachment.destroy({ where: { complaintId: issueId } });
    await IssueActivity.destroy({ where: { issueId } });
    await issue.destroy();

    res.json({ success: true, message: 'Issue and associated activities deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Ward Secretary Start Work on Issue
// @route   PUT /api/issues/:id/start-work
// @access  Private
export const startWork = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId);
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { _id: rawId } });
    }

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    // Strict Data Filtering: Ward Secretary can only start work on complaints assigned to them or their assigned Paguthi + Ward
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const isDirectAssigned = (issue.assignedWardSecretaryId === req.user.id) || (String(issue.assignedWardSecretaryId) === String(req.user._id));
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isSameWardAndPaguthi = Boolean(
        (req.user.wardId && issue.wardId === req.user.wardId) ||
        (req.user.paguthi && issue.paguthi === req.user.paguthi && issue.wardNumber === userWardNum)
      );
      if (!isDirectAssigned && !isSameWardAndPaguthi) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only start work on complaints in your assigned municipal ward and paguthi.',
        });
      }
    }

    const prevStatus = issue.status;
    issue.status = 'In Progress';
    if (!issue.workStartedAt) {
      issue.workStartedAt = new Date();
    }
    if (!issue.assignedWardSecretaryId && req.user && (req.user.role === 'ward_secretary' || req.user.role === 'ward')) {
      issue.assignedWardSecretaryId = req.user.id;
    }

    const historyList = Array.isArray(issue.statusHistory) ? [...issue.statusHistory] : [];
    historyList.push({
      status: 'In Progress',
      updatedBy: req.user ? String(req.user.id) : 'Ward Secretary',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Ward Secretary',
      remarks: 'Field work started by Ward Secretary',
      timestamp: new Date(),
    });
    issue.statusHistory = historyList;

    await issue.save();

    await ComplaintStatusHistory.create({
      complaintId: issue.id,
      status: 'In Progress',
      updatedBy: req.user ? String(req.user.id) : 'Ward Secretary',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Ward Secretary',
      remarks: 'Field work started by Ward Secretary',
      timestamp: new Date(),
    });

    await IssueActivity.create({
      issueId: issue.id,
      performedBy: req.user ? req.user.id : null,
      action: 'Work Started',
      previousStatus: prevStatus,
      newStatus: 'In Progress',
      notes: `Field work started by ${req.user ? (req.user.name || req.user.username) : 'Ward Secretary'} at ${new Date().toLocaleTimeString()}`,
    });

    try {
      if (issue.userId) {
        await Notification.create({
          recipientId: issue.userId,
          recipientRole: 'citizen',
          title: 'Work Started on Your Complaint',
          message: `Field work has started on your complaint ${issue.issueCode} (${issue.title}). Status: In Progress.`,
          type: 'complaint_in_progress',
          referenceId: issue.issueCode,
          status: 'In Progress',
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify citizen:', notifErr.message);
    }

    const populated = await Issue.findByPk(issue.id, { include: issueIncludes });
    res.json({ success: true, message: 'Work marked as started', data: formatIssue(populated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin Assign Issue to Ward Secretary
// @route   PUT /api/issues/:id/assign
// @access  Private (Admin / Subadmin)
export const assignIssue = async (req, res) => {
  try {
    let rawSecId = req.body.assignedWardSecretaryId || req.body.wardSecretaryId || req.body.secretaryId;
    if (typeof rawSecId === 'object' && rawSecId !== null) {
      rawSecId = rawSecId.id || rawSecId._id || rawSecId.userId;
    }
    const remarks = (req.body.remarks || req.body.notes || req.body.adminRemarks || '').trim();
    if (!rawSecId) {
      return res.status(400).json({ success: false, message: 'Please select a Ward Secretary to assign' });
    }

    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId);
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { _id: rawId } });
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { issueCode: rawId } });
    }

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const secNum = Number(rawSecId);
    let secretary = null;
    if (!isNaN(secNum) && secNum > 0) {
      secretary = await User.findByPk(secNum);
    }
    if (!secretary) {
      secretary = await User.findOne({ where: { _id: String(rawSecId) } });
    }
    if (!secretary) {
      secretary = await User.findOne({ where: { username: String(rawSecId) } });
    }

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'Selected Ward Secretary user not found' });
    }

    issue.assignedWardSecretaryId = secretary.id;
    issue.status = 'Assigned';
    if (remarks) {
      issue.adminRemarks = remarks;
    }

    const assignmentRemark = remarks || `Forwarded to Ward Secretary ${secretary.name || secretary.username} (${secretary.assignedWard || 'Ward'})`;

    const historyList = Array.isArray(issue.statusHistory) ? [...issue.statusHistory] : [];
    historyList.push({
      status: 'Assigned',
      updatedBy: req.user ? String(req.user.id) : 'Admin',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Administrator',
      remarks: assignmentRemark,
      timestamp: new Date(),
    });
    issue.statusHistory = historyList;

    await issue.save();

    await ComplaintStatusHistory.create({
      complaintId: issue.id,
      status: 'Assigned',
      updatedBy: req.user ? String(req.user.id) : 'Admin',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Administrator',
      remarks: assignmentRemark,
      timestamp: new Date(),
    });

    await IssueActivity.create({
      issueId: issue.id,
      performedBy: req.user ? req.user.id : null,
      action: 'Forwarded to Ward Secretary',
      previousStatus: 'New',
      newStatus: 'Assigned',
      notes: assignmentRemark,
    });

    try {
      await Notification.create({
        recipientId: secretary.id,
        recipientRole: 'ward_secretary',
        title: 'New Complaint Forwarded',
        message: `Complaint ${issue.issueCode} (${issue.title}) has been forwarded to you for field action.`,
        type: 'complaint_assigned',
        referenceId: issue.issueCode,
        status: 'Assigned',
      });
    } catch (notifErr) {
      console.warn('Failed to send notification to Ward Secretary:', notifErr.message);
    }

    const populated = await Issue.findByPk(issue.id, { include: issueIncludes });
    res.json({
      success: true,
      message: `Complaint ${issue.issueCode} successfully forwarded to ${secretary.name || secretary.username}!`,
      data: formatIssue(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Ward Secretary Complete Work & Submit Final Report
// @route   PUT /api/issues/:id/complete-work
// @access  Private (Ward Secretary / Admin)
export const completeWork = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      beforeImage,
      afterImage,
      beforePhoto,
      afterPhoto,
      actionTaken,
      finalReport,
      wardSecretaryRemarks,
    } = req.body;

    const rawId = req.params.id;
    const numId = Number(rawId);
    let issue = null;
    if (!isNaN(numId) && numId > 0) {
      issue = await Issue.findByPk(numId, { transaction });
    }
    if (!issue) {
      issue = await Issue.findOne({ where: { _id: rawId }, transaction });
    }

    if (!issue) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Strict Data Filtering: Ward Secretary can only complete work for their assigned ward and paguthi
    if (['ward_secretary', 'ward', 'ward_officer'].includes(req.user?.role)) {
      const wardNumberMatch = String(req.user.assignedWard || '').match(/\d+/);
      const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;
      const isAssigned = (issue.assignedWardSecretaryId === req.user.id) || (String(issue.assignedWardSecretaryId) === String(req.user._id));
      const isSameWardAndPaguthi = Boolean(
        (req.user.wardId && issue.wardId === req.user.wardId) ||
        (req.user.paguthi && issue.paguthi === req.user.paguthi && issue.wardNumber === userWardNum)
      );
      if (!isAssigned && !isSameWardAndPaguthi) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only complete actions for complaints in your assigned municipal ward and paguthi.',
        });
      }
    }

    if (issue.status === 'Completed' || issue.status === 'Resolved') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'This complaint has already been completed.' });
    }

    const bImg = (beforeImage || beforePhoto || issue.beforeImage || issue.beforePhoto || '').trim();
    const aImg = (afterImage || afterPhoto || '').trim();
    const action = (actionTaken || finalReport || '').trim();

    if (!bImg) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Before Image upload is mandatory' });
    }
    if (!aImg) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'After Image upload is mandatory' });
    }
    if (!action) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Action Taken / Work Completed description is mandatory' });
    }

    const completionTime = new Date();

    issue.status = 'Completed';
    issue.beforeImage = bImg;
    issue.beforePhoto = bImg;
    issue.afterImage = aImg;
    issue.afterPhoto = aImg;
    issue.actionTaken = action;
    issue.finalReport = action;
    issue.wardSecretaryRemarks = (wardSecretaryRemarks || '').trim();
    issue.completedAt = completionTime;
    issue.resolvedAt = completionTime;
    issue.completedBy = req.user ? req.user.id : (issue.assignedWardSecretaryId || null);
    if (!issue.assignedWardSecretaryId && req.user && req.user.role === 'ward_secretary') {
      issue.assignedWardSecretaryId = req.user.id;
    }

    issue.resolutionDetails = {
      resolvedDate: completionTime,
      resolutionNotes: action,
      resolvedBy: req.user ? (req.user.name || req.user.username) : 'Ward Secretary',
    };

    const historyList = Array.isArray(issue.statusHistory) ? [...issue.statusHistory] : [];
    historyList.push({
      status: 'Completed',
      updatedBy: req.user ? String(req.user.id) : 'Ward Secretary',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Ward Secretary',
      remarks: action,
      timestamp: completionTime,
      photoURLs: [bImg, aImg],
    });
    issue.statusHistory = historyList;

    await issue.save({ transaction });

    // 1. Relational Action Record
    const actionRecord = await ComplaintAction.create({
      complaintId: issue.id,
      wardSecretaryId: req.user ? req.user.id : issue.assignedWardSecretaryId,
      actionTaken: action,
      wardSecretaryRemarks: (wardSecretaryRemarks || '').trim(),
      beforeImage: bImg,
      afterImage: aImg,
      completedAt: completionTime,
    }, { transaction });

    // 2. Relational Before Image Record (if not already recorded)
    const existingBefore = await ComplaintBeforeImage.findOne({ where: { complaintId: issue.id }, transaction });
    if (!existingBefore && bImg) {
      await ComplaintBeforeImage.create({
        complaintId: issue.id,
        imageUrl: bImg,
        caption: 'Ground Verification Before Proof',
        uploadedAt: completionTime,
      }, { transaction });
    }

    // 3. Relational After Image Record
    await ComplaintAfterImage.create({
      complaintId: issue.id,
      actionId: actionRecord.id,
      imageUrl: aImg,
      caption: 'Ground Resolution Proof',
      uploadedAt: completionTime,
    }, { transaction });

    // 4. Relational Status History Record
    await ComplaintStatusHistory.create({
      complaintId: issue.id,
      status: 'Completed',
      updatedBy: req.user ? String(req.user.id) : 'Ward Secretary',
      updatedByName: req.user ? (req.user.name || req.user.username) : 'Ward Secretary',
      remarks: action,
      photoURLs: [bImg, aImg],
      timestamp: completionTime,
    }, { transaction });

    // 5. Relational Activity Record
    await IssueActivity.create({
      issueId: issue.id,
      performedBy: req.user ? req.user.id : null,
      action: 'Completed',
      previousStatus: issue.workStartedAt ? 'In Progress' : 'Assigned',
      newStatus: 'Completed',
      notes: `Action Taken: ${action}`,
    }, { transaction });

    await transaction.commit();

    // 6. Non-blocking Notification to Citizen
    try {
      let targetUserId = issue.userId;
      if (!targetUserId && issue.citizenMobile) {
        const citizenUser = await User.findOne({ where: { phone: issue.citizenMobile } });
        if (citizenUser) targetUserId = citizenUser.id;
      }

      await Notification.create({
        recipientId: targetUserId || null,
        recipientRole: 'citizen',
        title: 'Complaint Resolved',
        message: 'Your complaint was fixed successfully!',
        type: 'complaint_completed',
        referenceId: issue.issueCode || issue.complaintId,
        beforeImage: bImg,
        afterImage: aImg,
        actionTaken: action,
        completedDate: completionTime,
        status: 'Completed',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch user completion notification:', notifErr.message);
    }

    const populated = await Issue.findByPk(issue.id, { include: issueIncludes });

    res.json({
      success: true,
      message: 'Complaint marked as Completed and resolution record saved!',
      data: formatIssue(populated),
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get List of Ward Secretaries for Assignment
// @route   GET /api/issues/ward-secretaries
// @access  Private (Admin / Subadmin)
export const getWardSecretaries = async (req, res) => {
  try {
    const secretaries = await User.findAll({
      where: {
        role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
        isActive: true,
      },
      attributes: ['id', '_id', 'name', 'username', 'phone', 'email', 'assignedWard', 'constituency'],
      order: [['assignedWard', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: secretaries.map((s) => ({
        ...s.toJSON(),
        _id: s._id || String(s.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export issues to Excel
// @route   GET /api/issues/export
// @access  Private
export const exportIssuesExcel = async (req, res) => {
  try {
    const issues = await Issue.findAll({
      include: [
        { model: Constituency, as: 'constituency', attributes: ['name'] },
        { model: Ward, as: 'ward', attributes: ['wardNumber', 'wardName'] },
        { model: DepartmentOfficer, as: 'assignedOfficerDetails', attributes: ['officerName', 'department'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = issues.map((i) => ({
      'Issue Code': i.issueCode,
      'Title': i.title,
      'Category': i.category,
      'Priority': i.priority,
      'Status': i.status,
      'Citizen Name': i.citizenName,
      'Citizen Mobile': i.citizenMobile,
      'Constituency': i.constituency ? i.constituency.name : '-',
      'Ward': i.ward ? `Ward ${i.ward.wardNumber} - ${i.ward.wardName}` : '-',
      'Assigned Department': i.assignedDepartment || '-',
      'Assigned Officer': i.assignedOfficerDetails ? i.assignedOfficerDetails.officerName : 'Unassigned',
      'Created Date': new Date(i.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grievances');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="TVK_Coimbatore_Grievances.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  addIssueActivity,
  deleteIssue,
  startWork,
  assignIssue,
  completeWork,
  getWardSecretaries,
  exportIssuesExcel,
};
