import express from 'express';

import {
    getAllTokens
} from '../controllers/tokenlist.js';

const router = express.Router();
// 市场列表
router.get('/tokenlists', getAllTokens);


export default router;
