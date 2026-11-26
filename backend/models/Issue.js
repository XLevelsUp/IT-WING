import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Issue extends Model {}

Issue.init(
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
    issueCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    complaintId: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Sanitation / Drainage',
    },
    subcategory: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      defaultValue: 'Medium',
    },
    status: {
      type: DataTypes.ENUM('New', 'Assigned', 'Pending', 'Under Review', 'In Progress', 'Completed', 'Resolved', 'Rejected', 'Closed'),
      defaultValue: 'New',
    },
    citizenName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    citizenMobile: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    citizenAddress: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    districtId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    constituencyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    paguthi: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    village: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    wardNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    wardName: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    assignedWardSecretaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assignedDepartment: {
      type: DataTypes.STRING(150),
      defaultValue: 'Corporation / Municipal Admin',
    },
    assignedOfficerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assignedOfficer: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    location: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    beforePhoto: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    beforeImage: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    afterPhoto: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    afterImage: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    workStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    finalReport: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    actionTaken: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    wardSecretaryRemarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    adminRemarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    siteVisitDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    siteVisitRemarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    siteVisitPhotoURLs: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    resolutionDetails: {
      type: DataTypes.JSON,
      defaultValue: null,
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    statusHistory: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'Issue',
    tableName: 'issues',
    timestamps: true,
    hooks: {
      beforeCreate: (i) => {
        if (!i._id) i._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Issue);

export default Issue;
