import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class District extends Model {}

District.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      defaultValue: 'Coimbatore',
    },
    tamilName: {
      type: DataTypes.STRING(100),
      defaultValue: 'கோயம்புத்தூர்',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      defaultValue: 'CBE',
    },
    headquarters: {
      type: DataTypes.STRING(255),
      defaultValue: 'Coimbatore Corporation Office',
    },
    totalConstituencies: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    totalWards: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: 'Coimbatore District Administration & Grievance Governance System',
    },
  },
  {
    sequelize,
    modelName: 'District',
    tableName: 'districts',
    timestamps: true,
    hooks: {
      beforeCreate: (d) => {
        if (!d._id) d._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(District);

export default District;
