
import crypto from 'crypto';
import { query } from '../config/database.js';

// MD5 加密函数
const md5Hash = (text) => {
    return crypto.createHash('md5').update(text + process.env.MD5_SALT).digest('hex');
};

const UserDao = {
    login: async (username, password) => {
        const users = await query('SELECT * FROM t_users WHERE username = ? ', [username]);
        if (users.length === 0) {
            return null;
        }
        const user = users[0];
        
        // 使用 MD5 比较密码
        const hashedPassword = md5Hash(password);
        console.log(`Comparing hashed ${password} password: ${hashedPassword} with user password: ${user.password}`);
        
        if (hashedPassword !== user.password) {
            return null;
        }
        
        return user;
    },

    // 修改密码
    changePassword: async (userId, oldPassword, newPassword) => {
        // 先验证用户和旧密码
        const users = await query('SELECT * FROM t_users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return { success: false, message: '用户不存在' };
        }
        
        const user = users[0];
        const hashedOldPassword = md5Hash(oldPassword);
        
        if (hashedOldPassword !== user.password) {
            return { success: false, message: '旧密码错误' };
        }
        
        // 更新新密码
        const hashedNewPassword = md5Hash(newPassword);
        await query('UPDATE t_users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
        
        return { success: true, message: '密码修改成功' };
    }
};

export default UserDao;