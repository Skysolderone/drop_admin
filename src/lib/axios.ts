import axios, { AxiosError } from 'axios';

// 可复用的 axios 实例
const api = axios.create({
  // 使用相对路径，开发时由 Vite 代理或直接走 CORS
  baseURL: '',
  timeout: 15000,
});

// 请求拦截：自动附加 Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // 直接在现有 headers 上设置，避免替换类型
    if (!config.headers) config.headers = {} as any;
    const h = config.headers as any;
    if (!h.Authorization) h.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误提示透传信息
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // 这里不做 UI 提示，留给调用方处理；但规范化错误对象
    const message =
      (error.response?.data as any)?.msg || (error.response?.data as any)?.message || error.message || '请求失败';
    return Promise.reject({ ...error, message });
  }
);

export default api;
