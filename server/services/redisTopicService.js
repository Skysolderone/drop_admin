/*
 * @Author: wws
 * @Date: 2025-11-11
 * @LastEditors: wws
 * @LastEditTime: 2025-11-11
 * @FilePath: \drop_admin\server\services\redisTopicService.js
 * @Description: Redis topic initialization and management service
 */

import redisClient from '../config/redis.js';

// Define default topics
const DEFAULT_TOPICS = [
  {
    key: 'node:status:updates',
    description: 'Node status update topic',
    initialValue: JSON.stringify({ initialized: true, timestamp: new Date().toISOString() })
  },
  // {
  //   key: 'config:version:updates',
  //   description: 'Config version update topic',
  //   initialValue: JSON.stringify({ initialized: true, timestamp: new Date().toISOString() })
  // },
  // {
  //   key: 'node:update:status',
  //   description: 'Node update status topic',
  //   initialValue: JSON.stringify({ initialized: true, timestamp: new Date().toISOString() })
  // }
];

/**
 * Check if a topic exists in Redis
 */
const topicExists = async (topicKey) => {
  try {
    const exists = await redisClient.exists(topicKey);
    return exists === 1;
  } catch (error) {
    console.error(`Error checking topic ${topicKey}:`, error.message);
    return false;
  }
};

/**
 * Initialize a single topic
 */
const initializeTopic = async (topic) => {
  try {
    const exists = await topicExists(topic.key);

    if (!exists) {
      await redisClient.set(topic.key, topic.initialValue);
      console.log(`✅ Initialized topic: ${topic.key} - ${topic.description}`);
      return true;
    } else {
      console.log(`ℹ️  Topic already exists: ${topic.key}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to initialize topic ${topic.key}:`, error.message);
    throw error;
  }
};

/**
 * Initialize all default topics
 */
export const initializeRedisTopics = async () => {
  console.log('🔄 Checking and initializing Redis topics...');

  try {
    let initializedCount = 0;
    let existingCount = 0;

    for (const topic of DEFAULT_TOPICS) {
      const initialized = await initializeTopic(topic);
      if (initialized) {
        initializedCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`✅ Redis topics initialization complete:`);
    console.log(`   - Newly initialized: ${initializedCount}`);
    console.log(`   - Already existing: ${existingCount}`);
    console.log(`   - Total topics: ${DEFAULT_TOPICS.length}`);

    return true;
  } catch (error) {
    console.error('❌ Redis topics initialization failed:', error.message);
    throw error;
  }
};

/**
 * Publish message to a topic (broadcast to all subscribers)
 * Also updates the topic's stored value for later retrieval
 */
export const publishToTopic = async (topicKey, message) => {
  try {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    // Broadcast message to all subscribers
    await redisClient.publish(topicKey, messageStr);

    // Also update the stored value (for nodes that query the current state)
    await redisClient.set(topicKey, messageStr);

    console.log(`📤 Published to topic ${topicKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish to topic ${topicKey}:`, error.message);
    return false;
  }
};

/**
 * Get topic value
 */
export const getTopicValue = async (topicKey) => {
  try {
    const value = await redisClient.get(topicKey);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`❌ Failed to get topic ${topicKey}:`, error.message);
    return null;
  }
};

/**
 * Set topic value
 */
export const setTopicValue = async (topicKey, value) => {
  try {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.set(topicKey, valueStr);
    console.log(`✅ Updated topic ${topicKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set topic ${topicKey}:`, error.message);
    return false;
  }
};

/**
 * List all topics
 */
export const listAllTopics = async () => {
  try {
    const topics = [];
    for (const topic of DEFAULT_TOPICS) {
      const exists = await topicExists(topic.key);
      const value = exists ? await getTopicValue(topic.key) : null;
      topics.push({
        key: topic.key,
        description: topic.description,
        exists,
        value
      });
    }
    return topics;
  } catch (error) {
    console.error('❌ Failed to list topics:', error.message);
    return [];
  }
};

export default {
  initializeRedisTopics,
  publishToTopic,
  getTopicValue,
  setTopicValue,
  listAllTopics
};
