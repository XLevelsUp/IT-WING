import sequelize from '../config/mysql.js';

import User from './User.js';
import District from './District.js';
import Constituency from './Constituency.js';
import Ward from './Ward.js';
import DepartmentOfficer from './DepartmentOfficer.js';
import Member from './Member.js';
import Issue from './Issue.js';
import ComplaintBeforeImage from './ComplaintBeforeImage.js';
import ComplaintAfterImage from './ComplaintAfterImage.js';
import ComplaintAction from './ComplaintAction.js';
import ComplaintStatusHistory from './ComplaintStatusHistory.js';
import ComplaintAttachment from './ComplaintAttachment.js';
import IssueActivity from './IssueActivity.js';
import Project from './Project.js';
import Appointment from './Appointment.js';
import Notification from './Notification.js';
import GeneratedContent from './GeneratedContent.js';
import AuditLog from './AuditLog.js';
import ChatbotConversation from './ChatbotConversation.js';
import ChatbotMessage from './ChatbotMessage.js';

// Setup Associations
// 1. District & Constituency
District.hasMany(Constituency, { foreignKey: 'districtId', as: 'constituencies' });
Constituency.belongsTo(District, { foreignKey: 'districtId', as: 'district' });

// 2. Constituency & Ward
Constituency.hasMany(Ward, { foreignKey: 'constituencyId', as: 'wards' });
Ward.belongsTo(Constituency, { foreignKey: 'constituencyId', as: 'constituency' });

// 3. Ward & Ward Secretary (User)
Ward.belongsTo(User, { foreignKey: 'wardSecretaryId', as: 'wardSecretaryUser' });
User.hasMany(Ward, { foreignKey: 'wardSecretaryId', as: 'assignedWards' });

// 4. Members
District.hasMany(Member, { foreignKey: 'districtId', as: 'members' });
Member.belongsTo(District, { foreignKey: 'districtId', as: 'district' });

Constituency.hasMany(Member, { foreignKey: 'constituencyId', as: 'constituencyMembers' });
Member.belongsTo(Constituency, { foreignKey: 'constituencyId', as: 'constituency' });

Ward.hasMany(Member, { foreignKey: 'wardId', as: 'wardMembers' });
Member.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });

// 5. Issues / Complaints
Issue.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Issue.belongsTo(District, { foreignKey: 'districtId', as: 'district' });
Issue.belongsTo(Constituency, { foreignKey: 'constituencyId', as: 'constituency' });
Issue.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
Issue.belongsTo(DepartmentOfficer, { foreignKey: 'assignedOfficerId', as: 'assignedOfficerDetails' });
Issue.belongsTo(User, { foreignKey: 'assignedWardSecretaryId', as: 'assignedWardSecretary' });
Issue.belongsTo(User, { foreignKey: 'completedBy', as: 'completedByUser' });

// Complaint relational sub-tables
Issue.hasMany(ComplaintBeforeImage, { foreignKey: 'complaintId', as: 'beforeImages' });
ComplaintBeforeImage.belongsTo(Issue, { foreignKey: 'complaintId', as: 'complaint' });

Issue.hasMany(ComplaintAfterImage, { foreignKey: 'complaintId', as: 'afterImages' });
ComplaintAfterImage.belongsTo(Issue, { foreignKey: 'complaintId', as: 'complaint' });

Issue.hasMany(ComplaintAction, { foreignKey: 'complaintId', as: 'actions' });
ComplaintAction.belongsTo(Issue, { foreignKey: 'complaintId', as: 'complaint' });
ComplaintAction.belongsTo(User, { foreignKey: 'wardSecretaryId', as: 'wardSecretary' });
ComplaintAction.hasMany(ComplaintAfterImage, { foreignKey: 'actionId', as: 'actionAfterImages' });

Issue.hasMany(ComplaintStatusHistory, { foreignKey: 'complaintId', as: 'statusHistories' });
ComplaintStatusHistory.belongsTo(Issue, { foreignKey: 'complaintId', as: 'complaint' });

Issue.hasMany(ComplaintAttachment, { foreignKey: 'complaintId', as: 'attachmentList' });
ComplaintAttachment.belongsTo(Issue, { foreignKey: 'complaintId', as: 'complaint' });

Issue.hasMany(IssueActivity, { foreignKey: 'issueId', as: 'activities' });
IssueActivity.belongsTo(Issue, { foreignKey: 'issueId', as: 'issue' });
IssueActivity.belongsTo(User, { foreignKey: 'performedBy', as: 'performer' });

// 6. Projects
Project.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
Project.belongsTo(Constituency, { foreignKey: 'constituencyId', as: 'constituency' });

// 7. Appointments
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Appointment.belongsTo(User, { foreignKey: 'citizenId', as: 'citizen' });
Appointment.belongsTo(User, { foreignKey: 'subadminId', as: 'subadmin' });

// 8. Notifications
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// 9. Chatbot
ChatbotConversation.hasMany(ChatbotMessage, { foreignKey: 'conversationId', as: 'messages' });
ChatbotMessage.belongsTo(ChatbotConversation, { foreignKey: 'conversationId', as: 'conversation' });

// Synchronize database schema
export const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ MySQL schema synchronized successfully with relational tables, foreign keys, and indexes.');
  } catch (err) {
    console.error('❌ Failed to sync MySQL schema:', err.message);
    throw err;
  }
};

export {
  sequelize,
  User,
  District,
  Constituency,
  Ward,
  DepartmentOfficer,
  Member,
  Issue,
  ComplaintBeforeImage,
  ComplaintAfterImage,
  ComplaintAction,
  ComplaintStatusHistory,
  ComplaintAttachment,
  IssueActivity,
  Project,
  Appointment,
  Notification,
  GeneratedContent,
  AuditLog,
  ChatbotConversation,
  ChatbotMessage,
};

export default {
  sequelize,
  syncDatabase,
  User,
  District,
  Constituency,
  Ward,
  DepartmentOfficer,
  Member,
  Issue,
  ComplaintBeforeImage,
  ComplaintAfterImage,
  ComplaintAction,
  ComplaintStatusHistory,
  ComplaintAttachment,
  IssueActivity,
  Project,
  Appointment,
  Notification,
  GeneratedContent,
  AuditLog,
  ChatbotConversation,
  ChatbotMessage,
};
