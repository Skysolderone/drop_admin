/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 17:52:54
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-07 17:53:19
 * @FilePath: \drop_admin\server\routes\auth.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import express from 'express';
import {
    getAllTokens
} from '../controllers/maketController.js';

const router = express.Router();
// 市场列表
router.post('/list', getAllTokens);

export default router;
