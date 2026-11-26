import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class AuditLog extends Model {}

AuditLog.init(
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING(150),
      defaultValue: 'System',
    },
    action: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      defaultValue: '127.0.0.1',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    hooks: {
      beforeCreate: (a) => {
        if (!a._id) a._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(AuditLog);

export default AuditLog;
