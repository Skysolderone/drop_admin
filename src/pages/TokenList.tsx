import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Select, Input, message } from 'antd';
import AddTokenModal from '../components/AddTokenModal';

const TokenList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [tokens, setTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // 获取代币列表
    const fetchTokens = async (page = 1, limit = 10, status?: string, search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (status && status !== 'all') {
                params.append('status', status);
            }

            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`/api/market/list?${params}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('获取代币列表失败');
            }

            const result = await response.json();
            
            if (result.success) {
                // 处理数据格式，添加key和处理字段映射
                const processedTokens = result.data.tokens.map((token: any, index: number) => ({
                    key: token.id || index.toString(),
                    priority: index + 1 + (page - 1) * limit,
                    topStatus: token.is_top === 1 || token.is_top === true,
                    hotStatus: token.is_hot === 1 || token.is_hot === true,
                    logo: token.logo_url || token.token_symbol?.charAt(0) || '📷',
                    tokenName: token.token_name || token.name || '',
                    tokenSymbol: token.token_symbol || token.symbol || '',
                    tokenDesc: token.token_desc || token.description || '',
                    tokenAddress: token.token_address || token.address || '',
                    swapStatus: token.swap_status === 1 || token.swap_status === true || token.is_active === 1 || token.is_active === true,
                    ...token // 保留原始数据
                }));

                setTokens(processedTokens);
                setPagination({
                    current: result.data.page,
                    pageSize: result.data.limit,
                    total: result.data.total,
                });
            } else {
                message.error(result.message || '获取代币列表失败');
            }
        } catch (error) {
            console.error('获取代币列表错误:', error);
            message.error('获取代币列表失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 初始化数据
    useEffect(() => {
        fetchTokens();
    }, []);

    // 处理分页变化
    const handleTableChange = (paginationConfig: any) => {
        fetchTokens(
            paginationConfig.current, 
            paginationConfig.pageSize, 
            statusFilter === 'all' ? undefined : statusFilter,
            searchValue
        );
    };

    // 处理搜索
    const handleSearch = () => {
        fetchTokens(1, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
    };

    // 处理状态筛选
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        fetchTokens(1, pagination.pageSize, value === 'all' ? undefined : value, searchValue);
    };

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
        // 重新获取数据
        fetchTokens(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
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

    return (
        <div>
            {/* 顶部工具栏 */}
            <div className="mb-6" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px',marginBottom: '16px' }}>
                    <Select
                        defaultValue="all"
                        value={statusFilter}
                        style={{ width: 120 }}
                        onChange={handleStatusFilter}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                    />

                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px',marginBottom: '20px' }}>
                    <Input
                        placeholder="Search tokens..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{
                            width: 300,
                            borderRadius: '6px'
                        }}
                        suffix={
                            <Button
                                type="text"
                                size="small"
                                onClick={handleSearch}
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
                    <div className='flex '>
                        <Button
                            onClick={() => fetchTokens(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '6px',
                                marginRight: '8px'
                            }}
                        >
                            🔄 Refresh
                        </Button>
                        <Button
                            type="primary"
                            onClick={showModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '6px',
                                border: 'none',
                                marginRight: '15px',
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
            </div>

            {/* 表格 */}
            <Table
                columns={columns}
                dataSource={tokens}
                loading={loading}
                scroll={{ x: 1200 }}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showQuickJumper: false,
                    showTotal: (total, range) => `Page ${Math.ceil(range[0] / pagination.pageSize)} of ${Math.ceil(total / pagination.pageSize)}`,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    style: { textAlign: 'center' }
                }}
                onChange={handleTableChange}
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
