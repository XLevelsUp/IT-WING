import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Constituency extends Model {}

Constituency.init(
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
    districtId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tamilName: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    zone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Central',
    },
    mlaName: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    totalWards: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    totalPaguthi: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    paguthis: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    activeIssuesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Constituency',
    tableName: 'constituencies',
    timestamps: true,
    hooks: {
      beforeCreate: (c) => {
        if (!c._id) c._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Constituency);

export default Constituency;
