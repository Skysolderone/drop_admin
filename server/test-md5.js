/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 18:00:09
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-07 18:19:29
 * @FilePath: \drop_admin\server\test-md5.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import crypto from 'crypto';

// MD5 加密函数
const md5Hash = (text) => {
    return crypto.createHash('md5').update(text + process.env.MD5_SALT).digest('hex');
};

// 测试 MD5 加密
console.log('MD5 测试:');
console.log('明文: "123456"');
console.log('MD5: ', md5Hash('123456'));
console.log('');
console.log('明文: "admin123"');
console.log('MD5: ', md5Hash('admin123'));
console.log('');

// 密码比较测试
const testPassword = '123456';
const hashedPassword = md5Hash(testPassword);
console.log('密码比较测试:');
console.log('原密码:', testPassword);
console.log('MD5 哈希:', hashedPassword);
console.log('比较结果:', md5Hash(testPassword) === hashedPassword);
