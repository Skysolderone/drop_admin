import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 获取Banner列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];

    if (status && status !== 'all') {
      whereClause = ' WHERE invalid = ?';
      params.push(status === 'active' ? 1 : 2);
    }

    if (search) {
      whereClause += (whereClause ? ' AND' : ' WHERE');
      whereClause += ' (main_title LIKE ? OR title LIKE ? OR button_txt LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM t_home_banner${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取数据
    const [banners] = await pool.query(
      `SELECT * FROM t_home_banner${whereClause} ORDER BY priority ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // 获取每个banner的国际化数据
    const bannersWithI18n = await Promise.all(banners.map(async (banner) => {
      const [i18nData] = await pool.query(
        'SELECT * FROM t_home_banner_lans WHERE b_id = ?',
        [banner.id]
      );

      // 将国际化数据按字段分组
      const i18n = {
        mainTitle: {},
        subTitle: {},
        buttonText: {}
      };

      i18nData.forEach(item => {
        // 假设 lans 字段是 JSON 格式，包含 {field: 'mainTitle', language: 'en', text: 'Hello'}
        try {
          const parsed = typeof item.lans === 'string' ? JSON.parse(item.lans) : item.lans;
          if (parsed.field && parsed.language && parsed.text) {
            if (!i18n[parsed.field]) i18n[parsed.field] = {};
            i18n[parsed.field][parsed.language] = parsed.text;
          }
        } catch (e) {
          // 如果不是JSON格式，可能是纯文本
          console.warn('Failed to parse i18n data:', e);
        }
      });

      return {
        id: banner.id,
        main_title: banner.main_title,
        title: banner.title,
        sub_title: banner.title,
        button_text: banner.button_txt,
        priority: banner.priority,
        jump_type: banner.jump_type,
        jump_nei: banner.jump_nei, // 添加jump_nei字段
        jump_url: banner.jump_link,
        is_active: banner.invalid,
        image: banner.banner_img,
        banner_image: banner.banner_img,
        devices: banner.devices,
        i18n,
        updated_at: banner.updated_at || banner.created_at
      };
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        banners: bannersWithI18n,
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('获取Banner列表错误:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取Banner列表失败'
    });
  }
});

// 获取单个Banner详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取 banner 数据
    const [banners] = await pool.query(
      'SELECT * FROM t_home_banner WHERE id = ?',
      [id]
    );

    if (banners.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Banner not found'
      });
    }

    const banner = banners[0];

    // 获取国际化数据
    const [i18nData] = await pool.query(
      'SELECT * FROM t_home_banner_lans WHERE b_id = ?',
      [id]
    );

    // 将国际化数据按字段分组
    const i18n = {
      mainTitle: {},
      subTitle: {},
      buttonText: {}
    };

    i18nData.forEach(item => {
      try {
        const parsed = typeof item.lans === 'string' ? JSON.parse(item.lans) : item.lans;
        if (parsed.field && parsed.language && parsed.text) {
          if (!i18n[parsed.field]) i18n[parsed.field] = {};
          i18n[parsed.field][parsed.language] = parsed.text;
        }
      } catch (e) {
        console.warn('Failed to parse i18n data:', e);
      }
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        id: banner.id,
        main_title: banner.main_title,
        title: banner.title,
        sub_title: banner.title,
        button_text: banner.button_txt,
        priority: banner.priority,
        jump_type: banner.jump_type,
        jump_nei: banner.jump_nei, // 添加jump_nei字段
        jump_url: banner.jump_link,
        invalid: banner.invalid,
        image: banner.banner_img,
        banner_img: banner.banner_img,
        devices: banner.devices,
        i18n,
        updated_at: banner.updated_at || banner.create_at
      }
    });
  } catch (error) {
    console.error('获取Banner详情错误:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取Banner详情失败'
    });
  }
});

// 新增Banner
router.post('/', async (req, res) => {
  try {
    const {
      mainTitle,
      subTitle,
      buttonText,
      priority,
      jumpType,
      jump_nei,
      jumpUrl,
      isActive,
      image,
      allowDevices,
      i18n
    } = req.body;

    // 验证必填字段
    if (!mainTitle || !buttonText || !image || !jumpUrl) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段'
      });
    }

    // 映射 jumpType 到数据库值
    let jumpTypeValue;
    switch (jumpType) {
      case '应用内页面':
        jumpTypeValue = 1;
        break;
      case '外部应用':
        jumpTypeValue = 2;
        break;
      case 'Stocks':
        jumpTypeValue = 3;
        break;
      default:
        jumpTypeValue = 2; // 默认外部应用
    }

    // 处理 devices 字段
    let devicesValue = 3; // 默认 3 表示全部设备
    if (allowDevices && Array.isArray(allowDevices)) {
      if (allowDevices.includes('android') && allowDevices.includes('ios')) {
        devicesValue = 3; // 全部
      } else if (allowDevices.includes('android')) {
        devicesValue = 1; // 仅 Android
      } else if (allowDevices.includes('ios')) {
        devicesValue = 2; // 仅 iOS
      }
    }

    // 处理 isActive 字段 (1=有效, 2=无效)
    const invalidValue = isActive === 'active' || isActive === true ? 1 : 2;

    // 插入数据
    const [result] = await pool.query(
      `INSERT INTO t_home_banner
        (main_title, title, button_txt, priority, jump_type, jump_nei, jump_link, invalid, banner_img, devices, create_at, update_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mainTitle,
        subTitle || '',
        buttonText,
        priority || 1,
        jumpTypeValue,
        jump_nei || null,
        jumpUrl,
        invalidValue,
        image,
        devicesValue
      ]
    );

    const bannerId = result.insertId;

    // 保存国际化数据
    if (i18n) {
      const i18nPromises = [];

      // 遍历 i18n 对象: { mainTitle: { en: 'Hello', zh: '你好' }, ... }
      for (const [field, translations] of Object.entries(i18n)) {
        for (const [language, text] of Object.entries(translations)) {
          if (text) { // 只保存有内容的翻译
            const i18nData = JSON.stringify({ field, language, text });
            i18nPromises.push(
              pool.query(
                'INSERT INTO t_home_banner_lans (id, b_id, lans) VALUES (NULL, ?, ?)',
                [bannerId, i18nData]
              )
            );
          }
        }
      }

      await Promise.all(i18nPromises);
    }

    res.json({
      code: 200,
      message: '添加成功',
      data: {
        id: bannerId
      }
    });
  } catch (error) {
    console.error('添加Banner错误:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '添加Banner失败'
    });
  }
});

// 更新Banner
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mainTitle,
      subTitle,
      buttonText,
      priority,
      jumpType,
      jump_nei,
      jumpUrl,
      isActive,
      image,
      allowDevices,
      i18n
    } = req.body;

    // 映射 jumpType 到数据库值
    let jumpTypeValue;
    switch (jumpType) {
      case '应用内页面':
        jumpTypeValue = 1;
        break;
      case '外部应用':
        jumpTypeValue = 2;
        break;
      case 'Stocks':
        jumpTypeValue = 3;
        break;
      default:
        jumpTypeValue = 2;
    }

    // 处理 devices 字段
    let devicesValue = 3;
    if (allowDevices && Array.isArray(allowDevices)) {
      if (allowDevices.includes('android') && allowDevices.includes('ios')) {
        devicesValue = 3;
      } else if (allowDevices.includes('android')) {
        devicesValue = 1;
      } else if (allowDevices.includes('ios')) {
        devicesValue = 2;
      }
    }

    // 处理 isActive 字段 (1=有效, 2=无效)
    const invalidValue = isActive === 'active' || isActive === true ? 1 : 2;

    await pool.query(
      `UPDATE t_home_banner
      SET main_title = ?, title = ?, button_txt = ?, priority = ?,
          jump_type = ?, jump_nei = ?, jump_link = ?, invalid = ?, banner_img = ?,
          devices = ?, update_at = NOW()
      WHERE id = ?`,
      [
        mainTitle,
        subTitle || '',
        buttonText,
        priority || 1,
        jumpTypeValue,
        jump_nei || null,
        jumpUrl,
        invalidValue,
        image,
        devicesValue,
        id
      ]
    );

    // 更新国际化数据：先删除旧的，再插入新的
    if (i18n) {
      // 删除旧的国际化数据
      await pool.query('DELETE FROM t_home_banner_lans WHERE b_id = ?', [id]);

      // 插入新的国际化数据
      const i18nPromises = [];
      for (const [field, translations] of Object.entries(i18n)) {
        for (const [language, text] of Object.entries(translations)) {
          if (text) {
            const i18nData = JSON.stringify({ field, language, text });
            i18nPromises.push(
              pool.query(
                'INSERT INTO t_home_banner_lans (id, b_id, lans) VALUES (NULL, ?, ?)',
                [id, i18nData]
              )
            );
          }
        }
      }
      await Promise.all(i18nPromises);
    }

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新Banner错误:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '更新Banner失败'
    });
  }
});

// 删除Banner
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先删除国际化数据
    await pool.query('DELETE FROM t_home_banner_lans WHERE b_id = ?', [id]);

    // 再删除主表数据
    await pool.query('DELETE FROM t_home_banner WHERE id = ?', [id]);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除Banner错误:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '删除Banner失败'
    });
  }
});

export default router;
