import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setLoginError(''); // 清除之前的错误信息
    try {
      // 调用真实的登录接口
      const response = await api.post('/api/auth/login', {
        username: values.username,
        password: values.password
      });

      if (response.data?.success) {
        message.success('登录成功！');
        setFailedAttempts(0); // 重置失败次数
        
        // 存储登录状态和用户信息
        localStorage.setItem('isLoggedIn', 'true');
        const userInfo = response.data.data;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // 如果后端返回了token，也需要存储
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        navigate('/token-list');
      } else {
        const errorMsg = response.data?.message || '登录失败';
        setLoginError(errorMsg);
        setFailedAttempts(prev => prev + 1);
        message.error(errorMsg);
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      
      let errorMessage = '登录失败，请稍后重试！';
      
      if (error.response) {
        const status = error.response.status;
        const responseMessage = error.response.data?.message;
        
        switch (status) {
          case 401:
            errorMessage = responseMessage || '用户名或密码错误，请检查后重试';
            break;
          case 403:
            errorMessage = '账户被禁用，请联系管理员';
            break;
          case 429:
            errorMessage = '登录尝试过于频繁，请稍后再试';
            break;
          case 500:
            errorMessage = '服务器内部错误，请稍后重试';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = '服务暂时不可用，请稍后重试';
            break;
          default:
            errorMessage = responseMessage || `登录失败 (错误代码: ${status})`;
        }
      } else if (error.request) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else {
        errorMessage = error.message || '登录过程中发生未知错误';
      }
      
      setLoginError(errorMessage);
      setFailedAttempts(prev => prev + 1);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <Card 
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            border: 'none', 
            borderRadius: '0.75rem' 
          }}
          bodyStyle={{ padding: '2rem' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '4rem', 
              height: '4rem', 
              backgroundColor: '#dbeafe', 
              borderRadius: '50%', 
              marginBottom: '1rem' 
            }}>
              <span style={{ fontSize: '1.5rem' }}>🔐</span>
            </div>
            <Title level={2} style={{ color: '#1f2937', marginBottom: '0.5rem' }}>
              Admin Panel
            </Title>
            <p style={{ color: '#6b7280' }}>请登录您的管理员账户</p>
          </div>

          {/* 错误提示 */}
          {loginError && (
            <Alert
              message={loginError}
              type="error"
              showIcon
              style={{ marginBottom: '1rem' }}
              action={
                failedAttempts >= 3 && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    登录失败 {failedAttempts} 次，请检查用户名和密码
                  </div>
                )
              }
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符!' }
              ]}
            >
              <Input 
                placeholder="请输入用户名"
                style={{ borderRadius: '0.5rem' }}
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6个字符!' }
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                style={{ borderRadius: '0.5rem' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{
                  width: '100%',
                  height: '3rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#2563eb',
                  borderColor: '#2563eb',
                  fontSize: '1.125rem',
                  fontWeight: '500'
                }}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              请使用管理员账户登录
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
