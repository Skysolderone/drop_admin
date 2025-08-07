import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';

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
      // 模拟登录请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 这里应该是真实的登录逻辑
      if (values.username === 'admin' && values.password === '123456') {
        message.success('登录成功！');
        // 存储登录状态
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userInfo', JSON.stringify({ username: values.username }));
        navigate('/');
      } else {
        message.error('用户名或密码错误！');
      }
    } catch (error) {
      message.error('登录失败，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card 
          className="shadow-2xl border-0 rounded-xl"
          bodyStyle={{ padding: '2rem' }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <Title level={2} className="text-gray-800 mb-2">
              Admin Panel
            </Title>
            <p className="text-gray-500">请登录您的管理员账户</p>
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
                className="rounded-lg"
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
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 text-lg font-medium"
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              测试账号: admin / 123456
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
