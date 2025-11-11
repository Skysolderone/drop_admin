import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Select, Input, Tag, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import AddPopupModal from '../components/AddPopupModal';
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

const PopupList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [popups, setPopups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingPopup, setEditingPopup] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [popupToDelete, setPopupToDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [dailyLimit, setDailyLimit] = useState<number>(5);
    const [isEditingLimit, setIsEditingLimit] = useState(false);

    // 获取Popup列表
    const fetchPopups = async (page = 1, limit = 10, status?: string, search?: string) => {
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

            const { data: result } = await api.get('/api/popup', { params });
            
            if (result.code === 200) {
                const processedPopups = result.data.popups.map((popup: any, index: number) => ({
                    key: popup.id || index.toString(),
                    id: popup.id,
                    priority: popup.priority ? Number(popup.priority) : (index + 1 + (page - 1) * limit),
                    image: popup.image,
                    popupName: popup.popupName,
                    jumpType: popup.jumpType,
                    jumpUrl: popup.jumpUrl,
                    isActive: Number(popup.isActive) === 1 || popup.isActive === true,
                    allowDevices: popup.allowDevices,
                    // 添加更新时间戳，用于缓存破坏
                    updatedAt: popup.updateTime || Date.now(),
                    ...popup
                }));

                setPopups(processedPopups);
                setPagination({
                    current: result.data.page,
                    pageSize: result.data.limit,
                    total: result.data.total,
                });
            } else {
                message.error(result.message || 'Failed to get Popup list');
            }
        } catch (error: any) {
            console.error('获取Popup列表错误:', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to get Popup list, please try again';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 初始化数据
    useEffect(() => {
        fetchPopups();
        fetchDailyLimit();
    }, []);

    // 获取每日弹窗数量上限配置
    const fetchDailyLimit = async () => {
        try {
            const { data: result } = await api.get('/api/config/dialog-limit');
            if (result.code === 200) {
                setDailyLimit(result.data.value);
            }
        } catch (error: any) {
            console.error('获取配置失败:', error);
            // 失败时使用默认值5
            setDailyLimit(5);
        }
    };

    // 保存每日弹窗数量上限配置
    const saveDailyLimit = async (value: number) => {
        try {
            const { data: result } = await api.put('/api/config/dialog-limit', { value });
            if (result.code === 200) {
                setIsEditingLimit(false);
                message.success('每日弹窗数量上限已更新');
            } else {
                message.error(result.message || '更新失败');
            }
        } catch (error: any) {
            console.error('保存配置失败:', error);
            message.error(error?.response?.data?.message || error?.message || '保存失败');
        }
    };

    // 处理分页变化
    const handleTableChange = (paginationConfig: any) => {
        fetchPopups(
            paginationConfig.current, 
            paginationConfig.pageSize, 
            statusFilter === 'all' ? undefined : statusFilter,
            searchValue
        );
    };

    // 处理搜索
    const handleSearch = () => {
        fetchPopups(1, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
    };

    // 处理状态筛选
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        fetchPopups(1, pagination.pageSize, value === 'all' ? undefined : value, searchValue);
    };

    const showModal = () => {
        setModalMode('add');
        setEditingPopup(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingPopup(null);
    };

    const handleSave = async (values: any) => {
        try {
            if (modalMode === 'add') {
                const { data: result } = await api.post('/api/popup', values);
                if (result.code === 200) {
                    message.success('Popup added successfully!');
                    setIsModalVisible(false);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchPopups(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || 'Failed to add');
                }
            } else if (modalMode === 'edit' && editingPopup) {
                const updateData = { ...values, id: editingPopup.id };
                const { data: result } = await api.put(`/api/popup/${editingPopup.id}`, updateData);
                if (result.code === 200) {
                    message.success('Popup updated successfully!');
                    setIsModalVisible(false);
                    setEditingPopup(null);
                    // 添加短暂延迟，确保后端处理完成后再刷新列表
                    setTimeout(() => {
                        fetchPopups(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
                    }, 500);
                } else {
                    message.error(result.message || 'Failed to update');
                }
            }
        } catch (error: any) {
            console.error('保存Popup错误:', error);
            message.error(error?.response?.data?.message || error?.message || 'Failed to save');
        }
    };

    const handleEdit = async (record: any) => {
        try {
            setLoading(true);
            // 从服务器获取完整的 popup 数据
            const { data: result } = await api.get(`/api/popup/${record.id}`);

            if (result.code === 200) {
                // 转换数据格式以适配模态框
                const popupData = result.data;
                
                // 转换 jumpType: 数字/字符串转文字
                let jumpTypeText = '外部应用';
                const jumpTypeValue = Number(popupData.jumpType);
                if (jumpTypeValue === 1) {
                    jumpTypeText = '应用内页面';
                } else if (jumpTypeValue === 2) {
                    jumpTypeText = '外部应用';
                } else if (jumpTypeValue === 3) {
                    jumpTypeText = 'Stocks';
                }
                
                // 转换 isActive: 数字/字符串转文字
                let isActiveText = 'active';
                const isActiveValue = Number(popupData.isActive);
                if (isActiveValue === 1) {
                    isActiveText = 'active';
                } else if (isActiveValue === 2) {
                    isActiveText = 'inactive';
                }
                
                // 转换 allowDevices: 数字/字符串转数组
                let allowDevicesArray = ['android', 'ios'];
                const allowDevicesValue = Number(popupData.allowDevices);
                if (allowDevicesValue === 1) {
                    allowDevicesArray = ['android'];
                } else if (allowDevicesValue === 2) {
                    allowDevicesArray = ['ios'];
                } else if (allowDevicesValue === 3) {
                    allowDevicesArray = ['android', 'ios'];
                }
                
                // 组装转换后的数据
                const formattedData = {
                    ...popupData,
                    jumpType: jumpTypeText,
                    isActive: isActiveText,
                    allowDevices: allowDevicesArray,
                };
                
                setModalMode('edit');
                setEditingPopup(formattedData);
                setIsModalVisible(true);
            } else {
                message.error(result.message || '获取Popup详情失败');
            }
        } catch (error: any) {
            console.error('获取Popup详情错误:', error);
            message.error(error?.response?.data?.message || error?.message || '获取Popup详情失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (record: any) => {
        setPopupToDelete(record);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!popupToDelete) return;
        
        setDeleteLoading(true);
        try {
            const { data: result } = await api.delete(`/api/popup/${popupToDelete.id}`);
            if (result.code === 200) {
                message.success('Popup deleted successfully!');
                fetchPopups(pagination.current, pagination.pageSize, statusFilter === 'all' ? undefined : statusFilter, searchValue);
            } else {
                message.error(result.message || 'Failed to delete');
            }
        } catch (error: any) {
            console.error('删除Popup错误:', error);
            message.error(error?.response?.data?.message || error?.message || 'Failed to delete');
        } finally {
            setDeleteLoading(false);
            setDeleteModalVisible(false);
            setPopupToDelete(null);
        }
    };

    const cancelDelete = () => {
        if (deleteLoading) return; // 防止删除过程中取消
        setDeleteModalVisible(false);
        setPopupToDelete(null);
    };

    const columns = [
        {
            title: 'Order',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Popup Name',
            dataIndex: 'popupName',
            key: 'popupName',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Image (English)',
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
                                alt="popup" 
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
            title: 'Sort',
            dataIndex: 'priority',
            key: 'sort',
            width: 80,
            sorter: (a: any, b: any) => a.priority - b.priority,
            defaultSortOrder: 'ascend' as const, // 默认升序排列
        },
        {
            title: 'Jump Type',
            dataIndex: 'jumpType',
            key: 'jumpType',
            width: 100,
            render: (jumpType: number | string) => {
                // 将数字或数字字符串转换为文字
                let typeText = '';
                let color = 'green';
                
                if (jumpType === 1 || jumpType === '1' || jumpType === '应用内页面') {
                    typeText = 'In-App Page';
                    color = 'green';
                } else if (jumpType === 2 || jumpType === '2' || jumpType === '外部应用') {
                    typeText = 'External App';
                    color = 'blue';
                } else if (jumpType === 3 || jumpType === '3' || jumpType === 'Stocks') {
                    typeText = 'Stocks';
                    color = 'purple';
                } else {
                    typeText = String(jumpType);
                }
                
                return <Tag color={color}>{typeText}</Tag>;
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
            render: (isActive: number | boolean | string) => {
                // 将数字、数字字符串或布尔值转换为布尔值：1 或 '1' = active (true), 2 或 '2' = inactive (false)
                const isActiveValue = isActive === 1 || isActive === '1' || isActive === true;
                return (
                    <Tag color={isActiveValue ? 'green' : 'red'}>
                        {isActiveValue ? 'Active' : 'Inactive'}
                    </Tag>
                );
            },
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
                    
                    {/* 每日弹窗数量上限配置 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>每日弹窗数量上限:</span>
                        {isEditingLimit ? (
                            <>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={dailyLimit}
                                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                                    style={{ width: '80px' }}
                                    onPressEnter={() => saveDailyLimit(dailyLimit)}
                                />
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => saveDailyLimit(dailyLimit)}
                                >
                                    修改
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setIsEditingLimit(false);
                                        fetchDailyLimit(); // 取消时重新获取原值
                                    }}
                                >
                                    取消
                                </Button>
                            </>
                        ) : (
                            <>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>{dailyLimit}</span>
                                <Button
                                    size="small"
                                    onClick={() => setIsEditingLimit(true)}
                                >
                                    编辑
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '20px' }}>
                    <Input
                        placeholder="Search popups..."
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
                            Add Pop-up
                        </Button>
                    </div>
                </div>
            </div>

            {/* 表格 */}
            <Table
                columns={columns}
                dataSource={popups}
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

            {/* 添加/编辑Popup模态框 */}
            <AddPopupModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onSave={handleSave}
                initialValues={editingPopup}
                mode={modalMode}
            />

            {/* 删除确认模态框 */}
            <DeleteConfirmModal
                visible={deleteModalVisible}
                title="Confirm Delete"
                content={`Are you sure you want to delete Pop-up "${popupToDelete?.popupName}"? This action cannot be undone.`}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                loading={deleteLoading}
            />
        </div>
    );
};

export default PopupList;