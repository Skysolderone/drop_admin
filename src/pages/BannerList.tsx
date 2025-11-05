import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Select, Input, Tag, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import AddBannerModal from '../components/AddBannerModal.tsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.tsx';
import api from '../lib/axios';

// 工具函数：地址加密显示（前4位后6位正常显示，中间用...替换）
const formatAddress = (address: string) => {
    if (!address || address.length <= 10) return address;
    const prefix = address.slice(0, 4);
    const suffix = address.slice(-6);
    return `${prefix}...${suffix}`;
};

// 获取图片URL的工具函数
const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    
    // 如果已经是完整的URL，直接返回
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // 如果是CDN路径，添加CDN前缀
    if (imagePath.includes('img.dropwallet.world')) {
        return `https://${imagePath}`;
    }
    
    // 其他情况，使用默认的CDN前缀
    return `https://img.dropwallet.world/${imagePath}`;
};

// 将跳转类型数字转换为文字
const getJumpTypeText = (jumpType: any): string => {
    const type = Number(jumpType);
    switch (type) {
        case 1:
            return '应用内页面';
        case 2:
            return '外部应用';
        case 3:
            return 'Stocks';
        default:
            // 如果已经是文字，直接返回
            return String(jumpType);
    }
};

const BannerList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingBanner, setEditingBanner] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // 获取Banner列表
    const fetchBanners = async (page = 1, limit = 10, status?: string, search?: string) => {
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

            const { data: result } = await api.get('/api/banners', { params });
            
            if (result.code === 200) {
                const processedBanners = result.data.banners.map((banner: any, index: number) => ({
                    key: banner.id || index.toString(),
                    id: banner.id,
                    priority: banner.priority ? Number(banner.priority) : (index + 1 + (page - 1) * limit),
                    image: banner.image || banner.banner_image,
                    mainTitle: banner.main_title || banner.title,
                    subTitle: banner.sub_title || banner.subtitle,
                    buttonText: banner.button_text || banner.btn_text,
                    jumpType: getJumpTypeText(banner.jump_type),
                    jumpUrl: banner.jump_url || banner.link_url || banner.url,
                    isActive: Number(banner.is_active) === 1 || banner.status === 'active',
                    // 添加更新时间戳，用于缓存破坏
                    updatedAt: banner.updated_at || banner.updatedAt || Date.now(),
                    ...banner
                }));

                setBanners(processedBanners);
                setPagination({
                    current: result.data.page,
                    pageSize: result.data.limit,
                    total: result.data.total,
                });
            } else {
                message.error(result.message || 'Failed to get Banner list');
            }
        } catch (error: any) {
            console.error('获取Banner列表错误:', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to get Banner list, please try again';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 初始化数据
    useEffect(() => {
        fetchBanners();
    }, []);

    // 处理分页变化
    const handleTableChange = (paginationConfig: any) => {
        fetchBanners(
            paginationConfig.current, 
            paginationConfig.pageSize, 
            statusFilter === 'all' ? undefined : statusFilter,
            searchValue
        );
    };

    // 处理搜索
    const handleSearch = () => {
        fetchBanners(1, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
    };

    // 处理状态筛选
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        fetchBanners(1, pagination.pageSize, value === 'all' ? undefined : value, searchValue);
    };

    const showModal = () => {
        setModalMode('add');
        setEditingBanner(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingBanner(null);
    };

    const handleSave = async (values: any) => {
        try {
            if (modalMode === 'add') {
                const { data: result } = await api.post('/api/banners', values);
                if (result.code === 200) {
                    message.success('Banner added successfully!');
                    setIsModalVisible(false);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchBanners(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || 'Failed to add');
                }
            } else if (modalMode === 'edit' && editingBanner) {
                const updateData = { ...values, id: editingBanner.id };
                const { data: result } = await api.put(`/api/banners/${editingBanner.id}`, updateData);
                if (result.code === 200) {
                    message.success('Banner updated successfully!');
                    setIsModalVisible(false);
                    setEditingBanner(null);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchBanners(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || 'Failed to update');
                }
            }
        } catch (error: any) {
            console.error('保存Banner错误:', error);
            message.error(error?.response?.data?.message || error?.message || 'Failed to save');
        }
    };

    const handleEdit = async (record: any) => {
        try {
            setLoading(true);
            // 从服务器获取完整的 banner 数据（包括国际化）
            const { data: result } = await api.get(`/api/banners/${record.id}`);

            if (result.code === 200) {
                setModalMode('edit');
                setEditingBanner(result.data);
                setIsModalVisible(true);
            } else {
                message.error(result.message || '获取Banner详情失败');
            }
        } catch (error: any) {
            console.error('获取Banner详情错误:', error);
            message.error(error?.response?.data?.message || error?.message || '获取Banner详情失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (record: any) => {
        setBannerToDelete(record);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!bannerToDelete) return;
        
        setDeleteLoading(true);
        try {
            const { data: result } = await api.delete(`/api/banners/${bannerToDelete.id}`);
            if (result.code === 200) {
                message.success('Banner deleted successfully!');
                fetchBanners(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
            } else {
                message.error(result.message || 'Failed to delete');
            }
        } catch (error: any) {
            console.error('删除Banner错误:', error);
            message.error(error?.response?.data?.message || error?.message || 'Failed to delete');
        } finally {
            setDeleteLoading(false);
            setDeleteModalVisible(false);
            setBannerToDelete(null);
        }
    };

    const cancelDelete = () => {
        if (deleteLoading) return; // 防止删除过程中取消
        setDeleteModalVisible(false);
        setBannerToDelete(null);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Banner Image',
            dataIndex: 'image',
            key: 'image',
            width: 120,
            render: (image: string, record: any) => {
                // 直接使用getImageUrl处理，它会自动处理CDN路径
                let imageUrl = image ? getImageUrl(image) : '';
                
                // 添加时间戳作为缓存破坏参数，确保显示最新的图片
                if (imageUrl) {
                    const separator = imageUrl.includes('?') ? '&' : '?';
                    // 使用记录的更新时间或当前时间作为版本号
                    const version = record.updatedAt || record.updated_at || Date.now();
                    imageUrl = `${imageUrl}${separator}v=${version}`;
                }
                
                if (imageUrl) {
                    return (
                        <div style={{ width: 80, height: 45, borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                            <img 
                                src={imageUrl} 
                                alt="banner" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                    if (img.parentElement) {
                                        img.parentElement.innerHTML = '<span style="font-size: 20px">🖼️</span>';
                                    }
                                }}
                            />
                        </div>
                    );
                }
                return (
                    <div style={{ width: 80, height: 45, backgroundColor: '#f0f0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px' }}>🖼️</span>
                    </div>
                );
            },
        },
        {
            title: 'Main Title ',
            dataIndex: 'mainTitle',
            key: 'mainTitle',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Sub Title ',
            dataIndex: 'subTitle',
            key: 'subTitle',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Button Text ',
            dataIndex: 'buttonText',
            key: 'buttonText',
            width: 120,
        },
        {
            title: 'Sort',
            dataIndex: 'priority',
            key: 'sort',
            width: 80,
        },
        {
            title: 'Jump Type',
            dataIndex: 'jumpType',
            key: 'jumpType',
            width: 120,
            render: (jumpType: string) => {
                let color = 'blue';
                let displayText = jumpType;
                
                if (jumpType === '应用内页面') {
                    color = 'green';
                    displayText = 'In-App Page';
                } else if (jumpType === '外部应用') {
                    color = 'blue';
                    displayText = 'External App';
                } else if (jumpType === 'Stocks') {
                    color = 'purple';
                    displayText = 'Stocks';
                }
                
                return <Tag color={color}>{displayText}</Tag>;
            },
        },
        {
            title: 'Jump URL',
            dataIndex: 'jumpUrl',
            key: 'jumpUrl',
            width: 200,
            ellipsis: true,
            render: (url: string) => {
                if (!url) return '-';
                // 如果是网址，显示格式化的地址
                if (url.startsWith('http')) {
                    return formatAddress(url);
                }
                // 其他类型直接显示
                return url;
            },
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_: any, record: any) => (
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
                        title="Edit"
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
                        title="Delete"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '20px' }}>
                    <Input
                        placeholder="Search banners..."
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
                                icon={<SearchOutlined />} 
                                onClick={handleSearch}
                                style={{ 
                                    border: 'none', 
                                    background: 'transparent',
                                    color: '#666'
                                }}
                            />
                        }
                    />
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showModal}
                            style={{
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Add Banner
                        </Button>
                    </div>
                </div>
            </div>

            {/* 表格 */}
            <Table
                columns={columns}
                dataSource={banners}
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

            {/* 添加/编辑Banner模态框 */}
            <AddBannerModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onSave={handleSave}
                initialValues={editingBanner}
                mode={modalMode}
            />

            {/* 删除确认模态框 */}
            <DeleteConfirmModal
                visible={deleteModalVisible}
                title="Confirm Delete"
                content={`Are you sure you want to delete Banner "${bannerToDelete?.mainTitle}"? This action cannot be undone.`}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                loading={deleteLoading}
            />
        </div>
    );
};

export default BannerList;