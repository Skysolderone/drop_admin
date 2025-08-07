# Drop Admin API 服务器

这是 Drop Admin 项目的后端 API 服务器，基于 Node.js + Express + MySQL 构建。

## 功能特性

- ✅ 用户认证与授权 (JWT)
- ✅ 代币管理 (CRUD)
- ✅ 用户管理 (CRUD)
- ✅ 数据库连接池
- ✅ 输入验证与安全防护
- ✅ 错误处理
- ✅ API 限流
- ✅ CORS 支持

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MySQL 8.0+
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: MD5 (crypto)
- **验证**: express-validator
- **安全**: helmet, cors, express-rate-limit

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env` 文件并修改配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=drop_admin

# JWT 配置
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS 配置
CLIENT_URL=http://localhost:5173
```

### 3. 准备数据库

确保 MySQL 服务已启动，并创建数据库：

```sql
CREATE DATABASE drop_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务器将在 http://localhost:3001 启动

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取当前用户信息

### 代币管理

- `GET /api/tokens` - 获取代币列表
- `GET /api/tokens/:id` - 获取代币详情
- `POST /api/tokens` - 创建代币 (需要认证)
- `PUT /api/tokens/:id` - 更新代币 (需要管理员权限)
- `DELETE /api/tokens/:id` - 删除代币 (需要管理员权限)

### 用户管理

- `GET /api/users` - 获取用户列表 (需要管理员权限)
- `GET /api/users/:id` - 获取用户详情 (需要管理员权限)
- `PUT /api/users/:id` - 更新用户信息 (需要管理员权限)
- `DELETE /api/users/:id` - 删除用户 (需要管理员权限)
- `GET /api/users/stats` - 获取系统统计 (需要管理员权限)

### 系统相关

- `GET /health` - 健康检查
- `GET /` - API 信息

## 数据库结构

### 用户表 (users)

```sql
CREATE TABLE t_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 代币表 (tokens)

```sql
CREATE TABLE t_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  contract_address VARCHAR(255) UNIQUE NOT NULL,
  decimals INT DEFAULT 18,
  total_supply BIGINT,
  price DECIMAL(20, 8) DEFAULT 0,
  market_cap DECIMAL(20, 2) DEFAULT 0,
  volume_24h DECIMAL(20, 2) DEFAULT 0,
  status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 用户代币关系表 (user_tokens)

```sql
CREATE TABLE user_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT NOT NULL,
  balance DECIMAL(30, 18) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_token (user_id, token_id)
);
```

## 安全特性

- 密码使用 MD5 加密
- JWT 认证机制
- 输入验证和清理
- SQL 注入防护 (参数化查询)
- CORS 配置
- 请求频率限制
- 安全响应头 (helmet)

⚠️ **安全提醒**: MD5 不是最安全的密码哈希方式，建议在生产环境中使用 bcrypt 或 Argon2。

## 开发说明

### 项目结构

```
server/
├── config/
│   └── database.js          # 数据库配置
├── controllers/
│   ├── authController.js    # 认证控制器
│   ├── tokenController.js   # 代币控制器
│   └── userController.js    # 用户控制器
├── middleware/
│   └── auth.js             # 认证中间件
├── routes/
│   ├── auth.js             # 认证路由
│   ├── tokens.js           # 代币路由
│   └── users.js            # 用户路由
├── .env                    # 环境变量
├── .gitignore
├── package.json
├── README.md
└── server.js               # 主服务器文件
```

### 添加新功能

1. 在相应的 controller 中添加处理函数
2. 在相应的 route 文件中添加路由
3. 根据需要更新数据库表结构
4. 更新 API 文档

## 错误处理

API 返回统一的错误格式：

```json
{
  "success": false,
  "message": "错误信息",
  "errors": [] // 可选，详细错误信息
}
```

## 成功响应

API 返回统一的成功格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {} // 可选，返回数据
}
```

## 许可证

MIT License
