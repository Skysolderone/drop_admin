/*
 * @Author: wws
 * @Date: 2025-11-11
 * @LastEditors: wws
 * @LastEditTime: 2025-11-11
 * @FilePath: \drop_admin\server\controllers\reload.js
 * @Description: Node status management and config center version control APIs
 */

import application from '../core/appContext.js';
import { publishToTopic } from '../services/redisTopicService.js';
import redisClient from '../config/redis.js';
import axios from 'axios';

// Redis key prefix for node status
const NODE_STATUS_KEY_PREFIX = 'node:status:';
// Redis key for latest broadcast timestamp
const LATEST_BROADCAST_TIMESTAMP_KEY = 'reload:latest_broadcast_timestamp';
// Redis key prefix for tracking nodes that should report for a broadcast
const BROADCAST_EXPECTED_NODES_KEY_PREFIX = 'reload:broadcast:expected:';

// Store config center version information
let configCenterVersion = {
  version: '1.0.0',
  updateTime: new Date().toISOString(),
  description: 'Initial version'
};

/**
 * Check if Redis is connected and ready
 */
const isRedisReady = () => {
  const status = redisClient.status;
  // 'ready' means connected and ready, 'connecting' means still connecting
  return status === 'ready' || status === 'connect';
};

/**
 * Get node status from Redis
 */
const getNodeStatus = async (nodeId) => {
  try {
    // Check Redis connection status
    if (!isRedisReady()) {
      console.warn(`Redis not ready, cannot get node status for ${nodeId}`);
      return null;
    }

    const key = `${NODE_STATUS_KEY_PREFIX}${nodeId}`;
    const value = await redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  } catch (error) {
    console.error(`Error getting node status for ${nodeId}:`, error.message);
    console.error('Redis get error details:', error);
    return null;
  }
};

/**
 * Save node status to Redis (no expiration)
 */
const saveNodeStatus = async (nodeId, nodeStatus) => {
  try {
    // Check Redis connection status
    if (!isRedisReady()) {
      console.warn(`Redis not ready, cannot save node status for ${nodeId}`);
      return false;
    }

    const key = `${NODE_STATUS_KEY_PREFIX}${nodeId}`;
    const statusStr = JSON.stringify(nodeStatus);
    await redisClient.set(key, statusStr);
    console.log(`Node status saved to Redis: ${key}`);
    return true;
  } catch (error) {
    console.error(`Error saving node status for ${nodeId}:`, error.message);
    console.error('Redis error details:', error);
    // 不抛出异常，返回 false 让调用者处理
    return false;
  }
};

/**
 * Get latest node status by IP
 */
const getLatestNodeStatusByIp = async (ip) => {
  try {
    // Check Redis connection status
    if (!isRedisReady()) {
      console.warn(`Redis not ready, cannot get node status for ip=${ip}`);
      return null;
    }

    const pattern = `${NODE_STATUS_KEY_PREFIX}${ip}_*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      return null;
    }

    // 找到时间戳最大的 key（最新的记录）
    let latestKey = null;
    let latestTimestamp = 0;

    for (const key of keys) {
      // 从 key 中提取时间戳: node:status:ip_timestamp
      const keyPart = key.replace(NODE_STATUS_KEY_PREFIX, '');
      const parts = keyPart.split('_');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[parts.length - 1]);
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          latestKey = key;
        }
      }
    }

    if (!latestKey) {
      return null;
    }

    const value = await redisClient.get(latestKey);
    if (!value) {
      return null;
    }

    const nodeStatus = JSON.parse(value);
    nodeStatus._redisKey = latestKey; // 保存 key 以便后续删除
    return nodeStatus;
  } catch (error) {
    console.error(`Error getting latest node status for ip=${ip}:`, error.message);
    console.error('Redis get error details:', error);
    return null;
  }
};

/**
 * Delete node status from Redis by key
 */
const deleteNodeStatus = async (key) => {
  try {
    if (!isRedisReady()) {
      console.warn(`Redis not ready, cannot delete node status for key=${key}`);
      return false;
    }

    await redisClient.del(key);
    console.log(`Node status deleted from Redis: ${key}`);
    return true;
  } catch (error) {
    console.error(`Error deleting node status for key=${key}:`, error.message);
    return false;
  }
};

/**
 * Get all node statuses from Redis
 */
const getAllNodeStatuses = async () => {
  try {
    const pattern = `${NODE_STATUS_KEY_PREFIX}*`;
    const keys = await redisClient.keys(pattern);
    const nodes = [];

    for (const key of keys) {
      const value = await redisClient.get(key);
      if (value) {
        try {
          nodes.push(JSON.parse(value));
        } catch (parseError) {
          console.error(`Error parsing node status for ${key}:`, parseError.message);
        }
      }
    }

    return nodes;
  } catch (error) {
    console.error('Error getting all node statuses:', error.message);
    return [];
  }
};

/**
 * Get node status by IP (using IP as key)
 */
const getNodeStatusByIp = async (ip) => {
  try {
    // Check Redis connection status
    if (!isRedisReady()) {
      console.warn(`Redis not ready, cannot get node status for ip=${ip}`);
      return null;
    }

    // 处理 IP 地址，确保与保存时的 key 格式一致
    const redisKey = ip.replace(/[^a-zA-Z0-9_-]/g, '_');
    const key = `${NODE_STATUS_KEY_PREFIX}${redisKey}`;
    const value = await redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  } catch (error) {
    console.error(`Error getting node status for ip=${ip}:`, error.message);
    console.error('Redis get error details:', error);
    return null;
  }
};

/**
 * 1. Node report status API
 * POST /api/reload/node/report-status
 * Body: { ip, timestamp, node_type, status, app_id, game_name }
 * - ip: 节点IP地址（必需）
 * - timestamp: 时间戳（可选，默认当前时间）
 * - node_type: 节点类型（可选，默认 'reload_subscriber'）
 * - status: 状态（可选，默认 'active'）
 * - app_id: 应用ID（可选，从环境变量 APP_ID 获取，默认 'unknown'）
 * - game_name: 游戏名称（可选，从环境变量 GAME_NAME 获取，默认 'drop'）
 */
export const reportNodeStatus = async (req, res) => {
  try {
    // 构建上报数据
    const { ip, timestamp, node_type, status, app_id, game_name } = req.body;

    // Parameter validation - 至少需要 ip
    if (!ip) {
      return application.create_error_response(res, 400, 'Missing required parameter: ip');
    }

    // 检查是否已经有对应 IP 的记录
    const existingNodeStatus = await getNodeStatusByIp(ip);
    const isNewNode = !existingNodeStatus;

    // 从环境变量或请求中获取配置，如果没有则使用默认值
    const appId = app_id || process.env.APP_ID || 'unknown';
    const gameName = game_name || process.env.GAME_NAME || 'drop';
    const nodeType = node_type || 'reload_subscriber';
    const nodeStatus = status || 'active';
    const reportTimestamp = timestamp || Date.now();

    // 使用 IP 作为 Redis key（不使用时间戳）
    const redisKey = ip.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 构建上报数据
    const reportData = {
      ip,
      timestamp: reportTimestamp,
      node_type: nodeType,
      status: nodeStatus,
      app_id: appId,
      game_name: gameName,
      lastReportTime: new Date().toISOString()
    };

    // Save to Redis (no expiration) - 使用 ip 作为 key，如果已存在则更新
    const saved = await saveNodeStatus(redisKey, reportData);

    if (!saved) {
      console.warn(`Warning: Failed to save node status to Redis for key=${redisKey}, but continuing...`);
      // 即使 Redis 保存失败，也返回成功，因为节点状态已经接收到了
    }

    const action = isNewNode ? 'created' : 'updated';
    console.log(`Node status ${action}: key=${redisKey}, ip=${ip}, timestamp=${reportTimestamp}, app_id=${appId}, game_name=${gameName}, status=${nodeStatus}`);

    return application.create_response(res, {
      success: true,
      message: `Node status ${action} successfully`,
      data: reportData
    });
  } catch (error) {
    console.error('Node status report error:', error);
    console.error('Error stack:', error.stack);
    return application.create_error_response(res, 500, `Failed to report node status: ${error.message}`);
  }
};

/**
 * 2. Get config center version API
 * GET /api/reload/config/version
 */
export const getConfigVersion = async (req, res) => {
  try {
    console.log('Getting config center version');

    return application.create_response(res, {
      success: true,
      data: configCenterVersion
    });
  } catch (error) {
    console.error('Get config version error:', error);
    return application.create_error_response(res, 500, 'Failed to get config version');
  }
};

/**
 * 3. Node report refresh result API
 * POST /api/reload/node/report-update
 * Body: { ip, timestamp, node_type, status, action, success, app_id, game_name, error_message }
 */
export const reportNodeUpdate = async (req, res) => {
  try {
    // 构建刷新结果上报数据
    const { ip, timestamp, node_type, status, action, success, app_id, game_name, error_message } = req.body;

    // Parameter validation - 至少需要 ip、success 和 timestamp
    if (!ip || success === undefined) {
      return application.create_error_response(res, 400, 'Missing required parameters: ip, success');
    }

    // timestamp 是必需的，必须与广播消息的时间戳一致
    if (!timestamp) {
      return application.create_error_response(res, 400, 'Missing required parameter: timestamp (must match broadcast message timestamp)');
    }

    // 验证时间戳是否与最新的广播消息时间戳一致
    let latestBroadcastTimestamp = null;
    try {
      if (isRedisReady()) {
        const storedTimestamp = await redisClient.get(LATEST_BROADCAST_TIMESTAMP_KEY);
        if (storedTimestamp) {
          latestBroadcastTimestamp = parseInt(storedTimestamp);
        }
      }
    } catch (redisError) {
      console.warn(`Warning: Failed to get latest broadcast timestamp: ${redisError.message}`);
    }

    // 如果找到了最新的广播时间戳，验证是否一致
    if (latestBroadcastTimestamp !== null && parseInt(timestamp) !== latestBroadcastTimestamp) {
      console.warn(`Warning: Node timestamp (${timestamp}) does not match latest broadcast timestamp (${latestBroadcastTimestamp})`);
      // 不拒绝请求，但记录警告，允许节点上报（可能是延迟上报）
    }

    // 从环境变量或请求中获取配置，如果没有则使用默认值
    const appId = app_id || process.env.APP_ID || 'unknown';
    const gameName = game_name || process.env.GAME_NAME || 'drop';
    const nodeType = node_type || 'reload_subscriber';
    const nodeStatus = status || (success ? 'reload_success' : 'reload_failed');
    const reportTimestamp = parseInt(timestamp); // 确保是数字类型
    const actionType = action || 'config_reload';

    // 根据 IP 查找节点状态（使用 IP 作为 key）
    let existingNodeStatus = await getNodeStatusByIp(ip);

    // 如果节点不存在，自动创建节点记录
    if (!existingNodeStatus) {
      console.log(`Node not found for ip=${ip}, creating new node record from refresh result`);
      // 创建初始节点状态
      existingNodeStatus = {
        ip,
        timestamp: reportTimestamp,
        node_type: nodeType,
        status: 'active',
        app_id: appId,
        game_name: gameName,
        lastReportTime: new Date().toISOString()
      };
    }

    // 构建刷新结果数据，保留原有数据并更新时间戳
    const refreshResult = {
      ip,
      timestamp: reportTimestamp, // 更新为广播消息的时间戳
      node_type: nodeType,
      status: nodeStatus,
      action: actionType,
      success: success,
      app_id: appId,
      game_name: gameName,
      lastReportTime: new Date().toISOString()
    };

    // 如果失败，添加错误信息
    if (!success && error_message) {
      refreshResult.error_message = error_message;
    }

    // 使用 IP 作为 Redis key（不使用时间戳）
    const redisKey = ip.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 更新节点状态（无论成功或失败都更新，成功时更新时间戳）
    const saved = await saveNodeStatus(redisKey, refreshResult);

    if (!saved) {
      console.warn(`Warning: Failed to save refresh result to Redis for ip=${ip}`);
    } else {
      const oldTimestamp = existingNodeStatus.timestamp;
      if (success) {
        console.log(`✅ Node refresh result (success): ip=${ip}, timestamp updated from ${oldTimestamp} to ${reportTimestamp}, action=${actionType}`);
      } else {
        console.log(`❌ Node refresh result (failed): ip=${ip}, timestamp=${reportTimestamp}, action=${actionType}, error=${error_message || 'unknown'}`);
      }

      // 记录节点已上报，从预期节点列表中移除（如果存在）
      try {
        if (isRedisReady()) {
          const expectedNodesKey = `${BROADCAST_EXPECTED_NODES_KEY_PREFIX}${reportTimestamp}`;
          const expectedDataStr = await redisClient.get(expectedNodesKey);
          if (expectedDataStr) {
            const expectedData = JSON.parse(expectedDataStr);
            const remainingNodes = expectedData.expectedNodes.filter(nodeIp => nodeIp !== ip);

            if (remainingNodes.length < expectedData.expectedNodes.length) {
              // 更新剩余节点列表
              expectedData.expectedNodes = remainingNodes;
              expectedData.reportedNodes = expectedData.reportedNodes || [];
              expectedData.reportedNodes.push({
                ip,
                success,
                reportTime: new Date().toISOString()
              });

              await redisClient.setex(expectedNodesKey, 300, JSON.stringify(expectedData));
              console.log(`📝 Node ${ip} reported for broadcast ${reportTimestamp}, ${remainingNodes.length} nodes remaining`);

              // 如果所有节点都已上报，记录日志
              if (remainingNodes.length === 0) {
                console.log(`✅ All nodes reported for broadcast ${reportTimestamp}`);
              } else {
                // 记录还有哪些节点未上报
                console.log(`⏳ Waiting for nodes to report: ${remainingNodes.join(', ')}`);
              }
            }
          }
        }
      } catch (trackError) {
        console.warn(`Warning: Failed to track node report: ${trackError.message}`);
      }
    }

    return application.create_response(res, {
      success: true,
      message: 'Node refresh result reported successfully',
      data: refreshResult
    });
  } catch (error) {
    console.error('Node refresh result report error:', error);
    console.error('Error stack:', error.stack);
    return application.create_error_response(res, 500, `Failed to report node refresh result: ${error.message}`);
  }
};

/**
 * Helper API: Get all nodes (for admin dashboard)
 * GET /api/reload/node/list
 */
export const getAllNodes = async (req, res) => {
  try {
    const nodes = await getAllNodeStatuses();

    return application.create_response(res, {
      success: true,
      total: nodes.length,
      data: nodes
    });
  } catch (error) {
    console.error('Get node list error:', error);
    return application.create_error_response(res, 500, 'Failed to get node list');
  }
};

/**
 * Helper API: Get broadcast report status
 * GET /api/reload/broadcast/status?timestamp=xxx
 * Query: timestamp - 广播时间戳（可选，默认使用最新的广播时间戳）
 */
export const getBroadcastStatus = async (req, res) => {
  try {
    let timestamp = req.query.timestamp;

    // 如果没有提供时间戳，使用最新的广播时间戳
    if (!timestamp) {
      try {
        if (isRedisReady()) {
          const storedTimestamp = await redisClient.get(LATEST_BROADCAST_TIMESTAMP_KEY);
          if (storedTimestamp) {
            timestamp = storedTimestamp;
          }
        }
      } catch (error) {
        console.warn(`Warning: Failed to get latest broadcast timestamp: ${error.message}`);
      }
    }

    if (!timestamp) {
      return application.create_error_response(res, 400, 'No broadcast timestamp found. Please provide timestamp parameter or trigger a broadcast first.');
    }

    const expectedNodesKey = `${BROADCAST_EXPECTED_NODES_KEY_PREFIX}${timestamp}`;
    const expectedDataStr = await redisClient.get(expectedNodesKey);

    if (!expectedDataStr) {
      return application.create_response(res, {
        success: true,
        message: 'Broadcast status not found (may have expired)',
        data: {
          timestamp: parseInt(timestamp),
          found: false
        }
      });
    }

    const expectedData = JSON.parse(expectedDataStr);
    const reportedIps = (expectedData.reportedNodes || []).map(n => n.ip);
    const missingNodes = expectedData.expectedNodes.filter(ip => !reportedIps.includes(ip));

    return application.create_response(res, {
      success: true,
      data: {
        timestamp: parseInt(timestamp),
        broadcastTime: expectedData.broadcastTime,
        expectedNodes: expectedData.expectedNodes,
        expectedCount: expectedData.expectedNodes.length,
        reportedNodes: expectedData.reportedNodes || [],
        reportedCount: (expectedData.reportedNodes || []).length,
        missingNodes: missingNodes,
        missingCount: missingNodes.length,
        allReported: missingNodes.length === 0
      }
    });
  } catch (error) {
    console.error('Get broadcast status error:', error);
    return application.create_error_response(res, 500, `Failed to get broadcast status: ${error.message}`);
  }
};

/**
 * Helper API: Update config center version (for admin)
 * POST /api/reload/config/update-version
 * Body: { version, description }
 */
export const updateConfigVersion = async (req, res) => {
  try {
    const { version, description } = req.body;

    if (!version) {
      return application.create_error_response(res, 400, 'Missing required parameter: version');
    }

    configCenterVersion = {
      version,
      updateTime: new Date().toISOString(),
      description: description || ''
    };

    console.log(`Config center version updated: version=${version}`);

    return application.create_response(res, {
      success: true,
      message: 'Config center version updated successfully',
      data: configCenterVersion
    });
  } catch (error) {
    console.error('Update config version error:', error);
    return application.create_error_response(res, 500, 'Failed to update config version');
  }
};

/**
 * Broadcast reload message to Redis topic
 * GET /v1/app/reload
 * Message format: timestamp + "reload"
 */
export const broadcastReloadMessage = async (req, res) => {
  try {
    const timestamp = Date.now();

    // 获取所有应该收到消息的active节点
    let expectedNodes = [];
    try {
      if (isRedisReady()) {
        const allNodes = await getAllNodeStatuses();
        // 筛选出状态为 active 的节点
        expectedNodes = allNodes
          .filter(node => node.status === 'active' || !node.status || node.status === 'reload_success')
          .map(node => node.ip);

        // 记录这次广播应该收到消息的节点列表
        const expectedNodesKey = `${BROADCAST_EXPECTED_NODES_KEY_PREFIX}${timestamp}`;
        await redisClient.setex(expectedNodesKey, 300, JSON.stringify({
          timestamp,
          expectedNodes,
          broadcastTime: new Date().toISOString()
        }));
        console.log(`📋 Recorded expected nodes for reload ${timestamp}: ${expectedNodes.length} nodes - ${expectedNodes.join(', ')}`);
      }
    } catch (recordError) {
      console.warn(`Warning: Failed to record expected nodes: ${recordError.message}`);
    }

    // 如果没有节点，直接返回
    if (expectedNodes.length === 0) {
      return application.create_response(res, {
        code: 200,
        success: true,
        message: '没有可用的节点',
        data: {
          timestamp,
          expectedNodesCount: 0,
          successNodes: [],
          failedNodes: []
        }
      });
    }

    // 保存最新的广播时间戳到 Redis，用于验证节点上报的时间戳
    try {
      if (isRedisReady()) {
        await redisClient.set(LATEST_BROADCAST_TIMESTAMP_KEY, timestamp.toString());
        console.log(`Latest reload timestamp saved: ${timestamp}`);
      }
    } catch (redisError) {
      console.warn(`Warning: Failed to save reload timestamp to Redis: ${redisError.message}`);
    }

    // 向每个节点发送 HTTP GET 请求
    const successNodes = [];
    const failedNodes = [];
    const requestPromises = expectedNodes.map(async (ip) => {
      try {
        const url = `http://${ip}/v1/app/reload`;
        console.log(`🔄 Sending reload request to ${url}`);

        // 发送GET请求，设置5秒超时
        const response = await axios.get(url, {
          timeout: 5000,
          validateStatus: (status) => status >= 200 && status < 500 // 接受200-499的状态码
        });

        if (response.status >= 200 && response.status < 300) {
          successNodes.push({
            ip,
            status: response.status,
            message: '请求成功'
          });
          console.log(`✅ Reload request successful: ${ip} (status: ${response.status})`);
        } else {
          failedNodes.push({
            ip,
            status: response.status,
            error: `HTTP ${response.status}`,
            message: response.data?.message || '请求失败'
          });
          console.log(`❌ Reload request failed: ${ip} (status: ${response.status})`);
        }
      } catch (error) {
        const errorMessage = error.code === 'ECONNREFUSED'
          ? '连接被拒绝'
          : error.code === 'ETIMEDOUT'
          ? '请求超时'
          : error.message;

        failedNodes.push({
          ip,
          error: error.code || 'UNKNOWN',
          message: errorMessage
        });
        console.log(`❌ Reload request error: ${ip} - ${errorMessage}`);
      }
    });

    // 等待所有请求完成
    await Promise.all(requestPromises);

    const allSuccess = failedNodes.length === 0;
    console.log(`📤 Reload requests completed: ${successNodes.length} succeeded, ${failedNodes.length} failed`);

    return application.create_response(res, {
      code: 200,
      success: allSuccess,
      message: allSuccess ? 'Reload请求全部发送成功' : `部分节点Reload失败 (${successNodes.length}/${expectedNodes.length})`,
      data: {
        timestamp,
        expectedNodesCount: expectedNodes.length,
        successCount: successNodes.length,
        failedCount: failedNodes.length,
        successNodes,
        failedNodes
      }
    });
  } catch (error) {
    console.error('Broadcast reload message error:', error);
    return application.create_error_response(res, 500, `Reload请求发送失败: ${error.message}`);
  }
};
