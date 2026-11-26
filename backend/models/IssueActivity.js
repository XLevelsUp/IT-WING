import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class IssueActivity extends Model {}

IssueActivity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    issueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    performedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'IssueActivity',
    tableName: 'issue_activities',
    timestamps: true,
  }
);

attachMongooseCompat(IssueActivity);

export default IssueActivity;
