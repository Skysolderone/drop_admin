

import application from '../core/appContext.js';
import TokenList from '../services/tokenlist.js';

// 获取所有代币
export const getAllTokens = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageIndex = Math.max(0, (parseInt(page) || 1) - 1); // 转换为从0开始的索引
    const pageSize = Math.max(1, Math.min(100, parseInt(limit) || 10));

    console.log(`Controller: page=${page}, limit=${limit}, status=${status}, search=${search}, pageIndex=${pageIndex}, pageSize=${pageSize}`);

    // 并行获取数据和总数
    const [data_list, totalCount] = await Promise.all([
      TokenList.list(pageIndex, pageSize, status, search),
      TokenList.count(status, search)
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

// 新增：保存代币（最小映射，后续可扩展字段）
export const addToken = async (req, res) => {
  try {
  const body = req.body || {};
  // 直接透传 body，让服务层做兼容映射（支持 airdropMethods 等）
  const insertId = await TokenList.adds(body);
    return application.create_response(res, { id: insertId });
  } catch (error) {
    console.error('新增代币错误:', error);
    return application.create_error_response(res, 500, '新增代币失败');
  }
};

// 编辑代币
export const updateToken = async (req, res) => {
  try {
    const body = req.body || {};
    // 兼容路径参数中的 id
    // if (!body.id && req.params?.id) {
    //   body.id = req.params.id;
    // }
    if (!body.id && !body.address && !body.tokenAddress) {
      return application.create_error_response(res, 400, '缺少 id/address');
    }
    const result = await TokenList.update(body);
    return application.create_response_ok(res);
  } catch (error) {
    console.error('编辑代币错误:', error);
    return application.create_error_response(res, 500, '编辑代币失败');
  }
};

// 获取某 token 的多语言原因（用于编辑态回填）
export const getTokenLans = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return application.create_error_response(res, 400, '缺少 id');
    const mapping = await TokenList.lansByKey(id);
    return application.create_response(res, { id, lans: mapping });
  } catch (error) {
    console.error('获取 token 语言原因错误:', error);
    return application.create_error_response(res, 500, '获取 token 语言原因失败');
  }
};

// 获取 token 详情（含 airdrop 方法聚合）
export const getTokenDetail = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return application.create_error_response(res, 400, '缺少 id');
    const detail = await TokenList.detail(id);
    if (!detail) return application.create_error_response(res, 404, '未找到 token');
    return application.create_response(res, detail);
  } catch (error) {
    console.error('获取 token 详情错误:', error);
    return application.create_error_response(res, 500, '获取 token 详情失败');
  }
};

// 根据token地址获取价格
export const getTokenPrice = async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) return application.create_error_response(res, 400, '缺少token地址');
    
    const price = await TokenList.getPriceByAddress(address);
    return application.create_response(res, { address, price });
  } catch (error) {
    console.error('获取token价格错误:', error);
    return application.create_error_response(res, 500, '获取token价格失败');
  }
};

// 软删除token
export const softDeleteToken = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return application.create_error_response(res, 400, '缺少token ID');
    
    const success = await TokenList.softDelete(id);
    if (success) {
      return application.create_response_ok(res);
    } else {
      return application.create_error_response(res, 404, '未找到要删除的token');
    }
  } catch (error) {
    console.error('软删除token错误:', error);
    return application.create_error_response(res, 500, '删除token失败');
  }
};


