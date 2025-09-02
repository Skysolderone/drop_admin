// 静态资源配置
export const IMAGE_BASE_URL = 'https://img.dropwallet.world';

// 其他可能的静态配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 图片相关工具函数
export const getImageUrl = (path: string): string => {
  if (!path) return '';
  
  // 如果已经是完整URL（包括 S3 URL），直接返回
  if (path.startsWith('http') || path.startsWith('https')) return path;
  
  // 如果是相对路径且以/开头，保持原样（本地服务器路径）
  if (path.startsWith('/')) {
    return path;
  }
  
  // 对于其他情况，拼接外部域名
  return `${IMAGE_BASE_URL}/${path}`;
};