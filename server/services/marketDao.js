/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 18:32:39
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-07 18:51:39
 * @FilePath: \drop_admin\server\services\marketDao.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { query } from '../config/database.js';


const MarketDao = {
    list: async (pageIndex = 0, pageSize = 10, search = '') => {
        try {
            // 确保参数为正整数
            const safePageIndex = Math.max(0, parseInt(pageIndex) || 0);
            const safePageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 10)); // 限制最大100条
            const offset = safePageIndex * safePageSize;
            
            console.log(`Fetching market data with pageIndex: ${safePageIndex}, pageSize: ${safePageSize}, offset: ${offset}`);
            
            // 构建WHERE条件
            let whereClause = '';
            const queryParams = [];
            
            if (search && search.trim()) {
                whereClause = 'WHERE t.name LIKE ?';
                queryParams.push(`%${search.trim()}%`);
            }
            
            // 主查询：t_wallet_tokens LEFT JOIN t_wallet_pools_base，获取volume_24h和liquidity_usd
            // 使用GROUP BY去重，选择流动性最大的池子数据
            const sql = `
                SELECT 
                    t.*,
                    MAX(p.volume_24h) as pool_volume_24h,
                    MAX(p.liquidity_usd) as pool_liquidity_usd
                FROM t_wallet_tokens t
                LEFT JOIN t_wallet_pools_base p ON (
                    (p.token0_address = t.address OR p.token1_address = t.address)
                    AND p.status = '1'
                )
                ${whereClause}
                GROUP BY t.id
                ORDER BY t.create_at DESC 
                LIMIT ${safePageSize} OFFSET ${offset}
            `;
            console.log('执行 SQL:', sql);
            console.log('查询参数:', queryParams);
            
            const tokens = await query(sql, queryParams);
            return tokens;
        } catch (error) {
            console.error('MarketDao.list 错误:', error);
            throw error;
        }
    },

    count: async (search = '') => {
        try {
            let whereClause = '';
            const queryParams = [];
            
            if (search && search.trim()) {
                whereClause = 'WHERE name LIKE ?';
                queryParams.push(`%${search.trim()}%`);
            }
            
            const sql = `SELECT COUNT(*) as total FROM t_wallet_tokens ${whereClause}`;
            console.log('执行计数 SQL:', sql);
            console.log('计数查询参数:', queryParams);
            
            const result = await query(sql, queryParams);
            return result[0]?.total || 0;
        } catch (error) {
            console.error('MarketDao.count 错误:', error);
            throw error;
        }
    }
};
export default MarketDao;