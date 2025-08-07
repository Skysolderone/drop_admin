import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';

// 代币创建验证规则
export const tokenValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('代币名称长度必须在1-100个字符之间'),
  body('symbol')
    .isLength({ min: 1, max: 20 })
    .withMessage('代币符号长度必须在1-20个字符之间')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('代币符号只能包含大写字母和数字'),
  body('contract_address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('无效的合约地址格式'),
  body('decimals')
    .isInt({ min: 0, max: 18 })
    .withMessage('小数位数必须在0-18之间'),
  body('total_supply')
    .isInt({ min: 1 })
    .withMessage('总供应量必须大于0')
];

// 获取所有代币
export const getAllTokens = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    // 构建查询条件
    const conditions = [];
    if (status && ['active', 'inactive', 'pending'].includes(status)) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(t.name LIKE ? OR t.symbol LIKE ? OR t.contract_address LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取代币列表
    const tokens = await query(`
      SELECT 
        t.*,
        u.username as created_by_username
      FROM tokens t
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // 获取总数
    const totalResult = await query(`
      SELECT COUNT(*) as total
      FROM tokens t
      ${whereClause}
    `, params);

    const total = totalResult[0].total;

    res.json({
      success: true,
      data: {
        tokens,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取代币列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 根据ID获取代币详情
export const getTokenById = async (req, res) => {
  try {
    const { id } = req.params;

    const tokens = await query(`
      SELECT 
        t.*,
        u.username as created_by_username
      FROM tokens t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `, [id]);

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: '代币不存在'
      });
    }

    res.json({
      success: true,
      data: { token: tokens[0] }
    });

  } catch (error) {
    console.error('获取代币详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 创建新代币
export const createToken = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { name, symbol, contract_address, decimals, total_supply, price, market_cap, volume_24h } = req.body;

    // 检查合约地址是否已存在
    const existingToken = await query(
      'SELECT id FROM tokens WHERE contract_address = ?',
      [contract_address]
    );

    if (existingToken.length > 0) {
      return res.status(400).json({
        success: false,
        message: '合约地址已存在'
      });
    }

    // 创建代币
    const result = await query(`
      INSERT INTO tokens 
      (name, symbol, contract_address, decimals, total_supply, price, market_cap, volume_24h, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      symbol, 
      contract_address, 
      decimals || 18, 
      total_supply,
      price || 0,
      market_cap || 0,
      volume_24h || 0,
      req.user.id
    ]);

    // 获取新创建的代币信息
    const newToken = await query(
      'SELECT * FROM tokens WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '代币创建成功',
      data: { token: newToken[0] }
    });

  } catch (error) {
    console.error('创建代币错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 更新代币信息
export const updateToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol, decimals, total_supply, price, market_cap, volume_24h, status } = req.body;

    // 检查代币是否存在
    const existingToken = await query('SELECT * FROM tokens WHERE id = ?', [id]);
    if (existingToken.length === 0) {
      return res.status(404).json({
        success: false,
        message: '代币不存在'
      });
    }

    // 构建更新字段
    const updateFields = [];
    const params = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (symbol !== undefined) {
      updateFields.push('symbol = ?');
      params.push(symbol);
    }
    if (decimals !== undefined) {
      updateFields.push('decimals = ?');
      params.push(decimals);
    }
    if (total_supply !== undefined) {
      updateFields.push('total_supply = ?');
      params.push(total_supply);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      params.push(price);
    }
    if (market_cap !== undefined) {
      updateFields.push('market_cap = ?');
      params.push(market_cap);
    }
    if (volume_24h !== undefined) {
      updateFields.push('volume_24h = ?');
      params.push(volume_24h);
    }
    if (status !== undefined && ['active', 'inactive', 'pending'].includes(status)) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
    }

    params.push(id);

    // 执行更新
    await query(`
      UPDATE tokens 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    // 获取更新后的代币信息
    const updatedToken = await query('SELECT * FROM tokens WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '代币更新成功',
      data: { token: updatedToken[0] }
    });

  } catch (error) {
    console.error('更新代币错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 删除代币
export const deleteToken = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查代币是否存在
    const existingToken = await query('SELECT * FROM tokens WHERE id = ?', [id]);
    if (existingToken.length === 0) {
      return res.status(404).json({
        success: false,
        message: '代币不存在'
      });
    }

    // 删除代币
    await query('DELETE FROM tokens WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '代币删除成功'
    });

  } catch (error) {
    console.error('删除代币错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
