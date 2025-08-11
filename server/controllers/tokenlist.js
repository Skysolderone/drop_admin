

import application from '../core/appContext.js';
import TokenList from '../services/tokenlist.js';

// 获取所有代币
export const getAllTokens = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageIndex = Math.max(0, (parseInt(page) || 1) - 1); // 转换为从0开始的索引
    const pageSize = Math.max(1, Math.min(100, parseInt(limit) || 10));

    console.log(`Controller: page=${page}, limit=${limit}, pageIndex=${pageIndex}, pageSize=${pageSize}`);

    // 并行获取数据和总数
    const [data_list, totalCount] = await Promise.all([
      TokenList.list(pageIndex, pageSize),
      TokenList.count()
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

