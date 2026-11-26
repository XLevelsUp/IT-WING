import { Op } from 'sequelize';
import Ward from '../models/Ward.js';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import Constituency from '../models/Constituency.js';
import {
  normalizePaguthiName,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getCanonicalTargetPaguthis,
} from '../utils/paguthiVillageData.js';

// @desc    Get Paguthi / Ondriyam / Nagaram Dashboard Data (Strictly Scoped to req.user.paguthi)
// @route   GET /api/paguthi-seyalaalar/dashboard
// @access  Private (paguthi_seyalaalar, superadmin, district_admin)
export const getPaguthiDashboard = async (req, res) => {
  try {
    const userRole = req.user?.role;
    let paguthi = req.user?.paguthi;

    // Admin override support if query param provided, otherwise default to Pothanur
    if (['superadmin', 'district_admin'].includes(userRole)) {
      paguthi = req.query.paguthi || paguthi || 'Pothanur';
    }

    if (!paguthi) {
      return res.status(400).json({
        success: false,
        message: 'No assigned Paguthi / Ondriyam / Nagaram found for this user account',
      });
    }

    const requestedVillage = req.query.village ? String(req.query.village).trim() : null;

    // Canonical handling across single/double 'k' variations and aliases
    const canonicalName = normalizePaguthiName(paguthi) || paguthi;
    const paguthiFilter = getCanonicalTargetPaguthis(canonicalName);

    // Server-side boundary check: if requestedVillage is provided, ensure it belongs to this paguthi!
    if (requestedVillage && !isVillageValidForPaguthi(canonicalName, requestedVillage)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Village '${requestedVillage}' is not part of your assigned jurisdiction (${canonicalName}).`,
      });
    }

    // 1. Fetch all wards for this Paguthi / Ondriyam / Nagaram dynamically from MySQL
    const allPaguthiWards = await Ward.findAll({
      where: {
        paguthi: { [Op.in]: paguthiFilter },
      },
      order: [['wardNumber', 'ASC']],
    });

    const allWardIds = allPaguthiWards.map((w) => w.id);
    const mappedVillages = getVillagesForPaguthi(canonicalName) || [];

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
                  { paguthi: { [Op.in]: paguthiFilter } },
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
                { paguthi: { [Op.in]: paguthiFilter } },
                { village: vName },
              ],
            },
            ...(vWardIds.length > 0 ? [{ wardId: { [Op.in]: vWardIds } }] : []),
            ...(vWardNumbers.length > 0 && paguthiFilter.length > 0
              ? [
                  {
                    [Op.and]: [
                      { paguthi: { [Op.in]: paguthiFilter } },
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
          paguthi: canonicalName,
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
    // If requestedVillage is specified, filter to that village's wards
    let displayWards = allPaguthiWards;
    if (requestedVillage) {
      displayWards = allPaguthiWards.filter((w) => isWardInVillage(w, requestedVillage));
    }

    const displayWardIds = displayWards.map((w) => w.id);
    const displayWardSecretaryIds = displayWards.map((w) => w.wardSecretaryId).filter(Boolean);

    // 2. Fetch all active registered ward secretaries for this Paguthi / Village
    const secConditions = [
      {
        [Op.and]: [
          { paguthi: { [Op.in]: paguthiFilter } },
          ...(requestedVillage ? [{ village: requestedVillage }] : []),
        ],
      },
    ];
    if (displayWardIds.length > 0) {
      secConditions.push({ wardId: { [Op.in]: displayWardIds } });
    }
    if (displayWardSecretaryIds.length > 0) {
      secConditions.push({ id: { [Op.in]: displayWardSecretaryIds } });
    }

    const registeredSecretaries = await User.findAll({
      where: {
        role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
        isActive: true,
        [Op.or]: secConditions,
      },
      order: [['id', 'DESC']],
      attributes: ['id', '_id', 'name', 'username', 'phone', 'email', 'assignedWard', 'paguthi', 'village', 'wardId'],
    });

    // 3. Paguthi/Village-level complaint counts
    let paguthiIssueWhere = {
      [Op.or]: [
        { paguthi: { [Op.in]: paguthiFilter } },
        ...(allWardIds.length > 0 ? [{ wardId: { [Op.in]: allWardIds } }] : []),
      ],
    };

    if (requestedVillage) {
      paguthiIssueWhere = {
        [Op.or]: [
          {
            [Op.and]: [
              { paguthi: { [Op.in]: paguthiFilter } },
              { village: requestedVillage },
            ],
          },
          ...(displayWardIds.length > 0 ? [{ wardId: { [Op.in]: displayWardIds } }] : []),
        ],
      };
    }

    const totalComplaints = await Issue.count({ where: paguthiIssueWhere });
    const pendingComplaints = await Issue.count({
      where: {
        ...paguthiIssueWhere,
        status: { [Op.in]: ['New', 'Pending', 'Assigned', 'Under Review'] },
      },
    });
    const inProgressComplaints = await Issue.count({
      where: {
        ...paguthiIssueWhere,
        status: 'In Progress',
      },
    });
    const resolvedComplaints = await Issue.count({
      where: {
        ...paguthiIssueWhere,
        status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
      },
    });

    // 4. Fetch all complaints for this Paguthi / Village with citizen & ward details
    const allComplaints = await Issue.findAll({
      where: paguthiIssueWhere,
      order: [['createdAt', 'DESC']],
    });

    // 5. Augment each ward with its live secretary and ward-level complaints
    const augmentedWards = displayWards.map((w) => {
      // Find matching secretary user
      const secUser = registeredSecretaries.find((s) => {
        if (s.wardId && s.wardId === w.id) return true;
        if (s.assignedWard) {
          const matchNum = String(s.assignedWard).match(/\d+/);
          if (matchNum && Number(matchNum[0]) === Number(w.wardNumber)) return true;
        }
        return false;
      });

      let secretaryName = 'Not Assigned';
      let contactNumber = '';

      if (secUser) {
        secretaryName = secUser.name.replace(/\s*\([^)]*Secretary[^)]*\)/i, '').trim();
        contactNumber = secUser.phone || '';
      }

      // Filter complaints strictly for this specific ward
      const wardComplaints = allComplaints.filter((c) => {
        if (c.wardId && c.wardId === w.id) return true;
        if (c.wardNumber && Number(c.wardNumber) === Number(w.wardNumber)) return true;
        return false;
      });

      const wTotal = wardComplaints.length;
      const wPending = wardComplaints.filter((c) =>
        ['New', 'Pending', 'Assigned', 'Under Review'].includes(c.status)
      ).length;
      const wInProgress = wardComplaints.filter((c) => c.status === 'In Progress').length;
      const wResolved = wardComplaints.filter((c) =>
        ['Completed', 'Resolved', 'Closed'].includes(c.status)
      ).length;

      return {
        id: w.id,
        _id: w._id,
        wardNumber: w.wardNumber,
        wardName: w.wardName,
        tamilName: w.tamilName || '',
        zone: w.zone || 'South Zone',
        village: w.village || '',
        areaCoverage: w.areaCoverage || '',
        population: w.population || 0,
        wardSecretary: secretaryName,
        contactNumber,
        assignedWard: secUser?.assignedWard || `Ward ${w.wardNumber}${w.wardName ? ` - ${w.wardName}` : ''}`,
        hasAssignedSecretary: secretaryName !== 'Not Assigned',
        secretaryUser: secUser ? { id: secUser.id, name: secUser.name, username: secUser.username, phone: secUser.phone } : null,
        stats: {
          totalComplaints: wTotal,
          pendingComplaints: wPending,
          inProgressComplaints: wInProgress,
          resolvedComplaints: wResolved,
        },
        complaints: wardComplaints.map((c) => ({
          id: c.id,
          _id: c._id,
          issueCode: c.issueCode || `GRI-${c.id}`,
          complaintId: c.complaintId || c.issueCode || `GRI-${c.id}`,
          title: c.title,
          description: c.description,
          category: c.category,
          priority: c.priority,
          status: c.status,
          createdAt: c.createdAt,
          wardNumber: c.wardNumber || w.wardNumber,
          wardName: w.wardName,
          paguthi: canonicalName,
          village: c.village || w.village || '',
          assignedWard: `Ward ${c.wardNumber || w.wardNumber}${w.wardName ? ` - ${w.wardName}` : ''}`,
          citizenName: c.citizenName || 'Citizen',
          citizenMobile: c.citizenMobile || '—',
          location: c.location || c.citizenAddress || '—',
          assignedWardSecretary: secretaryName,
          workStartedAt: c.workStartedAt,
          resolvedAt: c.resolvedAt,
        })),
      };
    });

    const displayTotalWards = displayWards.length;

    const jurisdictionLabel = mappedVillages.length > 0
      ? `${mappedVillages.length} Villages (${mappedVillages.slice(0, 3).join(', ')}${mappedVillages.length > 3 ? '...' : ''})`
      : displayWards.length > 0
      ? `Ward ${displayWards.map((w) => w.wardNumber).join(', ')}`
      : `${canonicalName} Jurisdiction`;

    res.json({
      success: true,
      data: {
        paguthi: canonicalName,
        jurisdiction: jurisdictionLabel,
        totalWardsCount: displayTotalWards,
        username: req.user?.username,
        hasVillages: mappedVillages.length > 0,
        villages: villageCards,
        selectedVillage: requestedVillage,
        stats: {
          totalWards: displayTotalWards,
          totalVillages: mappedVillages.length,
          totalWardSecretaries: registeredSecretaries.length,
          registeredSecretaries: registeredSecretaries.length,
          totalIssues: totalComplaints,
          totalComplaints,
          pendingIssues: pendingComplaints,
          pendingComplaints,
          inProgressIssues: inProgressComplaints,
          inProgressComplaints,
          resolvedIssues: resolvedComplaints,
          resolvedComplaints,
        },
        wards: augmentedWards,
        allComplaints: allComplaints.map((c) => ({
          id: c.id,
          _id: c._id,
          issueCode: c.issueCode || `GRI-${c.id}`,
          complaintId: c.complaintId || c.issueCode || `GRI-${c.id}`,
          title: c.title,
          description: c.description,
          category: c.category,
          priority: c.priority,
          status: c.status,
          createdAt: c.createdAt,
          wardNumber: c.wardNumber,
          paguthi: canonicalName,
          village: c.village || '',
          citizenName: c.citizenName || 'Citizen',
          citizenMobile: c.citizenMobile || '—',
          location: c.location || c.citizenAddress || '—',
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching Paguthi Seyalaalar dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Ward-specific Complaints for authenticated Paguthi Seyalaalar
// @route   GET /api/paguthi-seyalaalar/wards/:wardId/complaints
// @access  Private (paguthi_seyalaalar, superadmin, district_admin)
export const getPaguthiWardComplaints = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userPaguthi = req.user?.paguthi;
    const { wardId } = req.params;

    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    // Strict Paguthi boundary check
    if (userRole === 'paguthi_seyalaalar') {
      const allowed = normalizePaguthiName(userPaguthi) || userPaguthi;
      const wardPaguthi = normalizePaguthiName(ward.paguthi) || ward.paguthi;
      if (allowed && wardPaguthi && allowed.toLowerCase() !== wardPaguthi.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are only authorized to access records for ${allowed}.`,
        });
      }
    }

    const complaints = await Issue.findAll({
      where: {
        [Op.or]: [
          { wardId: ward.id },
          {
            [Op.and]: [
              { wardNumber: ward.wardNumber },
              { paguthi: ward.paguthi },
            ],
          },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        ward: {
          id: ward.id,
          wardNumber: ward.wardNumber,
          wardName: ward.wardName,
          paguthi: ward.paguthi,
        },
        complaints,
      },
    });
  } catch (error) {
    console.error('Error fetching ward complaints:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
