
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
    }
};

export default UserDao;