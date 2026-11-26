import { sequelize, syncDatabase } from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    const dbName = process.env.MYSQL_DATABASE || 'tvk';
    const dbHost = process.env.MYSQL_HOST || 'localhost';
    const dbPort = process.env.MYSQL_PORT || '3306';
    console.log(`🐬 MySQL Connected successfully: ${dbHost}:${dbPort}/${dbName}`);
    await syncDatabase();
    return sequelize;
  } catch (error) {
    console.error(`❌ MySQL Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('🐬 MySQL Connection closed.');
  } catch (err) {
    console.error('Error closing MySQL:', err.message);
  }
};

export default { connectDB, closeDB };
