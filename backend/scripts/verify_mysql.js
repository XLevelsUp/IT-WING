import sequelize from '../config/mysql.js';

async function verifyMySQL() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to MySQL authenticated successfully.');

    // 1. Database version and connection details
    const [versionResult] = await sequelize.query('SELECT VERSION() as version, DATABASE() as current_db;');
    console.log('Database Info:', versionResult[0]);

    // 2. Query all tables in the tvk database
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, CREATE_TIME 
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA = 'tvk' 
      ORDER BY TABLE_NAME;
    `);

    console.log(`\nFound ${tables.length} tables in MySQL database 'tvk':`);
    const tableNames = tables.map(t => t.TABLE_NAME);
    console.log(tableNames);

    // 3. Count exact records in every table
    console.log('\n=== EXACT RECORD COUNTS PER TABLE ===');
    const tableCounts = {};
    for (const tableName of tableNames) {
      const [countResult] = await sequelize.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\`;`);
      tableCounts[tableName] = countResult[0].cnt;
      console.log(`  - ${tableName}: ${countResult[0].cnt} rows`);
    }

    // 4. Query foreign keys and constraints
    console.log('\n=== FOREIGN KEY CONSTRAINTS ===');
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'tvk' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME;
    `);

    console.log(`Found ${foreignKeys.length} foreign key relationships:`);
    foreignKeys.forEach(fk => {
      console.log(`  - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
    });

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during MySQL verification:', error);
    process.exit(1);
  }
}

verifyMySQL();
