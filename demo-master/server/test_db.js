import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'interview_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

async function check() {
  const [results] = await sequelize.query('SHOW FULL TABLES;');
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}
check();
