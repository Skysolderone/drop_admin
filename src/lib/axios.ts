import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000',
    timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 从localStorage获取token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 处理401未授权错误
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;