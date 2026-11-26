import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Member extends Model {}

Member.init(
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
    memberId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    tamilName: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
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
    address: {
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
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING(100),
      defaultValue: 'Active Member',
    },
    isOfficeBearer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    joiningDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    bloodGroup: {
      type: DataTypes.STRING(20),
      defaultValue: '',
    },
    photoUrl: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'Member',
    tableName: 'members',
    timestamps: true,
    hooks: {
      beforeCreate: (m) => {
        if (!m._id) m._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Member);

export default Member;
