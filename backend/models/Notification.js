import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class Notification extends Model {}

Notification.init(
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
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recipientRole: {
      type: DataTypes.STRING(50),
      defaultValue: 'all',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(100),
      defaultValue: 'system',
    },
    referenceId: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    beforeImage: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    afterImage: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    actionTaken: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    hooks: {
      beforeCreate: (n) => {
        if (!n._id) n._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(Notification);

export default Notification;
