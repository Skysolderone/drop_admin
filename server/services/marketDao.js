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
    list: async (pageIndex = 0, pageSize = 10) => {
        try {
            // 确保参数为正整数
            const safePageIndex = Math.max(0, parseInt(pageIndex) || 0);
            const safePageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 10)); // 限制最大100条
            const offset = safePageIndex * safePageSize;
            
            console.log(`Fetching market data with pageIndex: ${safePageIndex}, pageSize: ${safePageSize}, offset: ${offset}`);
            
            // 使用更兼容的 LIMIT 语法
            const sql = `SELECT * FROM t_wallet_tokens ORDER BY create_at DESC LIMIT ${safePageSize} OFFSET ${offset}`;
            console.log('执行 SQL:', sql);
            
            const tokens = await query(sql);
            return tokens;
        } catch (error) {
            console.error('MarketDao.list 错误:', error);
            throw error;
        }
    },

    count: async () => {
        try {
            const sql = 'SELECT COUNT(*) as total FROM t_wallet_tokens';
            console.log('执行计数 SQL:', sql);
            
            const result = await query(sql);
            return result[0]?.total || 0;
        } catch (error) {
            console.error('MarketDao.count 错误:', error);
            throw error;
        }
    }
};
export default MarketDao;