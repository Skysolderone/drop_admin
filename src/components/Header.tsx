import React, { useState } from 'react';
import { Button, Space, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';
import api from '../lib/axios';

const Header: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const showChangePasswordModal = () => {
    setIsChangePasswordModalVisible(true);
  };

  const handleChangePasswordCancel = () => {
    setIsChangePasswordModalVisible(false);
  };

  const handleChangePasswordConfirm = async (values: any) => {
    try {
      const response = await api.post('/api/auth/change-password', {
        userId: userInfo.id,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword
      });

      if (response.data?.success) {
        message.success('密码修改成功！');
        setIsChangePasswordModalVisible(false);
      } else {
        message.error(response.data?.message || '密码修改失败');
      }
    } catch (error: any) {
      console.error('修改密码错误:', error);
      console.error('错误详情:', {
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        message: error.message
      });
      const errorMessage = error.response?.data?.msg || error.response?.data?.message || error.message || '密码修改失败，请稍后重试！';
      console.log('最终错误消息:', errorMessage);
      message.error(errorMessage);
    }
  };

  return (
    <div className="header-container">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🔐</span>
          <span className="logo-text">Admin Panel</span>
        </div>
      </div>
      
      <div className="header-right">
        <span className="welcome-text">Welcome, {userInfo.username || 'xxx'}</span>
        <Space>
          <Button type="default" size="small" onClick={showChangePasswordModal}>
            Change Password
          </Button>
          <Button type="default" size="small" onClick={handleLogout}>
            Log out
          </Button>
        </Space>
      </div>

      <ChangePasswordModal
        visible={isChangePasswordModalVisible}
        onCancel={handleChangePasswordCancel}
        onConfirm={handleChangePasswordConfirm}
      />
    </div>
  );
};

export default Header;
