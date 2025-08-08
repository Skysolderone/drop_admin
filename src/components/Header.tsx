import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';

const Header: React.FC = () => {
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

  const handleChangePasswordConfirm = (values: any) => {
    console.log('Change password values:', values);
    // TODO: 这里后续添加修改密码的API调用
    setIsChangePasswordModalVisible(false);
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
