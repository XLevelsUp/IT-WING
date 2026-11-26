import { Op } from 'sequelize';
import sequelize from '../config/mysql.js';
import Issue from '../models/Issue.js';
import Member from '../models/Member.js';
import Ward from '../models/Ward.js';
import Constituency from '../models/Constituency.js';
import IssueActivity from '../models/IssueActivity.js';
import Project from '../models/Project.js';
import DepartmentOfficer from '../models/DepartmentOfficer.js';
import User from '../models/User.js';

// @desc    Get Main Dashboard Analytics and KPIs
// @route   GET /api/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const totalIssues = await Issue.count();
    // Strictly count 'New' status to match Complaints Reported page exactly
    const newIssues = await Issue.count({ where: { status: 'New' } });
    const resolvedIssues = await Issue.count({ where: { status: { [Op.in]: ['Resolved', 'Closed', 'Completed'] } } });
    const pendingIssues = await Issue.count({ where: { status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } } });
    const inProgressIssues = await Issue.count({ where: { status: 'In Progress' } });
    const rejectedIssues = await Issue.count({ where: { status: 'Rejected' } });

    const totalMembers = await Member.count();
    // Active TVK Members: Count only members whose status is not Inactive or Deleted
    let activeMembers = totalMembers;
    if (Member.rawAttributes && Member.rawAttributes.status) {
      try {
        activeMembers = await Member.count({
          where: {
            [Op.or]: [
              { status: { [Op.notIn]: ['Inactive', 'inactive', 'Deleted', 'deleted'] } },
              { status: null },
            ],
          },
        });
      } catch (err) {
        activeMembers = totalMembers;
      }
    }
    const maleMembers = await Member.count({ where: { gender: 'Male' } });
    const femaleMembers = await Member.count({ where: { gender: 'Female' } });
    const officeBearers = await Member.count({ where: { isOfficeBearer: true } });

    // Distinct ward records to avoid duplicate ward counts
    const totalWards = await Ward.count({ distinct: true, col: 'wardNumber' });
    const totalConstituencies = await Constituency.count();
    const totalProjects = await Project.count();
    const totalOfficers = await DepartmentOfficer.count();

    // Calculate resolution rate
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    // Complaint Ageing Overview (Open/Unresolved complaints: strictly exclude Resolved, Closed, Completed)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const openStatusFilter = { [Op.notIn]: ['Resolved', 'Closed', 'Completed'] };

    // 0-7 Days: createdAt >= 7 days ago
    const count0To7 = await Issue.count({
      where: {
        status: openStatusFilter,
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
    });

    // 8-14 Days: createdAt >= 14 days ago AND createdAt < 7 days ago
    const count8To14 = await Issue.count({
      where: {
        status: openStatusFilter,
        createdAt: {
          [Op.gte]: fourteenDaysAgo,
          [Op.lt]: sevenDaysAgo,
        },
      },
    });

    // 15+ Days: createdAt < 14 days ago
    const count15Plus = await Issue.count({
      where: {
        status: openStatusFilter,
        createdAt: { [Op.lt]: fourteenDaysAgo },
      },
    });

    // Completed complaints: Completed, Resolved, Closed
    const countCompleted = await Issue.count({
      where: {
        status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] },
      },
    });

    const complaintAgeing = {
      count0To7,
      count8To14,
      count15Plus,
      countCompleted,
      totalOpen: count0To7 + count8To14 + count15Plus,
    };

    // Synchronize automatic complaint priorities in database according to ageing rules (Update 1 & 2):
    // 0–7 Days  -> Low
    // 8–14 Days -> Medium
    // 15+ Days  -> High
    await sequelize.query(`
      UPDATE issues 
      SET priority = CASE 
        WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 0 AND 7 THEN 'Low'
        WHEN DATEDIFF(CURDATE(), createdAt) BETWEEN 8 AND 14 THEN 'Medium'
        ELSE 'High'
      END
      WHERE status NOT IN ('Resolved', 'Closed', 'Completed');
    `).catch(() => {});

    // Category breakdown
    const categoryAgg = await Issue.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['category'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true,
    });

    // Priority breakdown
    const priorityAgg = await Issue.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['priority'],
      raw: true,
    });

    // Status breakdown
    const statusAgg = await Issue.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Recent 6 grievances
    const recentIssuesRaw = await Issue.findAll({
      include: [
        { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
        { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 6,
    });

    const recentIssues = recentIssuesRaw.map((issue) => ({
      ...issue.toObject(),
      wardId: issue.ward,
      constituencyId: issue.constituency,
    }));

    // Recent 6 activities
    const recentActivitiesRaw = await IssueActivity.findAll({
      include: [
        { model: User, as: 'performer', attributes: ['id', '_id', 'name', 'role'] },
        { model: Issue, as: 'issue', attributes: ['id', '_id', 'issueCode', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 6,
    });

    const recentActivities = recentActivitiesRaw.map((act) => ({
      ...act.toObject(),
      performedBy: act.performer,
      issueId: act.issue,
    }));

    // Ward-wise statistics top 8
    let wardStats = [];
    try {
      const wardAggRaw = await Issue.findAll({
        attributes: [
          'wardId',
          [sequelize.fn('COUNT', sequelize.col('Issue.id')), 'count'],
        ],
        include: [
          {
            model: Ward,
            as: 'ward',
            attributes: ['wardNumber', 'wardName', 'zone'],
          },
        ],
        group: ['wardId', 'ward.id', 'ward.wardNumber', 'ward.wardName', 'ward.zone'],
        order: [[sequelize.literal('count'), 'DESC']],
        limit: 8,
      });

      wardStats = wardAggRaw.map((item) => ({
        wardNumber: item.ward ? item.ward.wardNumber : 0,
        wardName: item.ward ? item.ward.wardName : 'Unknown',
        zone: item.ward ? item.ward.zone : '',
        count: parseInt(item.get('count'), 10) || 0,
      }));
    } catch (err) {
      console.warn('wardStats query note:', err.message);
    }

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    let monthlyTrends = [];
    try {
      const monthlyAgg = await Issue.findAll({
        attributes: [
          [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
          [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
        ],
        where: {
          createdAt: { [Op.gte]: sixMonthsAgo },
        },
        group: [
          sequelize.fn('YEAR', sequelize.col('createdAt')),
          sequelize.fn('MONTH', sequelize.col('createdAt')),
        ],
        order: [
          [sequelize.fn('YEAR', sequelize.col('createdAt')), 'ASC'],
          [sequelize.fn('MONTH', sequelize.col('createdAt')), 'ASC'],
        ],
        raw: true,
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyTrends = monthlyAgg.map((item) => ({
        month: `${monthNames[Number(item.month) - 1]} ${item.year}`,
        total: parseInt(item.total, 10) || 0,
        resolved: parseInt(item.resolved, 10) || 0,
      }));
    } catch (err) {
      console.warn('monthlyTrends query note:', err.message);
    }

    res.json({
      success: true,
      data: {
        kpis: {
          newIssues,
          totalIssues,
          resolvedIssues,
          pendingIssues,
          inProgressIssues,
          rejectedIssues,
          resolutionRate,
          totalMembers,
          activeMembers,
          maleMembers,
          femaleMembers,
          officeBearers,
          totalWards,
          totalConstituencies,
          totalProjects,
          totalOfficers,
        },
        categoryBreakdown: categoryAgg.map((c) => ({ name: c.category, count: parseInt(c.count, 10) })),
        complaintAgeing,
        priorityBreakdown: priorityAgg.reduce((acc, curr) => ({ ...acc, [curr.priority]: parseInt(curr.count, 10) }), {}),
        statusBreakdown: statusAgg.reduce((acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count, 10) }), {}),
        wardStats,
        monthlyTrends,
        recentIssues,
        recentActivities,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
