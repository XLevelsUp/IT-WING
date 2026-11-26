import { Op } from 'sequelize';
import sequelize from '../config/mysql.js';
import Issue from '../models/Issue.js';
import Ward from '../models/Ward.js';
import Constituency from '../models/Constituency.js';

// @desc    Get Executive Analytics Data with Date Filters
// @route   GET /api/analytics
// @access  Private
export const getExecutiveAnalytics = async (req, res) => {
  try {
    const { period = 'this_month', startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      dateFilter = { createdAt: { [Op.gte]: start } };
    } else if (period === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { [Op.gte]: start } };
    } else if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { [Op.gte]: start } };
    } else if (period === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { [Op.gte]: start } };
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate),
        },
      };
    }

    // Totals in period
    const totalGrievances = await Issue.count({ where: dateFilter });
    const resolvedGrievances = await Issue.count({ where: { ...dateFilter, status: 'Resolved' } });
    const pendingGrievances = await Issue.count({ where: { ...dateFilter, status: 'Pending' } });
    const inProgressGrievances = await Issue.count({
      where: {
        ...dateFilter,
        status: { [Op.in]: ['In Progress', 'Under Review'] },
      },
    });
    const rejectedGrievances = await Issue.count({ where: { ...dateFilter, status: 'Rejected' } });

    // Category-wise performance
    let categoryStats = [];
    try {
      const catRows = await Issue.findAll({
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END)`), 'pending'],
        ],
        where: dateFilter,
        group: ['category'],
        order: [[sequelize.literal('total'), 'DESC']],
        raw: true,
      });

      categoryStats = catRows.map((c) => {
        const total = parseInt(c.total, 10) || 0;
        const resolved = parseInt(c.resolved, 10) || 0;
        const pending = parseInt(c.pending, 10) || 0;
        return {
          name: c.category || 'General',
          total,
          resolved,
          pending,
          rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        };
      });
    } catch (err) {
      console.warn('categoryStats query note:', err.message);
    }

    // Department-wise distribution
    let departmentStats = [];
    try {
      const deptRows = await Issue.findAll({
        attributes: [
          'assignedDepartment',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
        ],
        where: dateFilter,
        group: ['assignedDepartment'],
        order: [[sequelize.literal('total'), 'DESC']],
        raw: true,
      });

      departmentStats = deptRows.map((d) => ({
        name: d.assignedDepartment || 'Unassigned',
        total: parseInt(d.total, 10) || 0,
        resolved: parseInt(d.resolved, 10) || 0,
      }));
    } catch (err) {
      console.warn('departmentStats query note:', err.message);
    }

    // Constituency performance
    let constituencyStats = [];
    try {
      const constRows = await Issue.findAll({
        attributes: [
          'constituencyId',
          [sequelize.fn('COUNT', sequelize.col('Issue.id')), 'totalIssues'],
          [sequelize.literal(`SUM(CASE WHEN Issue.status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
          [sequelize.literal(`SUM(CASE WHEN Issue.status = 'Pending' THEN 1 ELSE 0 END)`), 'pending'],
        ],
        include: [
          {
            model: Constituency,
            as: 'constituency',
            attributes: ['id', 'name', 'code'],
          },
        ],
        where: dateFilter,
        group: ['constituencyId', 'constituency.id', 'constituency.name', 'constituency.code'],
        order: [[sequelize.literal('totalIssues'), 'DESC']],
      });

      constituencyStats = constRows.map((c) => ({
        name: c.constituency ? c.constituency.name : 'Unknown',
        code: c.constituency ? c.constituency.code : '',
        totalIssues: parseInt(c.get('totalIssues'), 10) || 0,
        resolved: parseInt(c.get('resolved'), 10) || 0,
        pending: parseInt(c.get('pending'), 10) || 0,
      }));
    } catch (err) {
      console.warn('constituencyStats query note:', err.message);
    }

    // Ward performance (Top 10 active)
    let wardStats = [];
    try {
      const wardRows = await Issue.findAll({
        attributes: [
          'wardId',
          [sequelize.fn('COUNT', sequelize.col('Issue.id')), 'totalIssues'],
          [sequelize.literal(`SUM(CASE WHEN Issue.status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
          [sequelize.literal(`SUM(CASE WHEN Issue.status = 'Pending' THEN 1 ELSE 0 END)`), 'pending'],
        ],
        include: [
          {
            model: Ward,
            as: 'ward',
            attributes: ['id', 'wardNumber', 'wardName'],
          },
        ],
        where: dateFilter,
        group: ['wardId', 'ward.id', 'ward.wardNumber', 'ward.wardName'],
        order: [[sequelize.literal('totalIssues'), 'DESC']],
        limit: 10,
      });

      wardStats = wardRows.map((w) => {
        const wNum = w.ward ? w.ward.wardNumber : 0;
        const wName = w.ward ? w.ward.wardName : 'Unknown';
        return {
          wardName: `Ward ${wNum} (${wName})`,
          totalIssues: parseInt(w.get('totalIssues'), 10) || 0,
          resolved: parseInt(w.get('resolved'), 10) || 0,
          pending: parseInt(w.get('pending'), 10) || 0,
        };
      });
    } catch (err) {
      console.warn('wardStats query note:', err.message);
    }

    // Monthly trends (12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    let monthlyTrends = [];
    try {
      const trendsRows = await Issue.findAll({
        attributes: [
          [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
          [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'reported'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)`), 'resolved'],
          [sequelize.literal(`SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END)`), 'pending'],
        ],
        where: {
          createdAt: { [Op.gte]: twelveMonthsAgo },
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

      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyTrends = trendsRows.map((t) => ({
        month: monthLabels[Number(t.month) - 1],
        reported: parseInt(t.reported, 10) || 0,
        resolved: parseInt(t.resolved, 10) || 0,
        pending: parseInt(t.pending, 10) || 0,
      }));
    } catch (err) {
      console.warn('monthlyTrends query note:', err.message);
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalGrievances,
          resolvedGrievances,
          pendingGrievances,
          inProgressGrievances,
          rejectedGrievances,
          resolutionRate: totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 100) : 0,
        },
        categoryStats,
        departmentStats,
        constituencyStats,
        wardStats,
        monthlyTrends,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
