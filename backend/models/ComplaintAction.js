import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class ComplaintAction extends Model {}

ComplaintAction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    complaintId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    wardSecretaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actionTaken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    wardSecretaryRemarks: {
      type: DataTypes.TEXT,
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
    completedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ComplaintAction',
    tableName: 'complaint_actions',
    timestamps: true,
  }
);

attachMongooseCompat(ComplaintAction);

export default ComplaintAction;
