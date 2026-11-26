import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Project extends Model {}

Project.init(
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
    projectCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
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
      defaultValue: 'Community Infrastructure',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Coimbatore District',
    },
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    constituencyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(150),
      defaultValue: 'Coimbatore Municipal Corporation',
    },
    budget: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    startDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Ongoing',
    },
    progressPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    highlights: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
    hooks: {
      beforeCreate: (p) => {
        if (!p._id) p._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Project);

export default Project;
