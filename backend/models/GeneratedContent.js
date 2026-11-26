import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class GeneratedContent extends Model {}

GeneratedContent.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contentType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Press Release',
    },
    language: {
      type: DataTypes.STRING(50),
      defaultValue: 'Tamil',
    },
    topic: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    promptDescription: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    generatedContent: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isSaved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'GeneratedContent',
    tableName: 'generated_contents',
    timestamps: true,
    hooks: {
      beforeCreate: (g) => {
        if (!g._id) g._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(GeneratedContent);

export default GeneratedContent;
