import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Appointment extends Model {}

Appointment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    _id: {
      type: DataTypes.STRING(64),
      unique: true,
      defaultValue: () => crypto.randomBytes(12).toString('hex'),
    },
    appointmentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tokenNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    citizenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subadminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    citizenName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    mobileNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    constituency: {
      type: DataTypes.STRING(100),
      defaultValue: 'Coimbatore South',
    },
    paguthi: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    ward: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    subject: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    additionalInfo: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    requestedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    preferredDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    requestedTime: {
      type: DataTypes.STRING(100),
      defaultValue: '10:00 AM - 11:30 AM',
    },
    preferredTimeSlot: {
      type: DataTypes.STRING(100),
      defaultValue: '10:00 AM - 11:30 AM',
    },
    requestedLocation: {
      type: DataTypes.TEXT,
      defaultValue: 'Coimbatore South District Party Headquarters, Race Course Road',
    },
    assignedVenue: {
      type: DataTypes.TEXT,
      defaultValue: 'Coimbatore South District Party Headquarters, Race Course Road',
    },
    confirmedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    confirmedTime: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    approvedTimeSlot: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    confirmedLocation: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    approvedVenue: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    subadminRemarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    meetingInstructions: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    adminNotes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    rescheduleReason: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    changeRequestNotes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    isModifiedBySubadmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approvedByName: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'Pending',
        'Pending Approval',
        'Requested',
        'Approved',
        'Confirmed',
        'Rescheduled',
        'Completed',
        'Cancelled',
        'Rejected'
      ),
      defaultValue: 'Pending',
    },
  },
  {
    sequelize,
    modelName: 'Appointment',
    tableName: 'appointments',
    timestamps: true,
    hooks: {
      beforeCreate: (a) => {
        if (!a._id) a._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Appointment);

export default Appointment;
