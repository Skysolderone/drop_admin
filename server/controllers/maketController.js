/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 17:45:13
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-07 18:40:58
 * @FilePath: \drop_admin\server\controllers\maketController.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AEtrun
 */

import application from '../core/appContext.js';
import MarketDao from '../services/marketDao.js';

// 获取所有代币
export const getAllTokens = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageIndex = Math.max(0, (parseInt(page) || 1) - 1); // 转换为从0开始的索引
    const pageSize = Math.max(1, Math.min(100, parseInt(limit) || 10));

    console.log(`Controller: page=${page}, limit=${limit}, pageIndex=${pageIndex}, pageSize=${pageSize}`);

    // 并行获取数据和总数
    const [data_list, totalCount] = await Promise.all([
      MarketDao.list(pageIndex, pageSize),
      MarketDao.count()
    ]);
    
    return application.create_response(res, {
        tokens: data_list,
        page: parseInt(page),
        limit: pageSize,
        total: totalCount
      });
  } catch (error) {
    console.error('获取代币列表错误:', error);
    return application.create_error_response(res, 500, '获取代币列表失败');
  }
};

