import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Select, Input, message, Modal } from 'antd';
import api from '../lib/axios';
import AddTokenModal from '../components/AddTokenModal';
import { useLocation, useNavigate } from 'react-router-dom';

const TokenList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editRecord, setEditRecord] = useState<any | null>(null);
    const [tokens, setTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const location = useLocation();
    const navigate = useNavigate();

    // 获取代币列表
    const fetchTokens = async (page = 1, limit = 10, status?: string, search?: string) => {
        setLoading(true);
        console.log('fetchTokens 调用参数:', { page, limit, status, search });
        try {
            // 后端读取的是 req.query，且路由为 
            const params: Record<string, string> = {
                page: String(page),
                limit: String(limit),
            };

            if (status) {
                // 直接传递状态过滤器
                params.status = status;
                console.log('设置状态过滤器:', status);
            }
            if (search) params.search = search;
            
            console.log('最终请求参数:', params);

            const { data: result } = await api.get(
                '/api/tokens/tokenlists',
                {
                    params,
                    // Authorization 由拦截器自动附加
                }
            );
            // 调试日志便于确认返回结构
            if (import.meta.env?.MODE !== 'production') {
                // eslint-disable-next-line no-console
                console.debug('tokens/tokenlists result:', result);
            }

            const ok = result?.success === true || result?.code === 200;
            if (ok) {
                // 按后端返回结构进行映射
                const processedTokens = (result.data?.tokens || []).map((token: any, index: number) => {
                    // 兼容列名：服务端 SELECT * FROM t_airdrop_token
                    const name = token.token_name ?? token.name ?? '';
                    const symbol = token.token_symbol ?? token.symbol ?? '';
                    const address = token.token_address ?? token.address ?? '';
                    const logo = token.logo ?? token.icon ?? '';
                    const dbPriority = token.priority ?? undefined;
                    return {
                        key: token.id ?? String(index),
                        // 用数据库 priority 字段（而不是行号）
                        priority: dbPriority ?? index + 1 + (page - 1) * limit,
                        id: token.id,
                        name,
                        symbol,
                        address,
                        price: token.price, // 若无该列则为 undefined
                        priceSource: token.price_source,
                        decimals: token.decimals,
                        status: token.status, // 若存在
                        createAt: token.create_at,
                        updateAt: token.update_at,
                        icon: logo,
                        remark: token.remark,
                        // 供编辑回填的原始字段
                        token_desc: token.token_desc,
                        swap_status: token.swap_status,
                        swap_desc: token.swap_desc,
                        no_swap_url: token.no_swap_url,
                        airdrop_status: token.airdrop_status,
                        top_status: token.top_status,
                        hot_status: token.hot_status,
                        logo,
                    };
                });

                setTokens(processedTokens);
                setPagination({
                    current: result.data.page,
                    pageSize: result.data.limit,
                    total: result.data.total,
                });
            } else {
                message.error(result?.msg || result?.message || '获取代币列表失败');
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
        fetchTokens(1, 10, statusFilter, searchValue);
    }, []);

    // 解析查询参数，支持深链接：?id=2&tab=airdrop
    const skipAutoOpenRef = React.useRef(false);
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const id = sp.get('id');
        if (skipAutoOpenRef.current) return;
        if (id) {
            // 如果已有数据，尝试匹配；没有则等待 fetch 完成后手动点开也能匹配
            const rec = tokens.find((t) => String(t.id) === String(id));
            if (rec) {
                setEditRecord(rec);
                setIsModalVisible(true);
            } else {
                // 若当前页未命中，尝试拉取第一页并查找
                // 简化：不额外请求，保留参数，用户可手动搜；避免额外耦合
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, tokens]);

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
        fetchTokens(1, pagination.pageSize, statusFilter, searchValue);
    };

    // 处理状态筛选
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        fetchTokens(1, pagination.pageSize, value, searchValue);
    };

    const showModal = () => {
        setEditRecord(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditRecord(null);
        // 清理 URL 查询参数
        const sp = new URLSearchParams(location.search);
        sp.delete('id');
        sp.delete('tab');
        navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : '' }, { replace: true });
    };

    const handleSave = async (values: any) => {
        try {
            // 新增：使用 FormData；编辑：使用 JSON（避免文件解析问题）
            const isEdit = !!editRecord?.id;
            const fd = new FormData();
            // 基本字段
            fd.append('tokenName', values.tokenName);
            fd.append('tokenSymbol', values.tokenSymbol);
            fd.append('tokenAddress', values.tokenAddress);
            fd.append('priority', String(values.priority ?? '0'));
            fd.append('isPinned', values.isPinned ?? 'no');
            fd.append('isHot', values.isHot ?? 'no');
            // 描述
            if (values.description) {
                fd.append('description', JSON.stringify(values.description));
            }
            // Swap
            fd.append('swapSupport', values.swapSupport ?? 'yes');
            if (values.swapSupport === 'no') {
                const swapReason: Record<string, string> = {};
                ['en', 'zh-TW', 'ja', 'hi', 'pl', 'es', 'pt', 'ms', 'id', 'ko'].forEach((k) => {
                    const v = values[`swapReason_${k}`];
                    if (v) swapReason[k] = v;
                });
                fd.append('swapReason', JSON.stringify(swapReason));
                if (values.swapUrl) fd.append('swapUrl', values.swapUrl);
            }
            // Airdrop
            fd.append('airdropSupport', values.airdropSupport ?? 'yes');
            // 统一构造将要提交的 airdropMethods（包含 imageUrl，并保证 countries 非空时传真实列表，空则回退为默认全量）
            const DEFAULT_ALL_COUNTRIES = ['US', 'TH', 'MY', 'ID', 'PL'];
            const COUNTRY_NAME_MAP: Record<string, string> = { US: '美国', TH: '泰国', MY: '马来西亚', ID: '印度尼西亚', PL: '波兰' };
            const methodsForPayload = (values.airdropMethods && Array.isArray(values.airdropMethods))
                ? values.airdropMethods.map((m: any) => {
                    // 提取图片 URL（优先从 Upload 的 fileList 获取）
                    let imageUrl: string | undefined;
                    const fl = Array.isArray(m.image) ? m.image : [];
                    const f0 = fl[0] || {};
                    imageUrl = f0.url || f0.thumbUrl || f0.response?.url || f0.response?.data?.url;
                    if (!imageUrl && typeof m.imageUrl === 'string') imageUrl = m.imageUrl;

                    // countries：若为空则回退默认全量；提交时转为对象数组 [{code,name}]
                    let countryCodes: string[] = Array.isArray(m.countries) ? m.countries : [];
                    if (!countryCodes || countryCodes.length === 0) countryCodes = DEFAULT_ALL_COUNTRIES;
                    const countries = countryCodes.map((code) => ({ code, name: COUNTRY_NAME_MAP[code] || code }));

                    // devices：若未勾选，回退为全量
                    const devices: string[] = Array.isArray(m.devices) && m.devices.length > 0 ? m.devices : ['android', 'ios'];

                    // offlineDate：支持 dayjs/Date/string
                    const od = m.offlineDate;
                    let offlineStr: string | undefined;
                    if (od?.toDate) {
                        try { offlineStr = od.toDate().toISOString(); } catch { /* noop */ }
                    } else if (od instanceof Date) {
                        offlineStr = od.toISOString();
                    } else if (typeof od === 'string') {
                        offlineStr = od;
                    }

                    return {
                        openingStatus: m.openingStatus ?? 'enable',
                        url: m.url,
                        imageUrl,
                        rank: m.rank != null ? Number(m.rank) : 0,
                        amountPerDay: m.amountPerDay != null ? Number(m.amountPerDay) : undefined,
                        valuePerDay: m.valuePerDay != null ? Number(m.valuePerDay) : undefined,
                        countries,
                        devices,
                        offlineDate: offlineStr,
                        oneOffStatus: m.oneOffStatus ?? 'disable',
                    };
                })
                : [];
            // Logo 文件
            if (Array.isArray(values.tokenLogo) && values.tokenLogo[0]?.originFileObj) {
                fd.append('logo', values.tokenLogo[0].originFileObj as File);
            }

            // 处理 logo：若 AddTokenModal 明确传入 logo（包括空字符串表示删除），则按其为准；否则回落到 tokenLogo[0].url
            const logoPayload = (values.logo !== undefined)
                ? values.logo
                : ((Array.isArray(values.tokenLogo) && values.tokenLogo[0]?.url) || undefined);

        const { data: result } = isEdit
                ? await api.put(`/api/tokens/tokenlists/${encodeURIComponent(editRecord.id)}`, {
                    id: editRecord.id,
                    tokenName: values.tokenName,
                    tokenSymbol: values.tokenSymbol,
                    tokenAddress: values.tokenAddress,
                    priority: values.priority,
                    isPinned: values.isPinned,
                    isHot: values.isHot,
                    logo: logoPayload,
                    description: values.description,
                    swapSupport: values.swapSupport,
                    swapReason: values.swapSupport === 'no' ? JSON.parse(fd.get('swapReason') as string) : undefined,
                    swapUrl: values.swapUrl,
                    airdropSupport: values.airdropSupport,
            airdropMethods: methodsForPayload,
                })
                : await api.post('/api/tokens/tokenlists/add', {
                    tokenName: values.tokenName,
                    tokenSymbol: values.tokenSymbol,
                    tokenAddress: values.tokenAddress,
                    priority: values.priority,
                    isPinned: values.isPinned,
                    isHot: values.isHot,
                    logo: logoPayload,
                    description: values.description,
                    swapSupport: values.swapSupport,
                    swapReason: values.swapSupport === 'no' ? JSON.parse(fd.get('swapReason') as string) : undefined,
                    swapUrl: values.swapUrl,
                    airdropSupport: values.airdropSupport,
            airdropMethods: methodsForPayload,
                });

            const ok = result?.code === 200;
            if (!ok) throw new Error(result?.msg || '保存失败');

            message.success('代币添加成功！');
            // 先关闭并清理 URL，避免 tokens 刷新触发的 useEffect 因 id 存在而再次打开弹窗
            skipAutoOpenRef.current = true;
            setIsModalVisible(false);
            const sp = new URLSearchParams(location.search);
            sp.delete('id');
            sp.delete('tab');
            navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : '' }, { replace: true });

            fetchTokens(pagination.current, pagination.pageSize, statusFilter, searchValue);
            // 稍后允许自动打开（例如用户手动点击某一项后）
            setTimeout(() => { skipAutoOpenRef.current = false; }, 300);
            return result;
        } catch (err: any) {
            console.error('保存代币失败:', err);
            message.error(err?.message || '保存代币失败');
            return { code: -1, message: err?.message };
        }
    };

    // 软删除token
    const handleDelete = async (record: any) => {
        const { confirm } = Modal;
        
        confirm({
            title: '确认删除',
            content: `确定要删除代币 "${record.name} (${record.symbol})" 吗？此操作将标记为已删除状态。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const response = await api.delete(`/api/tokens/tokenlists/${encodeURIComponent(record.id)}`);
                    const result = response.data;
                    const ok = result?.code === 200;
                    if (!ok) throw new Error(result?.message || '删除失败');
                    
                    message.success('代币删除成功！');
                    // 刷新列表
                    fetchTokens(pagination.current, pagination.pageSize, statusFilter, searchValue);
                } catch (err: any) {
                    console.error('删除代币失败:', err);
                    message.error(err?.message || '删除代币失败');
                }
            }
        });
    };

    const columns = [
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 90,
        },
        {
            title: 'Top Status',
            dataIndex: 'top_status',
            key: 'top_status',
            width: 110,
            render: (v: any) => {
                const yes = v === 1 || v === '1' || v === true;
                return <Tag color={yes ? 'green' : 'default'}>{yes ? 'Yes' : 'No'}</Tag>;
            }
        },
        {
            title: 'Hot Status',
            dataIndex: 'hot_status',
            key: 'hot_status',
            width: 110,
            render: (v: any) => {
                const yes = v === 1 || v === '1' || v === true;
                return <Tag color={yes ? 'red' : 'default'}>{yes ? 'Hot' : 'No'}</Tag>;
            }
        },
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: 'logo',
            width: 90,
            render: (_: any, record: any) => (
                <div style={{ width: 32, height: 32, backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {record.logo ? (
                        <img src={record.logo} alt={record.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    ) : (
                        (record.symbol?.[0] || '📷')
                    )}
                </div>
            ),
        },
        {
            title: 'Token Name',
            dataIndex: 'name',
            key: 'name',
            width: 160,
            ellipsis: true,
        },
        {
            title: 'Token Symbol',
            dataIndex: 'symbol',
            key: 'symbol',
            width: 140,
        },
        {
            title: 'Token Desc',
            dataIndex: 'token_desc',
            key: 'token_desc',
            width: 240,
            ellipsis: true,
            render: (val: any) => {
                if (!val) return '-';
                try {
                    const obj = typeof val === 'string' ? JSON.parse(val) : val;
                    const text = obj?.en || Object.values(obj || {})[0];
                    if (!text) return '-';
                    const s = String(text);
                    return s.length > 80 ? s.slice(0, 80) + '…' : s;
                } catch {
                    const s = String(val);
                    return s.length > 80 ? s.slice(0, 80) + '…' : s;
                }
            }
        },
        {
            title: 'Token Address',
            dataIndex: 'address',
            key: 'address',
            width: 380,
            ellipsis: true,
            render: (address: string) => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {address}
                </span>
            ),
        },
        {
            title: 'Swap Status',
            dataIndex: 'swap_status',
            key: 'swap_status',
            width: 120,
            render: (v: any) => {
                const support = v === 1 || v === '1' || v === true;
                return <Tag color={support ? 'green' : 'default'}>{support ? 'Support' : 'No'}</Tag>;
            }
        },
        {
            title: 'Airdrop Status',
            dataIndex: 'airdrop_status',
            key: 'airdrop_status',
            width: 120,
            render: (v: any) => {
                const support = v === 1 || v === '1' || v === true;
                return <Tag color={support ? 'green' : 'default'}>{support ? 'Support' : 'No'}</Tag>;
            }
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
                        style={{
                            color: '#1890ff',
                            border: 'none',
                            padding: '2px 4px',
                            height: 'auto',
                            fontSize: '16px'
                        }}
                        onClick={() => {
                            setEditRecord(record);
                            setIsModalVisible(true);
                            // 将 id 与默认 tab 写入 URL，以便刷新/分享
                            const sp = new URLSearchParams(location.search);
                            sp.set('id', String(record.id));
                            // 不再强制设为 airdrop，保留默认 basic。需要深链接某页签时可手动加 &tab=airdrop
                            navigate({ pathname: location.pathname, search: `?${sp.toString()}` }, { replace: true });
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
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(record);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '20px' }}>
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
                            onClick={() => fetchTokens(pagination.current, pagination.pageSize, statusFilter, searchValue)}
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
                mode={editRecord ? 'edit' : 'add'}
                initialValues={editRecord || undefined}
                defaultTabKey={(() => {
                    const tab = (new URLSearchParams(location.search)).get('tab');
                    return tab === 'airdrop' ? 'airdrop' : tab === 'swap' ? 'swap' : 'basic';
                })()}
            />
        </div>
    );
};

export default TokenList;