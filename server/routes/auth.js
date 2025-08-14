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
    login,
    loginValidation,
    changePassword,
    changePasswordValidation
} from '../controllers/authController.js';

const router = express.Router();

// 用户登录
router.post('/login', loginValidation, login);

// 修改密码
router.post('/change-password', changePasswordValidation, changePassword);


export default router;
