import { Op } from 'sequelize';
import { Project, Ward, Constituency } from '../models/index.js';

// @desc    Get all projects with filters (latest first)
// @route   GET /api/projects
// @access  Public / Authenticated
export const getProjects = async (req, res) => {
  try {
    const { status, search, constituencyId, wardId } = req.query;
    let where = {};

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
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { projectCode: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
      ];
    }

    const projects = await Project.findAll({
      where,
      include: [
        { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
        { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code'] },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    const totalCount = await Project.count();
    const plannedCount = await Project.count({ where: { status: 'Planned' } });
    const ongoingCount = await Project.count({ where: { status: 'Ongoing' } });
    const completedCount = await Project.count({ where: { status: 'Completed' } });

    const formattedProjects = projects.map((p) => {
      const obj = p.toObject ? p.toObject() : p.toJSON();
      return {
        ...obj,
        wardId: p.ward,
        constituencyId: p.constituency,
      };
    });

    res.json({
      success: true,
      data: formattedProjects,
      summary: {
        total: totalCount,
        planned: plannedCount,
        ongoing: ongoingCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Public / Authenticated
export const getProjectById = async (req, res) => {
  try {
    const isNumeric = !isNaN(Number(req.params.id));
    const project = isNumeric
      ? await Project.findByPk(req.params.id, {
          include: [
            { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
            { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code'] },
          ],
        })
      : await Project.findOne({
          where: { _id: req.params.id },
          include: [
            { model: Ward, as: 'ward', attributes: ['id', '_id', 'wardNumber', 'wardName'] },
            { model: Constituency, as: 'constituency', attributes: ['id', '_id', 'name', 'code'] },
          ],
        });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const obj = project.toObject ? project.toObject() : project.toJSON();
    res.json({
      success: true,
      data: {
        ...obj,
        wardId: project.ward,
        constituencyId: project.constituency,
      },
    });
  } catch (error) {
    console.error('getProjectById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new project (Admin only)
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      category = 'Community Infrastructure',
      location = 'Coimbatore District',
      department = 'Coimbatore Municipal Corporation',
      status = 'Ongoing',
      startDate,
      budget,
      progressPercentage = 0,
      wardId,
      constituencyId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Project Description is required' });
    }
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ success: false, message: 'Project Image is required' });
    }

    const count = await Project.count();
    const projectCode = req.body.projectCode || `PRJ-CBE-${String(count + 101).padStart(4, '0')}`;

    const project = await Project.create({
      projectCode,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      category: (category && category.trim()) || 'Community Infrastructure',
      location: (location && location.trim()) || 'Coimbatore District',
      department: (department && department.trim()) || 'Coimbatore Municipal Corporation',
      status: ['Planned', 'Ongoing', 'Completed'].includes(status) ? status : 'Ongoing',
      startDate: startDate ? new Date(startDate) : new Date(),
      budget: budget ? parseFloat(budget) : 0,
      progressPercentage: parseInt(progressPercentage, 10) || 0,
      wardId: wardId ? parseInt(wardId, 10) : null,
      constituencyId: constituencyId ? parseInt(constituencyId, 10) : null,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('createProject error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update project (Admin only)
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    const isNumeric = !isNaN(Number(req.params.id));
    const project = isNumeric
      ? await Project.findByPk(req.params.id)
      : await Project.findOne({ where: { _id: req.params.id } });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.body.title !== undefined) project.title = req.body.title.trim();
    if (req.body.description !== undefined) project.description = req.body.description.trim();
    if (req.body.imageUrl !== undefined) project.imageUrl = req.body.imageUrl.trim();
    if (req.body.category !== undefined) project.category = req.body.category.trim();
    if (req.body.location !== undefined) project.location = req.body.location.trim();
    if (req.body.department !== undefined) project.department = req.body.department.trim();
    if (req.body.status !== undefined) project.status = req.body.status;
    if (req.body.startDate !== undefined) project.startDate = new Date(req.body.startDate);
    if (req.body.budget !== undefined) project.budget = parseFloat(req.body.budget) || 0;
    if (req.body.progressPercentage !== undefined)
      project.progressPercentage = parseInt(req.body.progressPercentage, 10) || 0;
    if (req.body.wardId !== undefined) project.wardId = req.body.wardId ? parseInt(req.body.wardId, 10) : null;
    if (req.body.constituencyId !== undefined)
      project.constituencyId = req.body.constituencyId ? parseInt(req.body.constituencyId, 10) : null;

    await project.save();

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('updateProject error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete project (Admin only)
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
  try {
    const isNumeric = !isNaN(Number(req.params.id));
    const project = isNumeric
      ? await Project.findByPk(req.params.id)
      : await Project.findOne({ where: { _id: req.params.id } });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await project.destroy();
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
