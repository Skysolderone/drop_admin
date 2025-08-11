
import { query } from '../config/database.js';


const TokenList = {
    list: async (pageIndex = 0, pageSize = 10) => {
        try {
            // 确保参数为正整数
            const safePageIndex = Math.max(0, parseInt(pageIndex) || 0);
            const safePageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 10)); // 限制最大100条
            const offset = safePageIndex * safePageSize;
            
            console.log(`Fetching market data with pageIndex: ${safePageIndex}, pageSize: ${safePageSize}, offset: ${offset}`);
            
            // 使用更兼容的 LIMIT 语法
            const sql = `SELECT * FROM t_wallet_token ORDER BY create_at DESC LIMIT ${safePageSize} OFFSET ${offset}`;
            console.log('执行 SQL:', sql);
            
            const tokens = await query(sql);
            return tokens;
        } catch (error) {
            console.error('TokenList.list 错误:', error);
            throw error;
        }
    },

    count: async () => {
        try {
            const sql = 'SELECT COUNT(*) as total FROM t_wallet_token';
            console.log('执行计数 SQL:', sql);
            
            const result = await query(sql);
            return result[0]?.total || 0;
        } catch (error) {
            console.error('TokenList.count 错误:', error);
            throw error;
        }
    }
};
export default TokenList;