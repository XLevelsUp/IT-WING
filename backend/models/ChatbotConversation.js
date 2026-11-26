import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/mysql.js';
import { attachMongooseCompat } from './sqlHelper.js';

class ChatbotConversation extends Model {}

ChatbotConversation.init(
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
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ChatbotConversation',
    tableName: 'chatbot_conversations',
    timestamps: true,
    hooks: {
      beforeCreate: (c) => {
        if (!c._id) c._id = crypto.randomBytes(12).toString('hex');
      },
    },
  }
);

attachMongooseCompat(ChatbotConversation);

export default ChatbotConversation;
