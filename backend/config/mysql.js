import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const dbName = process.env.MYSQL_DATABASE || 'tvk';
const dbUser = process.env.MYSQL_USER || 'root';
const dbPassword = process.env.MYSQL_PASSWORD || '';
const dbHost = process.env.MYSQL_HOST || 'localhost';
const dbPort = parseInt(process.env.MYSQL_PORT || '3306', 10);

// Cloud MySQL (Aiven, TiDB) requires TLS. Set MYSQL_SSL=true to enable it.
// MYSQL_CA_CERT holds the provider's CA certificate (PEM text) when it is not
// publicly trusted, as with Aiven. Escaped "\n" sequences are turned into newlines.
const sslEnabled = process.env.MYSQL_SSL === 'true';
const caCert = (process.env.MYSQL_CA_CERT || '').replace(/\\n/g, '\n').trim();

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: sslEnabled
    ? { ssl: caCert ? { ca: caCert, rejectUnauthorized: true } : { rejectUnauthorized: true } }
    : {},
  pool: {
    max: parseInt(process.env.MYSQL_POOL_MAX || '20', 10),
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
});

export const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log(`🐬 MySQL Connected successfully: ${dbHost}:${dbPort}/${dbName}`);
    return sequelize;
  } catch (error) {
    console.error(`❌ MySQL Connection Error: ${error.message}`);
    throw error;
  }
};

export default sequelize;
