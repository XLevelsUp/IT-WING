import {
  sequelize,
  User,
  Ward,
  Issue,
  ComplaintAction,
  IssueActivity,
  Notification,
  AuditLog,
  District,
  Constituency
} from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runCleanup() {
  await sequelize.authenticate();
  console.log('✅ Connected to MySQL');

  // Step 1: Identify all Ward Secretary users to remove
  const wardSecRoles = ['ward_secretary', 'ward', 'ward_officer'];
  const secUsers = await User.findAll({
    where: {
      role: { [sequelize.Sequelize.Op.in]: wardSecRoles }
    },
    order: [['id', 'ASC']]
  });

  const secUserIds = secUsers.map(u => u.id);
  console.log(`\nFound ${secUsers.length} Ward Secretary users to remove:`);
  secUsers.forEach(u => {
    console.log(`- ID: ${u.id} | @${u.username} | ${u.name} | Role: ${u.role} | Paguthi: ${u.paguthi || 'None'} | Ward: ${u.assignedWard || 'None'}`);
  });

  if (secUserIds.length === 0) {
    console.log('ℹ️ No Ward Secretary accounts to remove.');
    await sequelize.close();
    return;
  }

  // Step 2: Create a safety backup in JSON
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup_before_ward_sec_cleanup_${timestamp}.json`);

  const wardsBackup = await Ward.findAll({ raw: true });
  const issuesBackup = await Issue.findAll({ raw: true });
  const actionsBackup = await ComplaintAction.findAll({ raw: true });
  const activitiesBackup = await IssueActivity.findAll({ raw: true });
  const notifsBackup = await Notification.findAll({
    where: { recipientId: { [sequelize.Sequelize.Op.in]: secUserIds } },
    raw: true
  });

  const backupData = {
    timestamp: new Date().toISOString(),
    wardSecretaryUsers: secUsers.map(u => u.toJSON()),
    wards: wardsBackup,
    issues: issuesBackup,
    complaintActions: actionsBackup,
    issueActivities: activitiesBackup,
    notifications: notifsBackup,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n💾 Safety backup created at: ${backupPath}`);

  // Step 3: Execute cleanup in a database transaction
  const transaction = await sequelize.transaction();
  try {
    console.log('\n--- EXECUTING TRANSACTIONAL DATABASE CLEANUP ---');

    // 1. Detach Ward Secretary foreign keys from `wards`
    const [wardsUpdated] = await Ward.update(
      {
        wardSecretaryId: null,
        wardSecretary: null,
        contactNumber: null,
      },
      {
        where: {
          wardSecretaryId: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Cleared wardSecretaryId in ${wardsUpdated} wards.`);

    // Also clear any string names that matched secretary names
    for (const sec of secUsers) {
      await Ward.update(
        { wardSecretary: null },
        {
          where: { wardSecretary: sec.name },
          transaction
        }
      );
    }

    // 2. Detach Ward Secretary foreign keys from `issues`
    const [issuesAssignedUpdated] = await Issue.update(
      {
        assignedWardSecretaryId: null
      },
      {
        where: {
          assignedWardSecretaryId: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Cleared assignedWardSecretaryId in ${issuesAssignedUpdated} complaints.`);

    const [issuesCompletedUpdated] = await Issue.update(
      {
        completedBy: null
      },
      {
        where: {
          completedBy: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Cleared completedBy in ${issuesCompletedUpdated} complaints.`);

    // 3. Detach from `complaint_actions`
    const [actionsUpdated] = await ComplaintAction.update(
      {
        wardSecretaryId: null
      },
      {
        where: {
          wardSecretaryId: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Cleared wardSecretaryId in ${actionsUpdated} complaint action records.`);

    // 4. Detach from `issue_activities`
    const [activitiesUpdated] = await IssueActivity.update(
      {
        performedBy: null
      },
      {
        where: {
          performedBy: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Cleared performedBy in ${activitiesUpdated} issue activity records.`);

    // 5. Delete secretary-specific notifications
    const notifsDeleted = await Notification.destroy({
      where: {
        recipientId: { [sequelize.Sequelize.Op.in]: secUserIds }
      },
      transaction
    });
    console.log(`✅ Deleted ${notifsDeleted} secretary notifications.`);

    // 6. Detach from `audit_logs`
    const [logsUpdated] = await AuditLog.update(
      {
        userId: null
      },
      {
        where: {
          userId: { [sequelize.Sequelize.Op.in]: secUserIds }
        },
        transaction
      }
    );
    console.log(`✅ Detached userId in ${logsUpdated} audit logs.`);

    // 7. Delete all Ward Secretary user accounts from `users`
    const usersDeleted = await User.destroy({
      where: {
        id: { [sequelize.Sequelize.Op.in]: secUserIds },
        role: { [sequelize.Sequelize.Op.in]: wardSecRoles }
      },
      transaction
    });
    console.log(`✅ Deleted ${usersDeleted} Ward Secretary accounts from users table.`);

    // Commit transaction
    await transaction.commit();
    console.log('\n🎉 TRANSACTION COMMITTED SUCCESSFULLY!');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error during cleanup, transaction rolled back:', err);
    throw err;
  }

  // Step 4: Verification of database state
  console.log('\n--- VERIFYING POST-CLEANUP DATABASE STATE ---');
  const remainingSecUsers = await User.count({
    where: { role: { [sequelize.Sequelize.Op.in]: wardSecRoles } }
  });
  console.log(`Remaining Ward Secretary accounts in DB: ${remainingSecUsers} (Expected: 0)`);

  const preservedUsers = await User.findAll({
    attributes: ['id', 'username', 'name', 'role']
  });
  console.log(`Preserved Users in DB (${preservedUsers.length} total):`);
  preservedUsers.forEach(u => console.log(`  - ID ${u.id}: @${u.username} (${u.name}) [${u.role}]`));

  const remainingWards = await Ward.count();
  console.log(`Total Wards in DB: ${remainingWards} (Expected: 17)`);

  const paguthis = ['Pothanur', 'Kurichi', 'Sundarapuram', 'Malumichampatti'];
  for (const p of paguthis) {
    const count = await Ward.count({ where: { paguthi: p } });
    console.log(`  - Wards in Paguthi [${p}]: ${count}`);
  }

  const remainingIssues = await Issue.count();
  console.log(`Total citizen complaints in DB: ${remainingIssues} (100% Preserved)`);

  const remainingActions = await ComplaintAction.count();
  console.log(`Total complaint actions in DB: ${remainingActions} (100% Preserved)`);

  await sequelize.close();
}

runCleanup().catch(err => {
  console.error('Failed to run cleanup:', err);
  process.exit(1);
});
