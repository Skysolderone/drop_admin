/*
 * @Author: wws
 * @Date: 2025-11-11
 * @LastEditors: wws
 * @LastEditTime: 2025-11-11
 * @FilePath: \drop_admin\server\config\redis.js
 * @Description: Redis configuration and connection
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true, // 启用离线队列，允许在连接未就绪时排队请求
  connectTimeout: 10000, // 10秒连接超时
  lazyConnect: false // 立即连接
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  console.error('Redis error details:', err);
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

redisClient.on('close', () => {
  console.log('📤 Redis connection closed');
});

/**
 * Test Redis connection
 */
export const testRedisConnection = async () => {
  try {
    // Wait for connection to be ready or timeout after 5 seconds
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
    });

    const pingPromise = redisClient.ping();
    await Promise.race([pingPromise, timeout]);

    console.log('✅ Redis connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    // 不抛出异常，允许服务器继续启动
    return false;
  }
};

export default redisClient;
