import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Ward extends Model {}

Ward.init(
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
    constituencyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    wardNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    wardName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tamilName: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    zone: {
      type: DataTypes.STRING(50),
      defaultValue: 'South Zone',
    },
    paguthi: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    village: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    officeBearer: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    wardSecretary: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    wardSecretaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    contactNumber: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    population: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    areaCoverage: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'Ward',
    tableName: 'wards',
    timestamps: true,
    hooks: {
      beforeCreate: (w) => {
        if (!w._id) w._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Ward);

export default Ward;
