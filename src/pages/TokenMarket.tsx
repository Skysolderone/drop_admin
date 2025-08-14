import React, { useEffect, useMemo, useState } from 'react';
import { Table, Input, Button, Select, message, Pagination } from 'antd';
import api from '../lib/axios';

type MarketRow = {
  key: string | number;
  name: string;
  symbol: string;
  address: string;
  price?: string | number | null;
  liq?: string | number | null; // Liquidity
  vol24?: string | number | null; // 24h Volume
  pair?: string;
  holders?: number | string | null;
  create_time?: string;
};

const TokenMarket: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MarketRow[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

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
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{addr}</span>
        ),
      },
      {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        width: 140,
        render: (v: any) => {
          if (v === null || v === undefined || v === '') return '-';
          const n = Number(v);
          return isNaN(n) ? String(v) : n.toLocaleString(undefined, { maximumFractionDigits: 10 });
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
      { title: 'Pair', dataIndex: 'pair', key: 'pair', width: 140, ellipsis: true },
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

  const fetchMarket = async (page = 1, limit = 10, keyword?: string) => {
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
        pair: t.pair || t.pair_symbol || undefined,
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
