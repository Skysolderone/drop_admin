import React, { useState } from 'react';
import { Table, Button, Space, Tag, Select, Input, message } from 'antd';
import AddTokenModal from '../components/AddTokenModal';

const TokenList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleSave = (values: any) => {
    console.log('Form values:', values);
    message.success('代币添加成功！');
    setIsModalVisible(false);
    // 这里可以添加实际的保存逻辑，比如调用API
  };
  const columns = [
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: 'Top Status',
      dataIndex: 'topStatus',
      key: 'topStatus',
      width: 100,
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'default'}>
          {status ? 'Top' : '-'}
        </Tag>
      ),
    },
    {
      title: 'Hot Status',
      dataIndex: 'hotStatus',
      key: 'hotStatus',
      width: 100,
      render: (status: boolean) => (
        <Tag color={status ? 'red' : 'default'}>
          {status ? 'Hot' : '-'}
        </Tag>
      ),
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      key: 'logo',
      width: 80,
      render: (logo: string) => (
        <div style={{ width: 32, height: 32, backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logo || '📷'}
        </div>
      ),
    },
    {
      title: 'Token Name',
      dataIndex: 'tokenName',
      key: 'tokenName',
      width: 120,
    },
    {
      title: 'Token Symbol',
      dataIndex: 'tokenSymbol',
      key: 'tokenSymbol',
      width: 120,
    },
    {
      title: 'Token Desc',
      dataIndex: 'tokenDesc',
      key: 'tokenDesc',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Token Address',
      dataIndex: 'tokenAddress',
      key: 'tokenAddress',
      width: 200,
      ellipsis: true,
      render: (address: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {address}
        </span>
      ),
    },
    {
      title: 'Swap Status',
      dataIndex: 'swapStatus',
      key: 'swapStatus',
      width: 100,
      render: (status: boolean) => (
        <Tag color={status ? 'blue' : 'default'}>
          {status ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: () => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            style={{ 
              color: '#1890ff',
              border: 'none',
              padding: '2px 4px',
              height: 'auto',
              fontSize: '16px'
            }}
          >
            ⚙️
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            style={{ 
              color: '#ff4d4f',
              border: 'none',
              padding: '2px 4px',
              height: 'auto',
              fontSize: '16px'
            }}
          >
            🗑️
          </Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      priority: 1,
      topStatus: true,
      hotStatus: false,
      logo: '₿',
      tokenName: 'Bitcoin',
      tokenSymbol: 'BTC',
      tokenDesc: 'The first cryptocurrency',
      tokenAddress: '0x1234...abcd',
      swapStatus: true,
    },
    {
      key: '2',
      priority: 2,
      topStatus: false,
      hotStatus: true,
      logo: '⟠',
      tokenName: 'Ethereum',
      tokenSymbol: 'ETH',
      tokenDesc: 'Smart contract platform',
      tokenAddress: '0x5678...efgh',
      swapStatus: true,
    },
    {
      key: '3',
      priority: 3,
      topStatus: false,
      hotStatus: false,
      logo: '🐕',
      tokenName: 'Dogecoin',
      tokenSymbol: 'DOGE',
      tokenDesc: 'Meme cryptocurrency',
      tokenAddress: '0x9abc...ijkl',
      swapStatus: false,
    },
    {
      key: '4',
      priority: 4,
      topStatus: false,
      hotStatus: false,
      logo: '🔷',
      tokenName: 'Cardano',
      tokenSymbol: 'ADA',
      tokenDesc: 'Proof-of-stake blockchain',
      tokenAddress: '0xdef0...mnop',
      swapStatus: true,
    },
    {
      key: '5',
      priority: 5,
      topStatus: false,
      hotStatus: false,
      logo: '🌙',
      tokenName: 'Solana',
      tokenSymbol: 'SOL',
      tokenDesc: 'High-performance blockchain',
      tokenAddress: '0x1357...qrst',
      swapStatus: true,
    },
  ];

  return (
    <div>
      {/* 顶部工具栏 */}
      <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Select
            defaultValue="all"
            style={{ width: 120 }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <Input
            placeholder="Search tokens..."
            style={{ 
              width: 300,
              borderRadius: '6px'
            }}
            suffix={
              <Button 
                type="text" 
                size="small" 
                style={{ 
                  border: 'none', 
                  padding: 0,
                  background: 'transparent',
                  boxShadow: 'none'
                }}
              >
                🔍
              </Button>
            }
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            type="primary" 
            onClick={showModal}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              borderRadius: '6px',
              border: 'none'
            }}
          >
            ➕ Add Token
          </Button>
          <Button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              borderRadius: '6px'
            }}
          >
            ⬇️ Export CSV
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <Table 
        columns={columns} 
        dataSource={data}
        scroll={{ x: 1200 }}
        pagination={{
          current: 1,
          total: 50,
          pageSize: 5,
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: (total, range) => `Page ${Math.ceil(range[0] / 5)} of ${Math.ceil(total / 5)}`,
          pageSizeOptions: ['5', '10', '20', '50'],
          style: { textAlign: 'center' }
        }}
        size="middle"
        bordered
      />

      {/* 添加代币模态框 */}
      <AddTokenModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
};

export default TokenList;
