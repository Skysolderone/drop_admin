import React from 'react';
import { Button, Dropdown, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'change-password',
      label: 'Change Password',
    },
    {
      key: 'logout',
      label: 'Log out',
      onClick: handleLogout,
    },
  ];

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
          <Button type="default" size="small">
            Change Password
          </Button>
          <Button type="default" size="small" onClick={handleLogout}>
            Log out
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default Header;
