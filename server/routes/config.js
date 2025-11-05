import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 获取配置值
router.get('/dialog-limit', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT config_value FROM t_wld_config WHERE game_type = ? AND config_key = ?',
            ['admin', 'dialog']
        );

        if (rows.length > 0) {
            res.json({
                code: 200,
                data: {
                    value: parseInt(rows[0].config_value) || 5
                },
                message: 'Success'
            });
        } else {
            // 如果没有配置，返回默认值5
            res.json({
                code: 200,
                data: {
                    value: 5
                },
                message: 'Using default value'
            });
        }
    } catch (error) {
        console.error('获取配置错误:', error);
        res.status(500).json({
            code: 500,
            message: '获取配置失败',
            error: error.message
        });
    }
});

// 更新配置值
router.put('/dialog-limit', async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || isNaN(value) || value < 1 || value > 20) {
            return res.status(400).json({
                code: 400,
                message: '配置值必须是1-20之间的数字'
            });
        }

        // 先检查配置是否存在
        const [existing] = await pool.query(
            'SELECT id FROM t_wld_config WHERE game_type = ? AND config_key = ?',
            ['admin', 'dialog']
        );

        if (existing.length > 0) {
            // 更新现有配置
            await pool.query(
                'UPDATE t_wld_config SET config_value = ?, update_time = NOW() WHERE game_type = ? AND config_key = ?',
                [String(value), 'admin', 'dialog']
            );
        } else {
            // 插入新配置
            await pool.query(
                'INSERT INTO t_wld_config (game_type, config_key, config_value, update_time) VALUES (?, ?, ?, NOW())',
                ['admin', 'dialog', String(value)]
            );
        }

        res.json({
            code: 200,
            data: {
                value: parseInt(value)
            },
            message: '配置更新成功'
        });
    } catch (error) {
        console.error('更新配置错误:', error);
        res.status(500).json({
            code: 500,
            message: '更新配置失败',
            error: error.message
        });
    }
});

export default router;
