import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Select, Input, message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../lib/axios';
import AddTokenModal from '../components/AddTokenModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { getImageUrl } from '../assets/constants';


// 工具函数：地址加密显示（前4位后6位正常显示，中间用...替换）
const formatAddress = (address: string) => {
    if (!address || address.length <= 10) return address;
    const prefix = address.slice(0, 4);
    const suffix = address.slice(-6);
    return `${prefix}...${suffix}`;
};

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
    const [editingToken, setEditingToken] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [tokenToDelete, setTokenToDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { confirm } = Modal;

    // 获取代币列表
    const fetchTokens = async (page = 1, limit = 10, status?: string, search?: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(page),
                limit: String(limit),
                // 添加时间戳确保获取最新数据
                _t: String(Date.now()),
            };

            if (status && status !== 'all') params.status = status;
            if (search) params.search = search;

            const { data: result } = await api.get('/api/tokens/tokenlists', { params });
            
            if (result.code === 200) {
                const processedTokens = result.data.tokens.map((token: any, index: number) => ({
                    key: token.id || token.token_id || index.toString(),
                    id: token.id || token.token_id,
                    priority: token.priority ? Number(token.priority) : (index + 1 + (page - 1) * limit),
                    topStatus: Number(token.top_status) === 1 || token.is_top === 1 || token.isPinned === 'yes',
                    hotStatus: Number(token.hot_status) === 1 || token.is_hot === 1 || token.isHot === 'yes', 
                    logo: token.logo || token.logo_url,
                    tokenName: token.name || token.token_name,
                    // 添加更新时间戳，用于缓存破坏
                    updatedAt: token.updated_at || token.updatedAt || Date.now(),
                    tokenSymbol: token.symbol || token.token_symbol,
                    tokenDesc: (() => {
                        try {
                            // 如果是JSON字符串，解析并提取英文描述
                            if (typeof token.token_desc === 'string' && token.token_desc.startsWith('{')) {
                                const desc = JSON.parse(token.token_desc);
                                return desc.en || desc['zh-TW'] || Object.values(desc)[0] || token.token_desc;
                            }
                            return token.description || token.token_desc || '';
                        } catch {
                            return token.description || token.token_desc || '';
                        }
                    })(),
                    tokenAddress: token.address || token.token_address,
                    swapStatus: Number(token.swap_status) !== 0 && token.swap_support !== 'no',
                    airdropStatus: Number(token.airdrop_status) === 1 || token.airdrop_support === 'yes',
                    authentication: Number(token.authentication) || 0,
                    remark: token.remark !== undefined ? token.remark : (token.remark === 0 ? 0 : ''),
                    ...token
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
        } catch (error: any) {
            console.error('获取代币列表错误:', error);
            const msg = error?.response?.data?.message || error?.message || '获取代币列表失败，请重试';
            message.error(msg);
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
        setModalMode('add');
        setEditingToken(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingToken(null);
    };

    const handleSave = async (values: any) => {
        try {
            if (modalMode === 'add') {
                const { data: result } = await api.post('/api/tokens/tokenlists/add', values);
                if (result.code === 200) {
                    message.success('代币添加成功！');
                    setIsModalVisible(false);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchTokens(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || '添加失败');
                }
            } else if (modalMode === 'edit' && editingToken) {
                const updateData = { ...values, id: editingToken.id };
                const { data: result } = await api.put(`/api/tokens/tokenlists/${editingToken.id}`, updateData);
                if (result.code === 200) {
                    message.success('代币更新成功！');
                    setIsModalVisible(false);
                    setEditingToken(null);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchTokens(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || '更新失败');
                }
            }
        } catch (error: any) {
            console.error('保存代币错误:', error);
            message.error(error?.response?.data?.message || error?.message || '保存失败');
        }
    };

    const handleEdit = (record: any) => {
        setModalMode('edit');
        setEditingToken(record);
        setIsModalVisible(true);
    };

    const handleDelete = (record: any) => {
        setTokenToDelete(record);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!tokenToDelete) return;
        
        setDeleteLoading(true);
        try {
            const { data: result } = await api.delete(`/api/tokens/tokenlists/${tokenToDelete.id}`);
            if (result.code === 200) {
                message.success('代币删除成功！');
                fetchTokens(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
            } else {
                message.error(result.message || '删除失败');
            }
        } catch (error: any) {
            console.error('删除代币错误:', error);
            message.error(error?.response?.data?.message || error?.message || '删除失败');
        } finally {
            setDeleteLoading(false);
            setDeleteModalVisible(false);
            setTokenToDelete(null);
        }
    };

    const cancelDelete = () => {
        if (deleteLoading) return; // 防止删除过程中取消
        setDeleteModalVisible(false);
        setTokenToDelete(null);
    };

    const handleExportCSV = async () => {
        try {
            const csvData = tokens.map(token => ({
                'Priority': token.priority,
                'Top Status': token.topStatus ? 'Top' : '-',
                'Hot Status': token.hotStatus ? 'Hot' : '-',
                'Token Name': token.tokenName,
                'Token Symbol': token.tokenSymbol,
                'Token Address': token.tokenAddress,
                'Swap Status': token.swapStatus ? 'Active' : 'Inactive',
                'Airdrop Status': token.airdropStatus ? 'Active' : 'Inactive'
            }));
            
            const csvHeaders = Object.keys(csvData[0] || {}).join(',');
            const csvRows = csvData.map(row => Object.values(row).join(','));
            const csvContent = [csvHeaders, ...csvRows].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `tokens_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            message.success('CSV文件导出成功！');
        } catch (error) {
            message.error('导出CSV文件失败');
        }
    };

    const handleReloadApp = async () => {
        try {
            const { data: result } = await api.get('/v1/app/reload');
            if (result.code === 200) {
                message.success('应用重载成功！');
            } else {
                message.error(result.message || '应用重载失败');
                
            }
        } catch (error: any) {
            console.error('应用重载错误:', error);
            message.error(error?.response?.data?.message || error?.message || '应用重载失败');
        }
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
            render: (logo: string, record: any) => {
                // 直接使用getImageUrl处理，它会自动处理CDN路径
                let imageUrl = logo ? getImageUrl(logo) : '';
                
                // 添加时间戳作为缓存破坏参数，确保显示最新的图片
                if (imageUrl) {
                    const separator = imageUrl.includes('?') ? '&' : '?';
                    // 使用记录的更新时间或当前时间作为版本号
                    const version = record.updatedAt || record.updated_at || Date.now();
                    imageUrl = `${imageUrl}${separator}v=${version}`;
                }
                
                console.log('Original logo:', logo, 'Generated imageUrl:', imageUrl); // 调试日志
                
                if (imageUrl) {
                    return (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                            <img 
                                src={imageUrl} 
                                alt="token logo" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    console.log('Image load error for:', imageUrl); // 调试日志
                                    const img = e.target as HTMLImageElement;
                                    
                                    // 尝试不同的URL格式
                                    const fallbackUrls = [];
                                    
                                    // 如果当前不是CDN URL，添加CDN前缀
                                    if (!img.src.includes('img.dropwallet.world')) {
                                        if (logo.startsWith('/')) {
                                            fallbackUrls.push(`https://img.dropwallet.world${logo}`);
                                        }
                                    }
                                    
                                    // 如果有备用URL，尝试第一个
                                    if (fallbackUrls.length > 0 && !img.dataset.retried) {
                                        console.log('Trying fallback URL:', fallbackUrls[0]);
                                        img.dataset.retried = 'true';
                                        img.src = fallbackUrls[0];
                                        return;
                                    }
                                    
                                    // 最终失败，显示占位符
                                    img.style.display = 'none';
                                    if (img.parentElement) {
                                        img.parentElement.innerHTML = '<span style="font-size: 20px;">📷</span>';
                                    }
                                }}
                            />
                        </div>
                    );
                }
                return (
                    <div style={{ width: 32, height: 32, backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px' }}>📷</span>
                    </div>
                );
            },
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
                    {formatAddress(address)}
                </span>
            ),
        },
        {
            title: 'Authentication',
            dataIndex: 'authentication',
            key: 'authentication',
            width: 120,
            render: (authentication: number) => (
                <Tag color={authentication === 1 ? 'green' : 'default'}>
                    {authentication === 1 ? '已认证' : '未认证'}
                </Tag>
            ),
        },
        {
            title: 'Invalid',
            dataIndex: 'remark',
            key: 'invalid',
            width: 100,
            render: (remark: string | number) => {
                const isInvalid = remark === 0 || remark === '0';
                return (
                    <Tag color={isInvalid ? 'red' : 'green'}>
                        {isInvalid ? '失效' : '有效'}
                    </Tag>
                );
            },
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
            title: 'Airdrop Status',
            dataIndex: 'airdropStatus',
            key: 'airdropStatus',
            width: 120,
            render: (status: boolean) => (
                <Tag color={status ? 'green' : 'default'}>
                    {status ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_, record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleEdit(record)}
                        style={{
                            color: '#1890ff',
                            border: 'none',
                            padding: '2px 4px',
                            height: 'auto',
                            fontSize: '16px'
                        }}
                        title="编辑"
                    >
                        ⚙️
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => handleDelete(record)}
                        style={{
                            color: '#ff4d4f',
                            border: 'none',
                            padding: '2px 4px',
                            height: 'auto',
                            fontSize: '16px'
                        }}
                        title="删除"
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
                            { value: 'Can\'t swap', label: 'Can\'t swap' },
                            { value: 'Can\'t airdrop', label: 'Can\'t airdrop' },
                            { value: 'Invalid', label: 'Invalid' },
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
                        <Button onClick={handleReloadApp}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '6px',
                                border: 'none',
                                marginRight: '15px',
                            }}
                        >
                            🔄 Refresh APP
                        </Button>
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
                            onClick={handleExportCSV}
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

            {/* 添加/编辑代币模态框 */}
            <AddTokenModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onSave={handleSave}
                initialValues={editingToken}
                mode={modalMode}
            />

            {/* 删除确认模态框 */}
            <DeleteConfirmModal
                visible={deleteModalVisible}
                title="确认删除"
                content={
                    <>
                        确定要删除代币 <strong>"{tokenToDelete?.tokenName}"</strong> 吗？<br />
                        此操作不可撤销。
                    </>
                }
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                loading={deleteLoading}
            />
        </div>
    );
};

export default TokenList;
