import { body, validationResult } from 'express-validator';
import application from '../core/appContext.js';
import UserDao from '../services/userDao.js';


// 用户登录验证规则
export const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .trim()
    .escape(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .trim()
    .escape()
];


// 用户登录
export const login = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return application.create_error_response(res, 400, '输入验证失败', errors.array());
    }

    const { username, password } = req.body;
    const user = await UserDao.login(username, password);
    if (!user) {
      return application.create_error_response(res, 401, '邮箱或密码错误');
    }

    // 检查用户状态
    if (user.status === 'inactive') {
      return application.create_error_response(res, 401, '账户已被禁用');
    }

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    application.create_error_response(res, 500, '服务器内部错误');
  }
};

// 修改密码验证规则
export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('旧密码不能为空')
    .trim(),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少6个字符')
    .trim(),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配');
      }
      return true;
    })
];

// 修改密码
export const changePassword = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return application.create_error_response(res, 400, '输入验证失败', errors.array());
    }

    const { oldPassword, newPassword } = req.body;
    const { userId } = req.body; // 假设从请求中获取用户ID，实际应该从token中获取

    const result = await UserDao.changePassword(userId, oldPassword, newPassword);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      return application.create_error_response(res, 400, result.message);
    }

  } catch (error) {
    console.error('修改密码错误:', error);
    application.create_error_response(res, 500, '服务器内部错误');
  }
};
