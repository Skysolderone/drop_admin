import React, { useEffect, useMemo, useState } from 'react';
import { Table, Input, Button, Select, message, Pagination } from 'antd';
import api from '../lib/axios';

// 工具函数：地址加密显示（前4位后6位正常显示，中间用...替换）
const formatAddress = (address: string) => {
  if (!address || address.length <= 10) return address;
  const prefix = address.slice(0, 4);
  const suffix = address.slice(-6);
  return `${prefix}...${suffix}`;
};

type MarketRow = {
  key: string | number;
  name: string;
  symbol: string;
  address: string;
  price?: string | number | null;
  liq?: string | number | null; // Liquidity
  vol24?: string | number | null; // 24h Volume
  tokenCreate?: string;
  holders?: number | string | null;
  create_time?: string;
};

const TokenMarket: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MarketRow[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const columns = useMemo(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
      { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 120 },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        width: 340,
        ellipsis: true,
        render: (addr: string) => (
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatAddress(addr)}</span>
        ),
      },
      {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        width: 140,
        render: (v: any) => {
          if (v === null || v === undefined || v === '') return '-';
          const numPrice = Number(v);
          
          if (isNaN(numPrice)) return String(v);
          
          if (numPrice === 0) {
            return '0';
          }
          
          if (numPrice > 0) {
            // 对于极小的数值，使用科学计数法来获取精确的字符串表示
            let priceStr = numPrice.toString();
            
            // 如果是科学计数法格式，需要转换
            if (priceStr.includes('e')) {
              // 使用更高精度来处理
              priceStr = numPrice.toFixed(20).replace(/\.?0+$/, '');
            } else {
              priceStr = numPrice.toFixed(10).replace(/\.?0+$/, '');
            }
            
            // 如果结果是'0'，说明数值太小，使用科学计数法的字符串
            if (priceStr === '0') {
              priceStr = numPrice.toString();
              // 如果原始字符串也是0或科学计数法但实际为0，直接返回'0'
              if (priceStr === '0' || /^0(\.0+)?e?[\+\-]?\d*$/i.test(priceStr)) {
                return '0';
              }
            }
            
            // 检查是否有小数部分且以0开头
            if (priceStr.includes('.') && priceStr.split('.')[1].startsWith('0')) {
              const [integer, decimal] = priceStr.split('.');
              
              // 如果小数部分全是0，直接返回整数部分
              if (/^0+$/.test(decimal)) {
                return integer;
              }
              
              // 计算连续的0的数量
              let zeroCount = 0;
              for (let i = 0; i < decimal.length; i++) {
                if (decimal[i] === '0') {
                  zeroCount++;
                } else {
                  break;
                }
              }
              
              if (zeroCount > 2) {
                // 生成下标数字
                const subscriptDigits = {
                  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
                  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
                };
                const subscriptCount = zeroCount.toString().split('').map(d => subscriptDigits[d]).join('');
                const remainingDigits = decimal.substring(zeroCount);
                
                return (
                  <span>
                    {integer}.0{subscriptCount}{remainingDigits}
                  </span>
                );
              }
            }
            
            return priceStr;
          }
          
          return String(v);
        },
      },
      {
        title: 'LIQ',
        dataIndex: 'liq',
        key: 'liq',
        width: 120,
        render: (v: any) => (v === null || v === undefined || v === '' ? '-' : v),
      },
      {
        title: 'Volume (24h)',
        dataIndex: 'vol24',
        key: 'vol24',
        width: 160,
        render: (v: any) => (v === null || v === undefined || v === '' ? '-' : v),
      },
      { title: 'tokenCreate', dataIndex: 'tokenCreate', key: 'tokenCreate', width: 140, ellipsis: true },
      { title: 'Holders', dataIndex: 'holders', key: 'holders', width: 120 },
      {
        title: 'Create_time',
        dataIndex: 'create_time',
        key: 'create_time',
        width: 180,
        render: (t: string) => (t ? new Date(t).toLocaleString() : '-'),
      },
    ],
    []
  );

  const fetchMarket = async (page = 1, limit = 20, keyword?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (keyword) params.search = keyword;

      // 后端是 POST，读取 req.query，这里用 params 传参
      const { data: result } = await api.post('/api/market/list', null, { params });

      const ok = result?.success === true || result?.code === 200;
      if (!ok) {
        message.error(result?.msg || result?.message || '获取市场列表失败');
        return;
      }

      const list: any[] = result.data?.tokens || [];
      console.log('📊 前端接收到的数据:', list.length, '条');
      console.log('📊 前端原始数据:', list);
      
      const rows: MarketRow[] = list.map((t: any, idx: number) => ({
        key: t.id ?? `${(page - 1) * limit + idx}`,
        name: t.name || '-',
        symbol: t.symbol || '-',
        address: t.address || '-',
        price: t.price,
        liq: t.liq ?? t.liquidity ?? undefined,
        vol24: t.vol24 ?? t.volume_24h ?? t.volume24h ?? undefined,
        tokenCreate: t.token_create_at ? new Date(t.token_create_at).toLocaleString() : (t.pair_symbol || undefined),
        holders: t.holders ?? t.holder_count ?? undefined,
        create_time: t.create_time || t.create_at || t.created_at || undefined,
      }));

      console.log('📊 前端处理后的rows:', rows);
      setData(rows);
      setPagination({ current: Number(result.data.page) || page, pageSize: Number(result.data.limit) || limit, total: Number(result.data.total) || 0 });
    } catch (e: any) {
      console.error('fetchMarket error:', e);
      message.error(e?.message || '获取市场列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    fetchMarket(1, pagination.pageSize, search);
  };

  const onChangePage = (page: number, pageSize: number) => {
    fetchMarket(page, pageSize, search);
  };

  const handleExportCSV = async () => {
    try {
      const csvData = data.map(token => ({
        'Name': token.name,
        'Symbol': token.symbol,
        'Address': token.address,
        'Price': token.price || '-',
        'Liquidity': token.liq || '-',
        'Volume 24h': token.vol24 || '-',
        'Token Create': token.tokenCreate || '-',
        'Holders': token.holders || '-',
        'Create Time': token.create_time ? new Date(token.create_time).toLocaleString() : '-'
      }));

      const csvHeaders = Object.keys(csvData[0] || {}).join(',');
      const csvRows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','));
      const csvContent = [csvHeaders, ...csvRows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `token_market_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('CSV文件导出成功！');
    } catch (error) {
      message.error('导出CSV文件失败');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6"></h1>

      {/* 顶部搜索栏，贴近原型样式 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={onSearch}
          style={{ width: 360, borderRadius: 6 }}
          suffix={
            <Button type="text" size="small" onClick={onSearch} style={{ border: 'none' }}>
              🔍
            </Button>
          }
        />
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

      {/* 表格 */}
      <Table
        columns={columns as any}
        dataSource={data}
        loading={loading}
        rowKey="key"
        size="middle"
        bordered
        scroll={{ x: 1200 }}
        pagination={false}
      />

      {/* 右对齐的分页区 + Show entries */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <div style={{ color: 'rgba(0,0,0,.45)' }}>
          Page {pagination.current} of {Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageSize || 10)))}
        </div>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger={false}
          showQuickJumper={false}
          onChange={(page, pageSize) => onChangePage(page, pageSize)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Show</span>
          <Select
            value={pagination.pageSize}
            style={{ width: 80 }}
            options={[{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }, { value: 50, label: '50' }]}
            onChange={(ps) => fetchMarket(1, ps, search)}
          />
          <span>entries</span>
        </div>
      </div>
    </div>
  );
};

export default TokenMarket;
