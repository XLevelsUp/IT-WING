import { Op } from 'sequelize';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import District from '../models/District.js';
import Ward from '../models/Ward.js';
import Constituency from '../models/Constituency.js';
import { isVillageValidForPaguthi, getVillagesForPaguthi, getCanonicalTargetPaguthis } from '../utils/paguthiVillageData.js';

// @desc    Get All System Settings & Organization Info
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    const district = await District.findOne({ where: { code: 'CBE' } });
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    const auditLogs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 15,
    });

    res.json({
      success: true,
      data: {
        organization: {
          name: 'Tamilaga Vettri Kazhagam (TVK)',
          tamilName: 'தமிழக வெற்றிக் கழகம்',
          district: 'Coimbatore District',
          jurisdiction: 'Coimbatore Municipal Corporation & Rural Zones',
          headquarters: 'Coimbatore District Headquarters',
          helpline: '+91 422 2300100',
          email: 'governance.cbe@tvkparty.in',
          website: 'https://cbesouthdashboard.vercel.app',
        },
        districtDetails: district,
        users,
        auditLogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Admin Profile
// @route   PUT /api/settings/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, avatarUrl } = req.body;
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone !== undefined ? phone : user.phone;
    user.avatarUrl = avatarUrl !== undefined ? avatarUrl : user.avatarUrl;

    await user.save();

    await AuditLog.create({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_PROFILE',
      module: 'SETTINGS',
      details: 'Updated profile information',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Password
// @route   PUT /api/settings/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
    }

    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      userId: user.id,
      userName: user.name,
      action: 'CHANGE_PASSWORD',
      module: 'SETTINGS',
      details: 'Changed account password',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create User (Admin Only)
// @route   POST /api/settings/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { name, username, email, password, role, phone, assignedWard } = req.body;

    const existing = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
    }

    const newUser = await User.create({
      name,
      username,
      email,
      password,
      role: role || 'ward_officer',
      phone,
      assignedWard,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: newUser._id,
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle User Active Status (Admin Only)
// @route   PATCH /api/settings/users/:id/toggle-status
// @access  Private/Admin
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} is now ${user.isActive ? 'Active' : 'Deactivated'}`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get List of Ward Secretary Accounts
// @route   GET /api/settings/ward-secretaries
// @access  Private (Admin / Subadmin)
export const getWardSecretariesList = async (req, res) => {
  try {
    const secretaries = await User.findAll({
      where: {
        role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
        paguthi: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
      },
      attributes: ['id', '_id', 'name', 'phone', 'age', 'paguthi', 'village', 'assignedWard', 'wardId', 'username', 'role', 'isActive', 'createdAt', 'lastLogin'],
      order: [['createdAt', 'DESC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: secretaries.map((s) => ({
        ...s.toJSON(),
        _id: s._id || String(s.id),
        paguthi: s.paguthi === 'Podanur' ? 'Pothanur' : (s.paguthi || ''),
        village: s.village || '',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new Ward Secretary Account from Admin Settings
// @route   POST /api/settings/ward-secretaries
// @access  Private (Admin Only)
export const registerWardSecretary = async (req, res) => {
  try {
    const {
      name,
      phone,
      age,
      paguthi,
      village,
      wardId,
      assignedWard,
      username,
      password,
      confirmPassword,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone Number is required' });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)',
      });
    }

    const cleanPaguthi = (paguthi || '').trim();
    if (!cleanPaguthi) {
      return res.status(400).json({ success: false, message: 'Paguthi selection is required' });
    }

    const cleanVillage = (village || '').trim();
    if (!isVillageValidForPaguthi(cleanPaguthi, cleanVillage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid village "${cleanVillage}" for selected Paguthi "${cleanPaguthi}". Please select a valid village from the list.`,
      });
    }

    const numAge = age ? parseInt(age, 10) : 32;

    if (!assignedWard && !wardId && !req.body.wardNumber) {
      return res.status(400).json({ success: false, message: 'Ward selection is required' });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    const cleanUsername = username.trim().toLowerCase();

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Confirm Password does not match Password' });
    }

    // Resolve Ward details from database strictly within the selected Paguthi
    let wardDoc = null;
    const rawWard = assignedWard || req.body.wardNumber || wardId;
    const parsedWardNum = rawWard ? parseInt(String(rawWard).replace(/\D+/g, ''), 10) : null;
    const paguthiFilter = getCanonicalTargetPaguthis(cleanPaguthi);
    const canonicalPaguthi = paguthiFilter[0] || cleanPaguthi;

    // Check by wardId if provided, but ONLY if it belongs to this paguthi!
    if (wardId) {
      const numWId = Number(wardId);
      if (!isNaN(numWId) && numWId > 0) {
        const candidate = await Ward.findOne({
          where: {
            id: numWId,
            paguthi: { [Op.in]: paguthiFilter },
          },
        });
        if (candidate) {
          wardDoc = candidate;
        }
      }
    }

    // Check by wardNumber within this paguthi
    if (!wardDoc && canonicalPaguthi && parsedWardNum && !isNaN(parsedWardNum)) {
      wardDoc = await Ward.findOne({
        where: {
          wardNumber: parsedWardNum,
          paguthi: { [Op.in]: paguthiFilter },
        },
      });
    }

    // If ward doesn't exist yet for this paguthi, create it dynamically under this exact paguthi
    if (!wardDoc && canonicalPaguthi && parsedWardNum && !isNaN(parsedWardNum)) {
      const kinathu = await Constituency.findOne({ where: { name: 'Kinathukadavu' } });
      const wardNameText = `${canonicalPaguthi} Ward ${parsedWardNum}`;
      wardDoc = await Ward.create({
        wardNumber: parsedWardNum,
        wardName: wardNameText,
        tamilName: `${canonicalPaguthi} வார்டு ${parsedWardNum}`,
        paguthi: canonicalPaguthi,
        constituencyId: kinathu?.id || 6,
        zone: 'South Zone',
      });
    }

    // Build the final clean label ensuring it belongs strictly to this Paguthi
    let finalWardLabel = '';
    if (wardDoc) {
      const cleanWName = (wardDoc.wardName || '').replace(/^Ward\s*\d+\s*[-:]*\s*/i, '').trim();
      finalWardLabel = cleanWName ? `Ward ${wardDoc.wardNumber} - ${cleanWName}` : `Ward ${wardDoc.wardNumber}`;
    } else {
      finalWardLabel = parsedWardNum ? `Ward ${parsedWardNum} - ${canonicalPaguthi} Ward ${parsedWardNum}` : 'Ward';
    }
    const finalWardId = wardDoc ? wardDoc.id : null;

    // Check username uniqueness
    const existingUsername = await User.findOne({
      where: {
        username: cleanUsername,
      },
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" is already taken. Please choose another username.`,
      });
    }

    // Prevent duplicate active Ward Secretary registration for the same ward in this Paguthi
    const existingActiveSecretary = await User.findOne({
      where: {
        role: { [Op.in]: ['ward_secretary', 'ward', 'ward_officer'] },
        isActive: true,
        [Op.or]: [
          ...(wardDoc ? [{ wardId: wardDoc.id }] : []),
          {
            paguthi: cleanPaguthi,
            [Op.or]: [
              { assignedWard: `Ward ${wardDoc.wardNumber}` },
              { assignedWard: finalWardLabel },
              { assignedWard: { [Op.like]: `Ward ${wardDoc.wardNumber} - %` } },
              { assignedWard: { [Op.like]: `Ward ${wardDoc.wardNumber} %` } },
            ],
          },
        ],
      },
    });
    if (existingActiveSecretary) {
      return res.status(400).json({
        success: false,
        message: `An active Ward Secretary (${existingActiveSecretary.name}) is already assigned to Ward ${wardDoc.wardNumber} in ${cleanPaguthi}. Each municipal ward can have only one active Ward Secretary.`,
      });
    }

    // Create Ward Secretary Account in MySQL
    const newSecretary = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: `${cleanUsername}@tvkcbe.org`,
      phone: cleanPhone,
      age: numAge,
      password, // Automatically hashed by User beforeCreate hook
      role: 'ward_secretary',
      assignedDistrict: 'Coimbatore',
      assignedWard: finalWardLabel || `Ward ${wardDoc.wardNumber}`,
      wardId: finalWardId,
      constituency: 'Kinathukadavu',
      paguthi: cleanPaguthi,
      village: cleanVillage,
      isActive: true,
    });

    // Update Ward table reference
    if (wardDoc) {
      wardDoc.wardSecretary = newSecretary.name;
      wardDoc.wardSecretaryId = newSecretary.id;
      wardDoc.contactNumber = cleanPhone;
      if (cleanVillage) {
        wardDoc.village = cleanVillage;
      }
      await wardDoc.save();
    }

    // Log Administrative Audit Entry
    await AuditLog.create({
      userId: req.user?.id || 1,
      userName: req.user?.name || 'Administrator',
      action: 'REGISTER_WARD_SECRETARY',
      module: 'SETTINGS',
      details: `Registered Ward Secretary ${newSecretary.name} (@${newSecretary.username}) for ${cleanPaguthi} ${cleanVillage ? `(${cleanVillage}) ` : ''}Ward ${wardDoc.wardNumber}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({
      success: true,
      message: `Ward Secretary account for ${newSecretary.name} (${cleanPaguthi} Ward ${wardDoc.wardNumber}) registered successfully!`,
      data: {
        id: newSecretary.id,
        _id: newSecretary._id,
        name: newSecretary.name,
        phone: newSecretary.phone,
        age: newSecretary.age,
        paguthi: newSecretary.paguthi,
        village: newSecretary.village || '',
        assignedWard: newSecretary.assignedWard,
        wardId: newSecretary.wardId,
        username: newSecretary.username,
        role: newSecretary.role,
        isActive: newSecretary.isActive,
        createdAt: newSecretary.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Ward Secretary Active Status (Admin Only)
// @route   PATCH /api/settings/ward-secretaries/:id/toggle-status
// @access  Private/Admin
export const toggleWardSecretaryStatus = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let user = null;
    if (!isNaN(numId) && numId > 0) {
      user = await User.findByPk(numId);
    }
    if (!user) {
      user = await User.findOne({ where: { _id: String(rawId) } });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Ward Secretary account not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await AuditLog.create({
      userId: req.user?.id || 1,
      userName: req.user?.name || 'Administrator',
      action: user.isActive ? 'ACTIVATE_WARD_SECRETARY' : 'DEACTIVATE_WARD_SECRETARY',
      module: 'SETTINGS',
      details: `${user.isActive ? 'Activated' : 'Deactivated'} Ward Secretary account: ${user.name} (@${user.username})`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: `Ward Secretary account ${user.name} is now ${user.isActive ? 'Active' : 'Deactivated'}`,
      data: {
        id: user.id,
        _id: user._id,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
