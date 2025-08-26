/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 17:43:32
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-22 14:17:26
 * @FilePath: \drop_admin\server\config\database.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drop_admin',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
};

// 执行查询
export const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
};

// 初始化数据库表
export const initDatabase = async () => {
  try {
    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error);
    throw error;
  }
};

export default pool;
