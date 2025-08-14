import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      // 调用真实的登录接口
      const response = await api.post('/api/auth/login', {
        username: values.username,
        password: values.password
      });

      if (response.data?.success) {
        message.success('登录成功！');
        
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
        message.error(response.data?.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      const errorMessage = error.response?.data?.message || error.message || '登录失败，请稍后重试！';
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
