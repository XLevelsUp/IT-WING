import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class ComplaintBeforeImage extends Model {}

ComplaintBeforeImage.init(
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
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    caption: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ComplaintBeforeImage',
    tableName: 'complaint_before_images',
    timestamps: true,
  }
);

attachMongooseCompat(ComplaintBeforeImage);

export default ComplaintBeforeImage;
