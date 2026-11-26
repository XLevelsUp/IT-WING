import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class DepartmentOfficer extends Model {}

DepartmentOfficer.init(
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
    officerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'Corporation / Municipal Admin',
    },
    designation: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'Assistant Executive Engineer',
    },
    officeAddress: {
      type: DataTypes.TEXT,
      defaultValue: 'Coimbatore Corporation Office, Town Hall',
    },
    contactNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING(100),
      defaultValue: 'Coimbatore',
    },
    workingArea: {
      type: DataTypes.STRING(255),
      defaultValue: 'Coimbatore District & Zones',
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Active',
    },
  },
  {
    sequelize,
    modelName: 'DepartmentOfficer',
    tableName: 'department_officers',
    timestamps: true,
    hooks: {
      beforeCreate: (o) => {
        if (!o._id) o._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(DepartmentOfficer);

export default DepartmentOfficer;
