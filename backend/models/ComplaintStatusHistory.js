import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class ComplaintStatusHistory extends Model {}

ComplaintStatusHistory.init(
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
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    updatedByName: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    remarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    photoURLs: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ComplaintStatusHistory',
    tableName: 'complaint_status_history',
    timestamps: true,
  }
);

attachMongooseCompat(ComplaintStatusHistory);

export default ComplaintStatusHistory;
