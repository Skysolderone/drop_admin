import React from 'react';
import { Table, Button, Space, Tag } from 'antd';

const UserManage: React.FC = () => {
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">Edit</Button>
          <Button type="link" danger>Disable</Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2025-08-07 10:30',
    },
    {
      key: '2',
      username: 'user001',
      email: 'user001@example.com',
      role: 'user',
      status: 'active',
      lastLogin: '2025-08-06 15:22',
    },
    {
      key: '3',
      username: 'user002',
      email: 'user002@example.com',
      role: 'user',
      status: 'inactive',
      lastLogin: '2025-08-05 09:15',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="mb-4">
        <Button type="primary">Add New User</Button>
      </div>
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default UserManage;
