import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { initDatabase, testConnection } from './config/database.js';

// 导入路由
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import tokenRoutes from './routes/tokens.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Drop Admin API 服务器运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/market', marketRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '欢迎使用 Drop Admin API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tokens: '/api/tokens',
      users: '/api/users',
      health: '/health'
    }
  });
});

// // 404 处理
// app.use(notFound);
// // 错误处理中间件
// app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    console.log('🔄 正在连接数据库...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ 数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    // 初始化数据库表
    console.log('🔄 正在初始化数据库表...');
    await initDatabase();

    // 启动服务器
    app.listen(PORT, () => {
      console.log('🚀 ===================================');
      console.log(`🚀 Drop Admin API 服务器启动成功!`);
      console.log(`🚀 端口: ${PORT}`);
      console.log(`🚀 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 健康检查: http://localhost:${PORT}/health`);
      console.log(`🚀 API 文档: http://localhost:${PORT}/`);
      console.log('🚀 ===================================');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📤 收到 SIGTERM 信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📤 收到 SIGINT 信号，正在优雅关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer();