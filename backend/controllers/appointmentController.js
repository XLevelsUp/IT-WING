import { Op } from 'sequelize';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';

// Helper to format appointment instance for frontend
const formatAppointment = (a) => {
  if (!a) return null;
  const raw = a.toJSON ? a.toJSON() : a;
  const confLoc =
    (raw.confirmedLocation && String(raw.confirmedLocation).trim()) ||
    (raw.approvedVenue && String(raw.approvedVenue).trim()) ||
    '';
  const isConfirmedOrApproved = ['Confirmed', 'Approved', 'Rescheduled'].includes(raw.status);
  return {
    ...raw,
    _id: raw._id || String(raw.id),
    confirmedLocation: confLoc,
    approvedVenue: confLoc,
    location: confLoc || (isConfirmedOrApproved ? '' : (raw.requestedLocation || raw.assignedVenue || '')),
  };
};

// @desc    Book / Create a new Appointment (Citizen / User)
// @route   POST /api/appointments
// @access  Public / Private (Citizen)
export const bookAppointment = async (req, res) => {
  try {
    const {
      fullName,
      citizenName,
      mobileNumber,
      email,
      subject,
      purpose,
      description,
      requestedDate,
      preferredDate,
      requestedTime,
      preferredTimeSlot,
      requestedLocation,
      additionalInfo,
      constituency,
      paguthi,
      ward,
    } = req.body;

    const applicantName = fullName || citizenName || (req.user ? req.user.name : '');
    const phone = mobileNumber || (req.user ? req.user.phone : '');
    const appointmentSubject = subject || purpose || '';
    const dateVal = requestedDate || preferredDate;
    const timeVal = requestedTime || preferredTimeSlot || '10:00 AM - 11:30 AM';
    const locVal = requestedLocation || 'Coimbatore South District Party Headquarters, Race Course Road';

    if (!applicantName || !phone || !appointmentSubject || !dateVal) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Full Name, Mobile Number, Subject, and Preferred Date.',
      });
    }

    const year = new Date().getFullYear();
    const count = await Appointment.count();
    const uniqueId = `APT-${year}-${String(count + 101).padStart(4, '0')}`;

    const userId = req.user ? req.user.id : null;

    const appointment = await Appointment.create({
      appointmentId: uniqueId,
      tokenNumber: uniqueId,
      userId,
      citizenId: userId,
      fullName: applicantName,
      citizenName: applicantName,
      mobileNumber: phone,
      email: email || (req.user ? req.user.email : ''),
      subject: appointmentSubject,
      purpose: appointmentSubject,
      description: description || '',
      additionalInfo: additionalInfo || '',
      requestedDate: new Date(dateVal),
      preferredDate: new Date(dateVal),
      requestedTime: timeVal,
      preferredTimeSlot: timeVal,
      requestedLocation: locVal,
      assignedVenue: locVal,
      constituency: constituency || (req.user ? req.user.constituency : 'Coimbatore South'),
      paguthi: paguthi || '',
      ward: ward || (req.user ? req.user.assignedWard : ''),
      status: 'Pending',
    });

    try {
      await Notification.create({
        recipientRole: 'subadmin',
        title: 'New Appointment Booking',
        message: `${applicantName} submitted appointment request "${appointmentSubject}" for ${new Date(dateVal).toLocaleDateString()}. ID: ${uniqueId}`,
        type: 'appointment_submitted',
        referenceId: uniqueId,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch subadmin notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your appointment request has been submitted successfully. Waiting for approval.',
      data: formatAppointment(appointment),
    });
  } catch (error) {
    console.error('Error in bookAppointment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Track Minister Appointment by ID or Mobile
// @route   GET /api/appointments/track
// @access  Public
export const trackAppointment = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please enter an Appointment ID or Mobile Number',
      });
    }

    const trimmed = query.trim();
    const appointments = await Appointment.findAll({
      where: {
        [Op.or]: [
          { appointmentId: trimmed.toUpperCase() },
          { tokenNumber: trimmed.toUpperCase() },
          { mobileNumber: trimmed },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No appointment found with the provided identifier.',
      });
    }

    res.json({
      success: true,
      data: appointments.map(formatAppointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged in user / citizen's appointments
// @route   GET /api/appointments/my
// @access  Private (Citizen / User)
export const getMyCitizenAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userPhone = req.user.phone;

    const appointments = await Appointment.findAll({
      where: {
        [Op.or]: [
          { userId },
          { citizenId: userId },
          { mobileNumber: userPhone },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: appointments.map(formatAppointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Subadmin Appointments with Search, Filters, Pagination & Stats
// @route   GET /api/appointments
// @access  Private (Subadmin, Admin)
export const getAppointments = async (req, res) => {
  try {
    const {
      search,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];

    // Subadmin scoping by constituency if applicable
    if (req.user.role === 'subadmin' && req.user.constituency && req.user.constituency !== 'All' && req.user.constituency !== 'Coimbatore') {
      whereConditions.push({ constituency: req.user.constituency });
    }

    // Status filter
    if (status && status !== 'All' && status !== 'All Status') {
      if (status === 'Pending') {
        whereConditions.push({ status: { [Op.in]: ['Pending', 'Pending Approval', 'Requested'] } });
      } else if (status === 'Confirmed') {
        whereConditions.push({ status: { [Op.in]: ['Confirmed', 'Approved'] } });
      } else if (status === 'Rescheduled') {
        whereConditions.push({ status: { [Op.in]: ['Rescheduled', 'Changes Requested'] } });
      } else {
        whereConditions.push({ status });
      }
    }

    // Date filter
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereConditions.push({
        [Op.or]: [
          { requestedDate: { [Op.between]: [startOfDay, endOfDay] } },
          { preferredDate: { [Op.between]: [startOfDay, endOfDay] } },
          { confirmedDate: { [Op.between]: [startOfDay, endOfDay] } },
        ],
      });
    } else if (startDate || endDate) {
      const s = startDate ? new Date(startDate) : new Date(0);
      const e = endDate ? new Date(endDate) : new Date(9999, 11, 31);
      whereConditions.push({
        [Op.or]: [
          { requestedDate: { [Op.between]: [s, e] } },
          { preferredDate: { [Op.between]: [s, e] } },
        ],
      });
    }

    // Search filter
    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { appointmentId: { [Op.like]: pattern } },
          { tokenNumber: { [Op.like]: pattern } },
          { fullName: { [Op.like]: pattern } },
          { citizenName: { [Op.like]: pattern } },
          { mobileNumber: { [Op.like]: pattern } },
          { subject: { [Op.like]: pattern } },
          { purpose: { [Op.like]: pattern } },
          { requestedLocation: { [Op.like]: pattern } },
        ],
      });
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const validSortCol = ['id', 'createdAt', 'tokenNumber', 'preferredDate', 'status'].includes(sortBy) ? sortBy : 'createdAt';
    const validSortDir = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { count: total, rows: appointments } = await Appointment.findAndCountAll({
      where: whereClause,
      order: [[validSortCol, validSortDir]],
      offset,
      limit: limitNum,
    });

    const baseWhere = req.user.role === 'subadmin' && req.user.constituency && req.user.constituency !== 'All' && req.user.constituency !== 'Coimbatore'
      ? { constituency: req.user.constituency }
      : {};

    const allAppointments = await Appointment.findAll({ where: baseWhere });

    const totalAppointments = allAppointments.length;
    const pendingAppointments = allAppointments.filter((a) =>
      ['Pending', 'Pending Approval', 'Requested'].includes(a.status)
    ).length;
    const confirmedAppointments = allAppointments.filter((a) =>
      ['Confirmed', 'Approved'].includes(a.status)
    ).length;
    const rescheduledAppointments = allAppointments.filter((a) =>
      ['Rescheduled', 'Changes Requested'].includes(a.status)
    ).length;
    const rejectedAppointments = allAppointments.filter((a) => a.status === 'Rejected').length;
    const completedAppointments = allAppointments.filter((a) => a.status === 'Completed').length;

    res.json({
      success: true,
      data: appointments.map(formatAppointment),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      stats: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        rescheduledAppointments,
        rejectedAppointments,
        completedAppointments,
      },
    });
  } catch (error) {
    console.error('Error in getAppointments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointmentById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = Number(rawId);
    let appointment = null;
    if (!isNaN(numId) && numId > 0) {
      appointment = await Appointment.findByPk(numId);
    }
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: rawId }, { tokenNumber: rawId }, { appointmentId: rawId }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'citizen') {
      const isOwner =
        appointment.userId === req.user.id ||
        appointment.citizenId === req.user.id ||
        appointment.mobileNumber === req.user.phone;
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied to this appointment' });
      }
    }

    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm Appointment (Subadmin)
// @route   PUT /api/appointments/:id/confirm
// @access  Private (Subadmin, Admin)
export const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      confirmedDate,
      confirmedTime,
      confirmedLocation,
      subadminRemarks,
      finalDate,
      finalTimeSlot,
      finalVenue,
      meetingInstructions,
    } = req.body;

    const numId = Number(id);
    let appointment = !isNaN(numId) && numId > 0 ? await Appointment.findByPk(numId) : null;
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: id }, { tokenNumber: id }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const subadminName = req.user.name || 'District Subadmin';
    const subadminId = req.user.id;

    const dateVal = confirmedDate || finalDate ? new Date(confirmedDate || finalDate) : appointment.requestedDate || appointment.preferredDate;
    const timeVal = confirmedTime || finalTimeSlot || appointment.requestedTime || appointment.preferredTimeSlot;
    const locVal =
      (confirmedLocation && String(confirmedLocation).trim()) ||
      (finalVenue && String(finalVenue).trim()) ||
      (appointment.confirmedLocation && String(appointment.confirmedLocation).trim()) ||
      (appointment.approvedVenue && String(appointment.approvedVenue).trim()) ||
      '';

    await appointment.update({
      status: 'Confirmed',
      confirmedDate: dateVal,
      approvedDate: dateVal,
      confirmedTime: timeVal,
      approvedTimeSlot: timeVal,
      confirmedLocation: locVal,
      approvedVenue: locVal,
      subadminRemarks: subadminRemarks || '',
      meetingInstructions: meetingInstructions || '',
      subadminId,
      approvedBy: subadminId,
      approvedByName: subadminName,
      approvedAt: new Date(),
      isModifiedBySubadmin: false,
    });

    try {
      if (appointment.userId || appointment.citizenId) {
        await Notification.create({
          recipientId: appointment.userId || appointment.citizenId,
          recipientRole: 'citizen',
          title: 'Appointment Confirmed',
          message: `Your appointment request ${appointment.tokenNumber} has been Confirmed for ${dateVal.toLocaleDateString()} at ${timeVal}. Venue: ${locVal}`,
          type: 'appointment_approved',
          referenceId: appointment.tokenNumber,
          status: 'Confirmed',
        });
      }
    } catch (notifErr) {
      console.warn('Notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Appointment confirmed successfully.',
      data: formatAppointment(appointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reschedule / Request Changes on Appointment (Subadmin)
// @route   PUT /api/appointments/:id/reschedule
// @access  Private (Subadmin, Admin)
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      confirmedDate,
      confirmedTime,
      confirmedLocation,
      rescheduleReason,
      changeRequestNotes,
      subadminRemarks,
      meetingInstructions,
    } = req.body;

    const numId = Number(id);
    let appointment = !isNaN(numId) && numId > 0 ? await Appointment.findByPk(numId) : null;
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: id }, { tokenNumber: id }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const subadminName = req.user.name || 'District Subadmin';
    const subadminId = req.user.id;

    const dateVal = confirmedDate ? new Date(confirmedDate) : appointment.preferredDate;
    const timeVal = confirmedTime || appointment.preferredTimeSlot;
    const locVal =
      (confirmedLocation && String(confirmedLocation).trim()) ||
      (appointment.confirmedLocation && String(appointment.confirmedLocation).trim()) ||
      (appointment.approvedVenue && String(appointment.approvedVenue).trim()) ||
      '';
    const reason = rescheduleReason || changeRequestNotes || subadminRemarks || 'Timing rescheduled';

    await appointment.update({
      status: 'Rescheduled',
      confirmedDate: dateVal,
      approvedDate: dateVal,
      confirmedTime: timeVal,
      approvedTimeSlot: timeVal,
      confirmedLocation: locVal,
      approvedVenue: locVal,
      rescheduleReason: reason,
      changeRequestNotes: reason,
      subadminRemarks: subadminRemarks || '',
      meetingInstructions: meetingInstructions || '',
      isModifiedBySubadmin: true,
      subadminId,
      approvedBy: subadminId,
      approvedByName: subadminName,
      approvedAt: new Date(),
    });

    try {
      if (appointment.userId || appointment.citizenId) {
        await Notification.create({
          recipientId: appointment.userId || appointment.citizenId,
          recipientRole: 'citizen',
          title: 'Appointment Rescheduled by Minister Office',
          message: `Your appointment ${appointment.tokenNumber} has been updated: ${dateVal.toLocaleDateString()} at ${timeVal}. Reason: ${reason}`,
          type: 'appointment_modified',
          referenceId: appointment.tokenNumber,
          status: 'Rescheduled',
        });
      }
    } catch (notifErr) {
      console.warn('Notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Appointment rescheduled and user notified successfully.',
      data: formatAppointment(appointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject / Cancel Appointment (Subadmin)
// @route   PUT /api/appointments/:id/reject
// @access  Private (Subadmin, Admin)
export const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    const numId = Number(id);
    let appointment = !isNaN(numId) && numId > 0 ? await Appointment.findByPk(numId) : null;
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: id }, { tokenNumber: id }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const reason = rejectionReason || adminNotes || 'Consultation slot unavailable at this time.';

    await appointment.update({
      status: 'Rejected',
      rejectionReason: reason,
      adminNotes: adminNotes || '',
      subadminId: req.user.id,
      completedAt: new Date(),
    });

    try {
      if (appointment.userId || appointment.citizenId) {
        await Notification.create({
          recipientId: appointment.userId || appointment.citizenId,
          recipientRole: 'citizen',
          title: 'Appointment Request Status Update',
          message: `Your appointment request ${appointment.tokenNumber} could not be confirmed. Reason: ${reason}`,
          type: 'appointment_rejected',
          referenceId: appointment.tokenNumber,
          status: 'Rejected',
        });
      }
    } catch (notifErr) {
      console.warn('Notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Appointment request rejected.',
      data: formatAppointment(appointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark Appointment as Completed (Subadmin)
// @route   PUT /api/appointments/:id/complete
// @access  Private (Subadmin, Admin)
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingNotes } = req.body;

    const numId = Number(id);
    let appointment = !isNaN(numId) && numId > 0 ? await Appointment.findByPk(numId) : null;
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: id }, { tokenNumber: id }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await appointment.update({
      status: 'Completed',
      adminNotes: meetingNotes || appointment.adminNotes || '',
      completedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Appointment marked as completed.',
      data: formatAppointment(appointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Review Appointment (Legacy compat)
// @route   PUT /api/appointments/:id/review
// @access  Private (Subadmin, Admin)
export const reviewAppointment = async (req, res) => {
  return confirmAppointment(req, res);
};

// @desc    Update Appointment Status Generic (Legacy compat)
// @route   PUT /api/appointments/:id
// @access  Private (Subadmin, Admin)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, confirmedLocation, approvedVenue } = req.body;

    const numId = Number(id);
    let appointment = !isNaN(numId) && numId > 0 ? await Appointment.findByPk(numId) : null;
    if (!appointment) {
      appointment = await Appointment.findOne({ where: { [Op.or]: [{ _id: id }, { tokenNumber: id }] } });
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const locVal =
      confirmedLocation !== undefined
        ? String(confirmedLocation).trim()
        : approvedVenue !== undefined
        ? String(approvedVenue).trim()
        : undefined;

    await appointment.update({
      ...(status ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
      ...(locVal !== undefined ? { confirmedLocation: locVal, approvedVenue: locVal } : {}),
    });

    res.json({
      success: true,
      message: `Appointment updated to ${appointment.status}`,
      data: formatAppointment(appointment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  bookAppointment,
  trackAppointment,
  getMyCitizenAppointments,
  getAppointments,
  getAppointmentById,
  confirmAppointment,
  rescheduleAppointment,
  rejectAppointment,
  completeAppointment,
  reviewAppointment,
  updateAppointmentStatus,
};
