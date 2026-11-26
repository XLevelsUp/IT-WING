import { Op } from 'sequelize';
import {
  District,
  Constituency,
  Ward,
  Issue,
  Member,
  User,
} from '../models/index.js';
import {
  PAGUTHI_VILLAGES_MAP,
  getVillagesForPaguthi,
  normalizePaguthiName,
} from '../utils/paguthiVillageData.js';

export const KINATHUKADAVU_LOCAL_BODIES = [
  'Thondamuthur Therkku Ondriyam',
  'Thondamuthur Merkku Ondriyam',
  'Madukkarai Therkku Ondriyam',
  'Madukkarai Merkku Ondriyam',
  'Madukkarai Nagaram',
  'Vellalur Nagaram',
  'Kinathukadavu Ondriyam',
  'Malumachampatti',
];

export const MUNICIPAL_PAGUTHIS = [
  'Pothanur',
  'Kurichi',
  'Sundarapuram',
];

export const getCanonicalTargetPaguthis = (pName) => {
  const norm = normalizePaguthiName(pName);
  if (norm === 'Pothanur' || pName === 'Podanur') return ['Pothanur', 'Podanur'];
  if (norm === 'Kurichi') return ['Kurichi'];
  if (norm === 'Sundarapuram') return ['Sundarapuram'];
  if (norm === 'Malumachampatti') return ['Malumachampatti', 'Malumichampatti'];
  if (norm === 'Thondamuthur Therkku Ondriyam' || norm === 'Thondamuthur Therku Ondriyam') {
    return ['Thondamuthur Therkku Ondriyam', 'Thondamuthur Therku Ondriyam'];
  }
  if (norm === 'Thondamuthur Merkku Ondriyam' || norm === 'Thondamuthur Merku Ondriyam') {
    return ['Thondamuthur Merkku Ondriyam', 'Thondamuthur Merku Ondriyam'];
  }
  if (norm === 'Madukkarai Therkku Ondriyam' || norm === 'Madukarai Therku Ondriyam') {
    return ['Madukkarai Therkku Ondriyam', 'Madukarai Therku Ondriyam', 'Madukkarai Therku Ondriyam'];
  }
  if (norm === 'Madukkarai Merkku Ondriyam' || norm === 'Madukarai Merku Ondriyam') {
    return ['Madukkarai Merkku Ondriyam', 'Madukarai Merku Ondriyam', 'Madukkarai Merku Ondriyam'];
  }
  if (norm === 'Kinathukadavu Ondriyam') return ['Kinathukadavu Ondriyam'];
  if (norm === 'Madukkarai Nagaram') return ['Madukkarai Nagaram'];
  if (norm === 'Vellalur Nagaram') return ['Vellalur Nagaram'];
  return [pName];
};

// @desc    Get District Overview
// @route   GET /api/districts
// @access  Private
export const getDistrictOverview = async (req, res) => {
  try {
    let district = await District.findOne({ where: { code: 'CBE' } });
    if (!district) {
      district = await District.create({
        name: 'Coimbatore',
        tamilName: 'கோயம்புத்தூர்',
        code: 'CBE',
        headquarters: 'Coimbatore Corporation Office, Town Hall',
        totalConstituencies: 10,
        totalWards: 100,
      });
    }

    const constituencies = await Constituency.findAll({ order: [['name', 'ASC']] });
    const totalIssues = await Issue.count();
    const totalMembers = await Member.count();
    const totalWards = await Ward.count();

    res.json({
      success: true,
      data: {
        district,
        constituencies,
        stats: {
          totalConstituencies: constituencies.length,
          totalWards,
          totalIssues,
          totalMembers,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all constituencies
// @route   GET /api/constituencies
// @access  Private
export const getConstituencies = async (req, res) => {
  try {
    const constituencies = await Constituency.findAll({ order: [['name', 'ASC']] });
    // Augment with live ward, member, issue, and paguthi counts
    const augmented = await Promise.all(
      constituencies.map(async (c) => {
        const cId = c.id;
        const wardCount = await Ward.count({ where: { constituencyId: cId } });
        const issueCount = await Issue.count({ where: { constituencyId: cId } });
        const memberCount = await Member.count({ where: { constituencyId: cId } });

        // Count distinct paguthis or default for Kinathukadavu
        let paguthiList = c.paguthis || [];
        if (c.name && c.name.toLowerCase().includes('kinathu')) {
          paguthiList = KINATHUKADAVU_LOCAL_BODIES;
        } else if (c.paguthis && c.paguthis.length > 0) {
          paguthiList = typeof c.paguthis === 'string' ? JSON.parse(c.paguthis) : [...c.paguthis];
        }

        // Dynamically include any other paguthis with wards for non-fixed constituencies
        if (!c.name || !c.name.toLowerCase().includes('kinathu')) {
          const dbWardPaguthis = await Ward.findAll({
            where: { constituencyId: cId },
            attributes: ['paguthi'],
            group: ['paguthi'],
          });
          dbWardPaguthis.forEach((wp) => {
            if (wp.paguthi && !paguthiList.includes(wp.paguthi)) {
              paguthiList.push(wp.paguthi);
            }
          });
        }

        const paguthiCount = paguthiList.length || (c.name && c.name.toLowerCase().includes('kinathu') ? 12 : 0);

        return {
          ...c.toObject(),
          wardCount,
          issueCount,
          memberCount,
          totalPaguthi: paguthiCount,
          paguthis: paguthiList,
        };
      })
    );
    res.json({ success: true, data: augmented });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Constituency By ID (with Paguthi statistics)
// @route   GET /api/constituencies/:id
// @access  Private
export const getConstituencyById = async (req, res) => {
  try {
    const constituency = await Constituency.findById(req.params.id);
    if (!constituency) {
      return res.status(404).json({ success: false, message: 'Constituency not found' });
    }
    const wards = await Ward.findAll({
      where: { constituencyId: constituency.id },
      order: [['wardNumber', 'ASC']],
    });
    const issues = await Issue.findAll({
      where: { constituencyId: constituency.id },
      limit: 10,
    });
    const members = await Member.findAll({
      where: { constituencyId: constituency.id },
      limit: 10,
    });

    const isKinathukadavu = constituency.name && constituency.name.toLowerCase().includes('kinathu');
    let paguthiNames = [];
    if (isKinathukadavu) {
      paguthiNames = KINATHUKADAVU_LOCAL_BODIES;
    } else {
      if (constituency.paguthis && constituency.paguthis.length > 0) {
        paguthiNames = typeof constituency.paguthis === 'string'
          ? JSON.parse(constituency.paguthis)
          : [...constituency.paguthis];
      }
      const dbWardPaguthis = await Ward.findAll({
        where: { constituencyId: constituency.id },
        attributes: ['paguthi'],
        group: ['paguthi'],
      });
      dbWardPaguthis.forEach((wp) => {
        const p = (wp.paguthi === 'Podanur') ? 'Pothanur' : wp.paguthi;
        if (p && !paguthiNames.includes(p)) {
          paguthiNames.push(p);
        }
      });
    }

    // Normalize any 'Podanur' to 'Pothanur' and deduplicate
    paguthiNames = [...new Set(paguthiNames.map((p) => (p === 'Podanur' ? 'Pothanur' : p)))];

    // Calculate actual live statistics for each Paguthi from MySQL
    const paguthiCards = await Promise.all(
      paguthiNames.map(async (pName) => {
        const pFilter = getCanonicalTargetPaguthis(pName);
        const pWards = await Ward.findAll({
          where: {
            [Op.or]: [
              { constituencyId: constituency.id, paguthi: { [Op.in]: pFilter } },
              { paguthi: { [Op.in]: pFilter } },
            ],
          },
        });
        const pWardIds = pWards.map((w) => w.id);

        const totalWards = pWards.length;

        const registeredSecretaries = await User.count({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            [Op.or]: [
              { paguthi: { [Op.in]: pFilter } },
              ...(pWardIds.length > 0 ? [{ wardId: { [Op.in]: pWardIds } }] : []),
            ],
          },
        });
        const totalMembers = await Member.count({
          where: {
            [Op.or]: [
              ...(pWardIds.length > 0 ? [{ wardId: { [Op.in]: pWardIds } }] : []),
              { paguthi: { [Op.in]: pFilter } },
            ],
          },
        });
        const paguthiIssueWhere = {
          [Op.or]: [
            ...(pWardIds.length > 0 ? [{ wardId: { [Op.in]: pWardIds } }] : []),
            { paguthi: { [Op.in]: pFilter } },
          ],
        };
        const totalComplaints = await Issue.count({ where: paguthiIssueWhere });
        const newComplaints = await Issue.count({
          where: {
            ...paguthiIssueWhere,
            status: 'New',
          },
        });
        const pendingComplaints = await Issue.count({
          where: {
            ...paguthiIssueWhere,
            status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] },
          },
        });
        const inProgressComplaints = await Issue.count({
          where: {
            ...paguthiIssueWhere,
            status: 'In Progress',
          },
        });
        const completedComplaints = await Issue.count({
          where: {
            ...paguthiIssueWhere,
            status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
          },
        });
        const unassignedComplaints = await Issue.count({
          where: {
            ...paguthiIssueWhere,
            assignedWardSecretaryId: null,
          },
        });

        const mappedVillages = getVillagesForPaguthi(pName) || [];

        return {
          name: pName,
          totalWards,
          totalVillages: mappedVillages.length,
          villages: mappedVillages,
          registeredSecretaries,
          totalMembers,
          totalComplaints,
          newComplaints,
          pendingComplaints,
          inProgressComplaints,
          completedComplaints,
          resolvedComplaints: completedComplaints,
          unassignedComplaints,
        };
      })
    );

    res.json({
      success: true,
      data: {
        constituency: {
          ...constituency.toObject(),
          totalPaguthi: paguthiCards.length,
          paguthis: paguthiNames,
        },
        paguthis: paguthiCards,
        wards,
        issues,
        members,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Paguthi Details (Inside Paguthi with Village & Ward Administration)
// @route   GET /api/districts/constituencies/:id/paguthi/:paguthiName
// @access  Private
export const getPaguthiDetails = async (req, res) => {
  try {
    const { id, paguthiName } = req.params;
    const requestedVillage = req.query.village ? String(req.query.village).trim() : null;

    const constituency = await Constituency.findById(id);
    if (!constituency) {
      return res.status(404).json({ success: false, message: 'Constituency not found' });
    }

    const targetPaguthis = getCanonicalTargetPaguthis(paguthiName);
    const canonicalPaguthiName = targetPaguthis[0];

    // Strict Paguthi boundary enforcement for Paguthi Seyalaalar
    if (req.user && req.user.role === 'paguthi_seyalaalar') {
      const userPaguthi = req.user.paguthi || '';
      const allowed = (userPaguthi === 'Podanur') ? 'Pothanur' : userPaguthi;
      if (allowed && canonicalPaguthiName.toLowerCase() !== allowed.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are only authorized to access ${allowed} Paguthi.`,
        });
      }
    }

    // Find all wards for this paguthi dynamically from MySQL
    const allPaguthiWards = await Ward.findAll({
      where: {
        paguthi: { [Op.in]: targetPaguthis },
      },
      order: [['wardNumber', 'ASC']],
    });

    const mappedVillages = getVillagesForPaguthi(canonicalPaguthiName) || [];

    // Helper to test if a ward belongs to a village
    const isWardInVillage = (w, vName) => {
      if (w.village && w.village.toLowerCase() === vName.toLowerCase()) return true;
      if (!w.village && w.wardName && w.wardName.toLowerCase().includes(vName.toLowerCase())) return true;
      if (mappedVillages.length === 1 && mappedVillages[0].toLowerCase() === vName.toLowerCase()) return true;
      return false;
    };

    // Calculate Village cards with live DB data if paguthi has mapped villages
    const villageCards = await Promise.all(
      mappedVillages.map(async (vName) => {
        const vWards = allPaguthiWards.filter((w) => isWardInVillage(w, vName));
        const vWardIds = vWards.map((w) => w.id);
        const vWardNumbers = vWards.map((w) => String(w.wardNumber));

        // Active Ward Secretary for this village
        const vSecretaryUser = await User.findOne({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            [Op.or]: [
              {
                [Op.and]: [
                  { paguthi: { [Op.in]: targetPaguthis } },
                  { village: vName },
                ],
              },
              ...(vWardIds.length > 0 ? [{ wardId: { [Op.in]: vWardIds } }] : []),
            ],
          },
          order: [['id', 'DESC']],
          attributes: ['id', '_id', 'name', 'phone', 'assignedWard', 'village', 'paguthi'],
        });

        const vIssueWhere = {
          [Op.or]: [
            {
              [Op.and]: [
                { paguthi: { [Op.in]: targetPaguthis } },
                { village: vName },
              ],
            },
            ...(vWardIds.length > 0 ? [{ wardId: { [Op.in]: vWardIds } }] : []),
            ...(vWardNumbers.length > 0 && targetPaguthis.length > 0
              ? [
                  {
                    [Op.and]: [
                      { paguthi: { [Op.in]: targetPaguthis } },
                      { wardNumber: { [Op.in]: vWardNumbers } },
                      { [Op.or]: [{ village: vName }, { village: '' }, { village: null }] },
                    ],
                  },
                ]
              : []),
          ],
        };

        const vTotalComplaints = await Issue.count({ where: vIssueWhere });
        const vNewComplaints = await Issue.count({ where: { ...vIssueWhere, status: 'New' } });
        const vPendingComplaints = await Issue.count({
          where: { ...vIssueWhere, status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } },
        });
        const vInProgressComplaints = await Issue.count({
          where: { ...vIssueWhere, status: 'In Progress' },
        });
        const vCompletedComplaints = await Issue.count({
          where: { ...vIssueWhere, status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] } },
        });

        return {
          name: vName,
          paguthi: canonicalPaguthiName,
          totalWards: vWards.length,
          registeredSecretaries: vSecretaryUser ? 1 : 0,
          wardSecretary: vSecretaryUser ? vSecretaryUser.name.replace(/\s*\([^)]*Secretary[^)]*\)/i, '').trim() : 'Not Assigned',
          contactNumber: vSecretaryUser ? (vSecretaryUser.phone || null) : null,
          totalComplaints: vTotalComplaints,
          newComplaints: vNewComplaints,
          pendingComplaints: vPendingComplaints,
          inProgressComplaints: vInProgressComplaints,
          completedComplaints: vCompletedComplaints,
        };
      })
    );

    // Determine wards to display:
    // If requestedVillage is specified, filter to that village's wards!
    let displayWards = allPaguthiWards;
    if (requestedVillage) {
      displayWards = allPaguthiWards.filter((w) => isWardInVillage(w, requestedVillage));
    }

    // Augment display wards with live stats and active registered secretary
    const augmentedWards = await Promise.all(
      displayWards.map(async (w) => {
        const wardPaguthis = (w.paguthi === 'Pothanur' || w.paguthi === 'Podanur')
          ? ['Pothanur', 'Podanur']
          : (w.paguthi ? [w.paguthi] : targetPaguthis);

        const secretaryUser = await User.findOne({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            [Op.or]: [
              { wardId: w.id },
              ...(w.village
                ? [
                    {
                      [Op.and]: [
                        { paguthi: { [Op.in]: wardPaguthis } },
                        { village: w.village },
                        {
                          [Op.or]: [
                            { assignedWard: String(w.wardNumber) },
                            { assignedWard: `Ward ${w.wardNumber}` },
                            { assignedWard: `Ward ${w.wardNumber} - ${w.wardName}` },
                            { assignedWard: { [Op.like]: `Ward ${w.wardNumber} - %` } },
                            { assignedWard: { [Op.like]: `Ward ${w.wardNumber} %` } },
                            { assignedWard: { [Op.like]: `%Ward ${w.wardNumber}%` } },
                          ],
                        },
                      ],
                    },
                  ]
                : []),
              ...(wardPaguthis.length > 0
                ? [
                    {
                      [Op.and]: [
                        { paguthi: { [Op.in]: wardPaguthis } },
                        {
                          [Op.or]: [
                            { assignedWard: String(w.wardNumber) },
                            { assignedWard: `Ward ${w.wardNumber}` },
                            { assignedWard: `Ward ${w.wardNumber} - ${w.wardName}` },
                            { assignedWard: { [Op.like]: `Ward ${w.wardNumber} - %` } },
                            { assignedWard: { [Op.like]: `Ward ${w.wardNumber} %` } },
                            { assignedWard: { [Op.like]: `%Ward ${w.wardNumber}%` } },
                          ],
                        },
                      ],
                    },
                  ]
                : [
                    { assignedWard: String(w.wardNumber) },
                    { assignedWard: `Ward ${w.wardNumber}` },
                    { assignedWard: `Ward ${w.wardNumber} - ${w.wardName}` },
                    { assignedWard: { [Op.like]: `Ward ${w.wardNumber} - %` } },
                  ]),
            ],
          },
          order: [['id', 'DESC']],
          attributes: ['id', '_id', 'name', 'username', 'phone', 'email', 'isActive', 'paguthi', 'village', 'assignedWard'],
        });

        const cleanSecName = secretaryUser
          ? secretaryUser.name.replace(/\s*\([^)]*Secretary[^)]*\)/i, '').trim()
          : 'Not Assigned';
        const cleanPhone = secretaryUser ? (secretaryUser.phone || null) : null;

        const wardIssueWhere = {
          [Op.or]: [
            {
              [Op.and]: [
                { wardId: w.id },
                { paguthi: { [Op.in]: targetPaguthis } },
              ],
            },
            {
              [Op.and]: [
                { wardNumber: String(w.wardNumber) },
                { paguthi: { [Op.in]: targetPaguthis } },
              ],
            },
            { wardId: w.id },
          ],
        };

        const mCount = await Member.count({ where: { wardId: w.id } });
        const cCount = await Issue.count({ where: wardIssueWhere });
        const nCount = await Issue.count({
          where: {
            ...wardIssueWhere,
            status: 'New',
          },
        });
        const pCount = await Issue.count({
          where: {
            ...wardIssueWhere,
            status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] },
          },
        });
        const ipCount = await Issue.count({
          where: {
            ...wardIssueWhere,
            status: 'In Progress',
          },
        });
        const rCount = await Issue.count({
          where: {
            ...wardIssueWhere,
            status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
          },
        });

        return {
          ...w.toObject(),
          village: w.village || (requestedVillage || ''),
          wardSecretary: cleanSecName,
          contactNumber: cleanPhone,
          assignedWard: secretaryUser?.assignedWard || `Ward ${w.wardNumber}${w.wardName ? ` - ${w.wardName}` : ''}`,
          wardSecretaryRegistrationStatus: secretaryUser ? 'Registered' : 'Not Assigned',
          wardSecretaryUser: secretaryUser ? secretaryUser.toJSON() : null,
          totalMembers: mCount,
          totalComplaints: cCount,
          newComplaints: nCount,
          pendingComplaints: pCount,
          inProgressComplaints: ipCount,
          completedComplaints: rCount,
          resolvedComplaints: rCount,
        };
      })
    );

    // Filter complaints: if requestedVillage is given, filter to village complaints
    let paguthiIssueWhere = {
      [Op.or]: [
        ...(allPaguthiWards.map(w => w.id).length > 0 ? [{ wardId: { [Op.in]: allPaguthiWards.map(w => w.id) } }] : []),
        { paguthi: { [Op.in]: targetPaguthis } },
      ],
    };

    if (requestedVillage) {
      const vWardIds = displayWards.map(w => w.id);
      paguthiIssueWhere = {
        [Op.or]: [
          {
            [Op.and]: [
              { paguthi: { [Op.in]: targetPaguthis } },
              { village: requestedVillage },
            ],
          },
          ...(vWardIds.length > 0 ? [{ wardId: { [Op.in]: vWardIds } }] : []),
        ],
      };
    }

    let totalWards = augmentedWards.length;
    if (!requestedVillage) {
      if (canonicalPaguthiName === 'Pothanur') totalWards = 3;
      else if (canonicalPaguthiName === 'Kurichi') totalWards = 3;
      else if (canonicalPaguthiName === 'Sundarapuram') totalWards = 2;
    }

    const totalComplaints = await Issue.count({ where: paguthiIssueWhere });
    const newComplaints = await Issue.count({ where: { ...paguthiIssueWhere, status: 'New' } });
    const pendingComplaints = await Issue.count({
      where: { ...paguthiIssueWhere, status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } },
    });
    const inProgressComplaints = await Issue.count({
      where: { ...paguthiIssueWhere, status: 'In Progress' },
    });
    const completedComplaints = await Issue.count({
      where: { ...paguthiIssueWhere, status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] } },
    });
    const registeredSecretaries = augmentedWards.filter(w => w.wardSecretaryRegistrationStatus === 'Registered').length;

    // Fetch complaints specifically belonging to this Paguthi / Village
    const paguthiIssues = await Issue.findAll({
      where: paguthiIssueWhere,
      include: [
        { model: User, as: 'assignedWardSecretary', attributes: ['id', '_id', 'name', 'username', 'phone'] },
        { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName', 'paguthi', 'village'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json({
      success: true,
      data: {
        constituency,
        paguthi: canonicalPaguthiName,
        hasVillages: mappedVillages.length > 0,
        villages: villageCards,
        selectedVillage: requestedVillage,
        stats: {
          totalWards,
          totalVillages: mappedVillages.length,
          registeredSecretaries,
          totalComplaints,
          newComplaints,
          pendingComplaints,
          inProgressComplaints,
          completedComplaints,
          resolvedComplaints: completedComplaints,
        },
        wards: augmentedWards,
        issues: paguthiIssues,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all wards
// @route   GET /api/wards
// @access  Private
export const getWards = async (req, res) => {
  try {
    const { constituencyId, zone, paguthi, search } = req.query;
    let where = {};

    if (constituencyId) {
      const cNum = Number(constituencyId);
      if (!isNaN(cNum) && cNum > 0) {
        where.constituencyId = cNum;
      } else {
        const c = await Constituency.findOne({ where: { _id: String(constituencyId) } });
        if (c) where.constituencyId = c.id;
      }
    }
    if (zone) where.zone = zone;
    if (paguthi) where.paguthi = paguthi;
    if (search) {
      where[Op.or] = [
        { wardName: { [Op.like]: `%${search}%` } },
        { areaCoverage: { [Op.like]: `%${search}%` } },
        { officeBearer: { [Op.like]: `%${search}%` } },
      ];
    }

    const wards = await Ward.findAll({
      where,
      include: [{ model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code'] }],
      order: [['wardNumber', 'ASC']],
    });

    const augmented = await Promise.all(
      wards.map(async (w) => {
        const secretaryUser = await User.findOne({
          where: {
            role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
            isActive: true,
            [Op.or]: [
              { wardId: w.id },
              ...(w.paguthi
                ? [
                    {
                      [Op.and]: [
                        { assignedWard: String(w.wardNumber) },
                        { paguthi: w.paguthi },
                      ],
                    },
                  ]
                : []),
            ],
          },
          attributes: ['id', 'name', 'username', 'phone'],
        });

        const issueCount = await Issue.count({
          where: {
            [Op.or]: [
              { wardId: w.id },
              ...(w.paguthi
                ? [
                    {
                      [Op.and]: [
                        { wardNumber: String(w.wardNumber) },
                        { paguthi: w.paguthi },
                      ],
                    },
                  ]
                : []),
            ],
          },
        });
        const memberCount = await Member.count({ where: { wardId: w.id } });
        const resolvedCount = await Issue.count({
          where: {
            status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
            [Op.or]: [
              { wardId: w.id },
              ...(w.paguthi
                ? [
                    {
                      [Op.and]: [
                        { wardNumber: String(w.wardNumber) },
                        { paguthi: w.paguthi },
                      ],
                    },
                  ]
                : []),
            ],
          },
        });
        return {
          ...w.toObject(),
          wardSecretary: secretaryUser ? secretaryUser.name : (w.wardSecretary || w.officeBearer || 'Unassigned'),
          wardSecretaryUser: secretaryUser ? secretaryUser.toJSON() : null,
          constituencyId: w.constituency,
          issueCount,
          memberCount,
          resolvedCount,
        };
      })
    );

    res.json({ success: true, data: augmented });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Ward Details & Deep-dive Dashboard
// @route   GET /api/wards/:id
// @access  Private
export const getWardById = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);
    if (!ward) {
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    // Strict Paguthi boundary enforcement for Paguthi Seyalaalar
    if (req.user && req.user.role === 'paguthi_seyalaalar') {
      const userPaguthi = req.user.paguthi || '';
      const allowed = (userPaguthi === 'Podanur') ? 'Pothanur' : userPaguthi;
      const wardPaguthi = (ward.paguthi === 'Podanur') ? 'Pothanur' : (ward.paguthi || '');
      if (allowed && wardPaguthi && allowed.toLowerCase() !== wardPaguthi.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This ward belongs to ${ward.paguthi}, but your account is assigned to ${allowed}.`,
        });
      }
    }

    const constituency = await Constituency.findByPk(ward.constituencyId);

    const canonicalPaguthi = (ward.paguthi === 'Podanur') ? 'Pothanur' : (ward.paguthi || '');
    const paguthiFilter = (canonicalPaguthi === 'Pothanur') ? ['Pothanur', 'Podanur'] : (canonicalPaguthi ? [canonicalPaguthi] : []);

    // Query active secretary for this ward strictly from users table (source of truth: Ward Secretary Registration)
    const secretaryUser = await User.findOne({
      where: {
        role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
        isActive: true,
        [Op.or]: [
          { wardId: ward.id },
          ...(paguthiFilter.length > 0
            ? [
                {
                  [Op.and]: [
                    { paguthi: { [Op.in]: paguthiFilter } },
                    {
                      [Op.or]: [
                        { assignedWard: String(ward.wardNumber) },
                        { assignedWard: `Ward ${ward.wardNumber}` },
                        { assignedWard: `Ward ${ward.wardNumber} - ${ward.wardName}` },
                        { assignedWard: { [Op.like]: `Ward ${ward.wardNumber} - %` } },
                        { assignedWard: { [Op.like]: `Ward ${ward.wardNumber} %` } },
                        { assignedWard: { [Op.like]: `%Ward ${ward.wardNumber}%` } },
                      ],
                    },
                  ],
                },
              ]
            : [
                { assignedWard: String(ward.wardNumber) },
                { assignedWard: `Ward ${ward.wardNumber}` },
                { assignedWard: `Ward ${ward.wardNumber} - ${ward.wardName}` },
                { assignedWard: { [Op.like]: `Ward ${ward.wardNumber} - %` } },
              ]),
        ],
      },
      order: [['id', 'DESC']],
      attributes: ['id', '_id', 'name', 'username', 'phone', 'email', 'isActive', 'paguthi', 'assignedWard'],
    });

    const cleanSecName = secretaryUser
      ? secretaryUser.name.replace(/\s*\([^)]*Secretary[^)]*\)/i, '').trim()
      : 'Not Assigned';
    const cleanPhone = secretaryUser ? (secretaryUser.phone || null) : null;

    const totalMembers = await Member.count({ where: { wardId: ward.id } });
    const maleMembers = await Member.count({ where: { wardId: ward.id, gender: 'Male' } });
    const femaleMembers = await Member.count({ where: { wardId: ward.id, gender: 'Female' } });
    const officeBearers = await Member.count({ where: { wardId: ward.id, isOfficeBearer: true } });

    const wardIssueWhere = {
      [Op.or]: [
        { wardId: ward.id },
        ...(paguthiFilter.length > 0
          ? [
              {
                [Op.and]: [
                  { wardNumber: String(ward.wardNumber) },
                  { paguthi: { [Op.in]: paguthiFilter } },
                ],
              },
            ]
          : [{ wardNumber: String(ward.wardNumber) }]),
      ],
    };

    const totalIssues = await Issue.count({ where: wardIssueWhere });
    const closedIssues = await Issue.count({
      where: {
        ...wardIssueWhere,
        status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
      },
    });
    const inProgressIssues = await Issue.count({
      where: { ...wardIssueWhere, status: { [Op.in]: ['In Progress', 'Under Review'] } },
    });
    const pendingIssues = await Issue.count({
      where: { ...wardIssueWhere, status: { [Op.in]: ['New', 'Pending', 'Assigned'] } },
    });

    const members = await Member.findAll({ where: { wardId: ward.id }, limit: 20 });
    const issues = await Issue.findAll({
      where: wardIssueWhere,
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    res.json({
      success: true,
      data: {
        ward: {
          ...ward.toObject(),
          wardSecretary: cleanSecName,
          contactNumber: cleanPhone,
          assignedWard: secretaryUser?.assignedWard || `Ward ${ward.wardNumber}${ward.wardName ? ` - ${ward.wardName}` : ''}`,
          wardSecretaryRegistrationStatus: secretaryUser ? 'Registered' : 'Not Assigned',
          wardSecretaryUser: secretaryUser ? secretaryUser.toJSON() : null,
          constituencyId: constituency,
        },
        membersKpi: {
          totalMembers,
          maleMembers,
          femaleMembers,
          officeBearers,
        },
        issuesKpi: {
          totalIssues,
          closedIssues,
          inProgressIssues,
          pendingIssues,
        },
        members,
        issues: issues.map((iss) => {
          const item = iss.toJSON ? iss.toJSON() : iss;
          return {
            ...item,
            assignedWardSecretary: secretaryUser ? { name: cleanSecName, phone: cleanPhone } : null,
            ward: ward.toObject(),
          };
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Ward
// @route   POST /api/wards
// @access  Private/Admin
export const createWard = async (req, res) => {
  try {
    const ward = await Ward.create(req.body);
    res.status(201).json({ success: true, data: ward });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Ward
// @route   PUT /api/wards/:id
// @access  Private/Admin
export const updateWard = async (req, res) => {
  try {
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, data: ward });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Ward
// @route   DELETE /api/wards/:id
// @access  Private/Admin
export const deleteWard = async (req, res) => {
  try {
    const ward = await Ward.findByIdAndDelete(req.params.id);
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, message: 'Ward deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
