import { seedMySQLDatabase } from './seedMySQL.js';

export const seedDatabase = seedMySQLDatabase;

if (process.argv[1]?.includes('seedData.js')) {
  seedMySQLDatabase()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

export default seedMySQLDatabase;
