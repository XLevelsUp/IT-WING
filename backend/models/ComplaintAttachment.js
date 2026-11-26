import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class ComplaintAttachment extends Model {}

ComplaintAttachment.init(
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
    fileName: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ComplaintAttachment',
    tableName: 'complaint_attachments',
    timestamps: true,
  }
);

attachMongooseCompat(ComplaintAttachment);

export default ComplaintAttachment;
