import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 获取Popup列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];

    if (status && status !== 'all') {
      whereClause = ' WHERE effective = ?';
      params.push(status === 'active' ? 1 : 2);
    }

    if (search) {
      whereClause += (whereClause ? ' AND' : ' WHERE');
      whereClause += ' (name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam);
    }

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM t_home_popup${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取数据
    const [popups] = await pool.query(
      `SELECT * FROM t_home_popup${whereClause} ORDER BY sort ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // 格式化返回数据
    const formattedPopups = popups.map(popup => ({
      id: popup.id,
      popupName: popup.name,
      image: popup.img,
      priority: popup.sort,
      jumpType: popup.jump_type,
      jump_nei: popup.jump_nei, // 添加jump_nei字段
      jumpUrl: popup.jump_link,
      isActive: popup.effective,
      allowDevices: popup.devuces,
      createTime: popup.create_at,
      updateTime: popup.update_at,
    }));

    res.json({
      code: 200,
      message: 'Success',
      data: {
        popups: formattedPopups,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('获取Popup列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取Popup列表失败',
      error: error.message,
    });
  }
});

// 获取单个Popup详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [popups] = await pool.query(
      'SELECT * FROM t_home_popup WHERE id = ?',
      [id]
    );

    if (popups.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Popup not found',
      });
    }

    const popup = popups[0];

    // 格式化返回数据
    const formattedPopup = {
      id: popup.id,
      popupName: popup.name,
      image: popup.img,
      priority: popup.sort,
      jumpType: popup.jump_type,
      jump_nei: popup.jump_nei, // 添加jump_nei字段
      jumpUrl: popup.jump_link,
      isActive: popup.effective,
      allowDevices: popup.devuces,
      createTime: popup.create_at,
      updateTime: popup.update_at,
    };

    res.json({
      code: 200,
      message: 'Success',
      data: formattedPopup,
    });
  } catch (error) {
    console.error('获取Popup详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取Popup详情失败',
      error: error.message,
    });
  }
});

// 创建Popup
router.post('/', async (req, res) => {
  try {
    const {
      popupName,
      image,
      priority,
      jumpType,
      jump_nei,
      jumpUrl,
      isActive,
      allowDevices,
    } = req.body;

    // 验证必填字段
    if (!popupName || !image) {
      return res.status(400).json({
        code: 400,
        message: '弹窗名称和图片为必填项',
      });
    }

    // 处理 jumpType: 应用内页面=1, 外部应用=2, Stocks=3
    let jumpTypeValue = 2; // 默认外部应用
    if (jumpType === '应用内页面' || jumpType === 'In-App Page' || jumpType === 1) {
      jumpTypeValue = 1;
    } else if (jumpType === '外部应用' || jumpType === 'External App' || jumpType === 2) {
      jumpTypeValue = 2;
    } else if (jumpType === 'Stocks' || jumpType === 3) {
      jumpTypeValue = 3;
    }

    // 处理 allowDevices: android=1, ios=2, all=3
    let devicesValue = 3; // 默认全部
    if (allowDevices === 'android' || allowDevices === 1) {
      devicesValue = 1;
    } else if (allowDevices === 'ios' || allowDevices === 2) {
      devicesValue = 2;
    } else if (allowDevices === 'all' || allowDevices === 3) {
      devicesValue = 3;
    }

    // 处理 isActive 字段 (1=有效, 2=失效)
    const effectiveValue = isActive === 'active' || isActive === true || isActive === 1 ? 1 : 2;

    // 插入数据
    const [result] = await pool.query(
      `INSERT INTO t_home_popup
        (name, img, sort, jump_type, jump_nei, jump_link, effective, devuces, create_at, update_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        popupName,
        image,
        priority || 1,
        jumpTypeValue,
        jump_nei || null,
        jumpUrl,
        effectiveValue,
        devicesValue,
      ]
    );

    res.json({
      code: 200,
      message: 'Popup创建成功',
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error('创建Popup失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建Popup失败',
      error: error.message,
    });
  }
});

// 更新Popup
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      popupName,
      image,
      priority,
      jumpType,
      jump_nei,
      jumpUrl,
      isActive,
      allowDevices,
    } = req.body;

    // 验证必填字段
    if (!popupName || !image) {
      return res.status(400).json({
        code: 400,
        message: '弹窗名称和图片为必填项',
      });
    }

    // 处理 jumpType: 应用内页面=1, 外部应用=2, Stocks=3
    let jumpTypeValue = 2; // 默认外部应用
    if (jumpType === '应用内页面' || jumpType === 'In-App Page' || jumpType === 1) {
      jumpTypeValue = 1;
    } else if (jumpType === '外部应用' || jumpType === 'External App' || jumpType === 2) {
      jumpTypeValue = 2;
    } else if (jumpType === 'Stocks' || jumpType === 3) {
      jumpTypeValue = 3;
    }

    // 处理 allowDevices: android=1, ios=2, all=3
    let devicesValue = 3; // 默认全部
    if (allowDevices === 'android' || allowDevices === 1) {
      devicesValue = 1;
    } else if (allowDevices === 'ios' || allowDevices === 2) {
      devicesValue = 2;
    } else if (allowDevices === 'all' || allowDevices === 3) {
      devicesValue = 3;
    }

    // 处理 isActive 字段 (1=有效, 2=失效)
    const effectiveValue = isActive === 'active' || isActive === true || isActive === 1 ? 1 : 2;

    await pool.query(
      `UPDATE t_home_popup
      SET name = ?, img = ?, sort = ?, jump_type = ?, jump_nei = ?, jump_link = ?,
          effective = ?, devuces = ?, update_at = NOW()
      WHERE id = ?`,
      [
        popupName,
        image,
        priority || 1,
        jumpTypeValue,
        jump_nei || null,
        jumpUrl,
        effectiveValue,
        devicesValue,
        id,
      ]
    );

    res.json({
      code: 200,
      message: 'Popup更新成功',
    });
  } catch (error) {
    console.error('更新Popup失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新Popup失败',
      error: error.message,
    });
  }
});

// 删除Popup
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM t_home_popup WHERE id = ?', [id]);

    res.json({
      code: 200,
      message: 'Popup删除成功',
    });
  } catch (error) {
    console.error('删除Popup失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除Popup失败',
      error: error.message,
    });
  }
});

export default router;
