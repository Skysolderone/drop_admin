import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { initDatabase, testConnection } from './config/database.js';

// 导入路由
import authRoutes from './routes/auth.js'; //OK 
import marketRoutes from './routes/market.js'; //OK
import tokenRoutes from './routes/tokens.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
// 打印实际使用的 CORS origin
console.log('CORS origin:', process.env.CLIENT_URL || 'http://localhost:5173');
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态资源：用于访问上传后的文件
const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 新增：单独的图片目录 uploadurlpic
const uploadUrlPicDir = path.resolve('./uploadurlpic');
if (!fs.existsSync(uploadUrlPicDir)) {
  fs.mkdirSync(uploadUrlPicDir, { recursive: true });
}
app.use('/uploadurlpic', express.static(uploadUrlPicDir));
// 兼容历史路径：/uploadsurlpic 指向同一目录
app.use('/uploadsurlpic', express.static(uploadUrlPicDir));

// 配置 multer：保存到本地 uploads 目录
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // 使用时间戳+随机数+原始后缀
    const ext = path.extname(file.originalname || '');
    const safeBase = (file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 为 uploadurlpic 提供单独的存储与中间件
const storageUrlPic = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadUrlPicDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '');
    const safeBase = (file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});
const uploadUrlPic = multer({
  storage: storageUrlPic,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 上传接口：单文件
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ code: 400, message: '未接收到文件' });
    const url = `/uploads/${f.filename}`;
    res.json({ code: 200, message: '上传成功', data: { url, filename: f.filename, mimetype: f.mimetype, size: f.size } });
  } catch (err) {
    console.error('上传失败:', err);
    res.status(500).json({ code: 500, message: '上传失败' });
  }
});

// 新增上传接口：保存到 /uploadurlpic
app.post('/api/uploadurlpic', uploadUrlPic.single('file'), (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ code: 400, message: '未接收到文件' });
    const url = `/uploadurlpic/${f.filename}`;
    res.json({ code: 200, message: '上传成功', data: { url, filename: f.filename, mimetype: f.mimetype, size: f.size } });
  } catch (err) {
    console.error('uploadurlpic 上传失败:', err);
    res.status(500).json({ code: 500, message: '上传失败' });
  }
});

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