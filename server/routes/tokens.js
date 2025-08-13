import express from 'express';

import {
    getAllTokens,
    addToken,
    updateToken,
    getTokenLans,
    getTokenDetail,
} from '../controllers/tokenlist.js';

const router = express.Router();
// 市场列表
router.get('/tokenlists', getAllTokens);
// 新增：添加代币
router.post('/tokenlists/add', addToken);
// 编辑：根据 id 或地址
router.put('/tokenlists/:id', updateToken);
// 查询：获取指定 token 的多语言原因
router.get('/tokenlists/:id/lans', getTokenLans);
// 详情：含 airdrop 方法
router.get('/tokenlists/:id/detail', getTokenDetail);


export default router;
