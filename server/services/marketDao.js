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
            
            // 优化查询：避免OR条件导致索引失效，使用UNION ALL分别查询
            const sql = `
                SELECT
                    t.*,
                    COALESCE(pool_data.pool_volume_24h, 0) as pool_volume_24h,
                    COALESCE(pool_data.pool_liquidity_usd, 0) as pool_liquidity_usd
                FROM t_wallet_tokens t
                LEFT JOIN (
                    SELECT
                        token_address,
                        MAX(volume_24h) as pool_volume_24h,
                        MAX(liquidity_usd) as pool_liquidity_usd
                    FROM (
                        SELECT token0_address as token_address, volume_24h, liquidity_usd
                        FROM t_wallet_pools_base
                        WHERE status = '1'
                        UNION ALL
                        SELECT token1_address as token_address, volume_24h, liquidity_usd
                        FROM t_wallet_pools_base
                        WHERE status = '1'
                    ) pool_union
                    GROUP BY token_address
                ) pool_data ON pool_data.token_address = t.address
                ${whereClause}
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