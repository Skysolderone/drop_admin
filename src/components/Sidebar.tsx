import React, { useState } from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(['token']);

  const items: MenuItem[] = [
    {
      key: '/',
      label: <Link to="/">Home</Link>,
    },
    {
      key: 'token',
      label: 'Token',
      children: [
        {
          key: '/token-list',
          label: <Link to="/token-list">Token List</Link>,
        },
        {
          key: '/token-market',
          label: <Link to="/token-market">Token Market Info</Link>,
        },
      ],
    },
  ];

  const onOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  return (
    <div className="sidebar">
      <Menu
        mode="inline"
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        selectedKeys={[location.pathname]}
        style={{ height: '100%', borderRight: 0 }}
        items={items}
      />
    </div>
  );
};

export default Sidebar;
