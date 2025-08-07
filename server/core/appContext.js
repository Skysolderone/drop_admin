/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-07 18:05:14
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-08-07 18:08:18
 * @FilePath: \drop_admin\server\core\appContext.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


const application = { 
    create_response: (res, data = null) => {
        return res.status(200).json({
            code: 200,
            msg: 'OK',
            data
        });
    },

    create_error_response: (res, code = 500, msg = '服务器错误', data = null) => {
        return res.status(code).json({
            code,
            msg,
            data
        });
    },

    create_response_ok: (res) => {
        return res.status(200).json({
            code: 200,
            msg: '操作成功',
        });
    }
};

export default application;

