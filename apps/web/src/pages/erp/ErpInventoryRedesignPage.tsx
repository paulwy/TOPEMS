import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Package,
  Boxes,
  AlertTriangle,
  TrendingDown,
  Warehouse,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  ListPageTemplate,
  Pagination,
  Select,
  StatTile,
  Tabs,
  Tag,
} from '@/components/redesign';
import type { DataTableColumn } from '@/components/redesign';
import { inventoryApi } from '@/api/erp/core/inventory';
import type { Inventory as ApiInventory } from '@/api/erp/core/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['erp', 'inventory'];

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  warehouse: string;
  quantity: number;
  safety_stock: number;
  unit: string;
  unit_price: number;
  total_value: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  last_restock: string;
}

// Mock 数据
// 将 API 返回的 Inventory 类型映射为页面使用的 InventoryItem 类型
const mapApiInventory = (apiItems: ApiInventory[]): InventoryItem[] => {
  return apiItems.map((item, index) => ({
    id: item.id,
    sku: (item as any).sku || (item as any).sku_code || `SKU-${String(index + 1).padStart(3, '0')}`,
    product_name: (item as any).product_name || (item as any).productName || '-',
    category: (item as any).category || '-',
    warehouse: (item as any).warehouse || '-',
    quantity: (item as any).quantity || 0,
    safety_stock: (item as any).safety_stock || (item as any).safetyStock || 0,
    unit: (item as any).unit || '-',
    unit_price: (item as any).unit_price || (item as any).unitPrice || 0,
    total_value:
      (item as any).total_value ||
      (item as any).value ||
      ((item as any).quantity || 0) * ((item as any).unit_price || 0),
    status: ((item as any).status as InventoryItem['status']) || 'in_stock',
    last_restock: (item as any).last_restock || (item as any).lastRestock || '-',
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockInventory: InventoryItem[] = [
  {
    id: '1',
    sku: 'SM-750W-001',
    product_name: '伺服电机 750W',
    category: '电机',
    warehouse: '华东仓',
    quantity: 150,
    safety_stock: 50,
    unit: '台',
    unit_price: 3500,
    total_value: 525000,
    status: 'in_stock',
    last_restock: '2026-09-10',
  },
  {
    id: '2',
    sku: 'CX-200-PLC',
    product_name: 'PLC 控制器 CX-200',
    category: '控制器',
    warehouse: '华东仓',
    quantity: 200,
    safety_stock: 100,
    unit: '台',
    unit_price: 1200,
    total_value: 240000,
    status: 'in_stock',
    last_restock: '2026-09-08',
  },
  {
    id: '3',
    sku: 'MV-200-CAM',
    product_name: '工业相机 MV-200',
    category: '视觉',
    warehouse: '华南仓',
    quantity: 25,
    safety_stock: 30,
    unit: '台',
    unit_price: 5800,
    total_value: 145000,
    status: 'low_stock',
    last_restock: '2026-09-05',
  },
  {
    id: '4',
    sku: 'VF-5.5KW',
    product_name: '变频器 VF-5.5KW',
    category: '驱动',
    warehouse: '华南仓',
    quantity: 0,
    safety_stock: 20,
    unit: '台',
    unit_price: 4200,
    total_value: 0,
    status: 'out_of_stock',
    last_restock: '2026-08-20',
  },
  {
    id: '5',
    sku: 'HMI-7INCH',
    product_name: '触摸屏 HMI 7寸',
    category: '人机界面',
    warehouse: '华北仓',
    quantity: 500,
    safety_stock: 100,
    unit: '台',
    unit_price: 2800,
    total_value: 1400000,
    status: 'overstock',
    last_restock: '2026-09-01',
  },
];

const statusConfig = {
  in_stock: { label: '库存充足', variant: 'success' as const },
  low_stock: { label: '库存偏低', variant: 'warning' as const },
  out_of_stock: { label: '缺货', variant: 'error' as const },
  overstock: { label: '积压', variant: 'info' as const },
};

const formatAmount = (value: number) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toLocaleString('zh-CN')}`;
};

const ErpInventoryRedesignPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      try {
        // 尝试调用真实 API
        const res = await inventoryApi.list({ page: 1, pageSize: 100 });
        const resData = res as unknown as {
          data?: { items?: ApiInventory[]; list?: ApiInventory[] } | ApiInventory[];
        };
        let apiItems: ApiInventory[] = [];
        if (Array.isArray(resData)) {
          apiItems = resData;
        } else if (resData.data) {
          apiItems = Array.isArray(resData.data)
            ? resData.data
            : resData.data.items || resData.data.list || [];
        }
        if (apiItems.length > 0) {
          return { items: mapApiInventory(apiItems), total: apiItems.length };
        }
      } catch (e) {
        console.warn('[ERP Inventory] API unavailable, using mock data:', e);
      }
      return { items: mockInventory, total: mockInventory.length };
    },
  });

  const items = data?.items || [];

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }
    if (warehouseFilter !== 'all') {
      result = result.filter((i) => i.warehouse === warehouseFilter);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.sku.toLowerCase().includes(query) ||
          i.product_name.toLowerCase().includes(query) ||
          i.category.toLowerCase().includes(query)
      );
    }
    return result;
  }, [items, activeTab, warehouseFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, warehouseFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const totalSKU = items.length;
    const lowStock = items.filter((i) => i.status === 'low_stock').length;
    const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;
    const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);
    return { totalSKU, lowStock, outOfStock, totalValue };
  }, [items]);

  const tabsConfig = [
    { id: 'all', label: '全部' },
    {
      id: 'in_stock',
      label: '库存充足',
      badge: items.filter((i) => i.status === 'in_stock').length,
    },
    { id: 'low_stock', label: '库存偏低', badge: stats.lowStock },
    { id: 'out_of_stock', label: '缺货', badge: stats.outOfStock },
  ];

  const getStockLevel = (item: InventoryItem) => {
    const ratio = item.quantity / item.safety_stock;
    if (ratio >= 2) return { color: 'var(--success)', label: '充足' };
    if (ratio >= 1) return { color: 'var(--warning)', label: '正常' };
    if (ratio >= 0.5) return { color: 'var(--error)', label: '偏低' };
    return { color: 'var(--error)', label: '严重不足' };
  };

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'sku',
      header: 'SKU 编码',
      sortable: true,
      render: (row) => (
        <span
          style={{
            fontWeight: 'var(--font-semibold)',
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {row.sku}
        </span>
      ),
    },
    {
      key: 'product_name',
      header: '产品名称',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.product_name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {row.category}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: '仓库',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Warehouse
            size={14}
            style={{ color: 'var(--text-tertiary)' }}
          />
          <span>{row.warehouse}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: '库存数量',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {row.quantity} {row.unit}
          </div>
          {/* 库存水平进度条 */}
          <div
            style={{
              width: 80,
              height: 4,
              backgroundColor: 'var(--surface-2)',
              borderRadius: 2,
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (row.quantity / (row.safety_stock * 2)) * 100)}%`,
                height: '100%',
                backgroundColor: getStockLevel(row).color,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'safety_stock',
      header: '安全库存',
      align: 'right',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {row.safety_stock} {row.unit}
        </span>
      ),
    },
    {
      key: 'total_value',
      header: '库存价值',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-medium)' }}>
          {formatAmount(row.total_value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      align: 'center',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.in_stock;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedItem(row);
              setDetailDrawerOpen(true);
            }}
          >
            详情
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<InventoryItem>
        header={{
          title: '库存管理',
          subtitle: '管理库存商品，跟踪库存水平和库存价值',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '企业资源' },
            { label: '库存管理' },
          ],
        }}
        toolbar={
          <>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                placeholder='搜索 SKU/产品名称/分类...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部仓库' },
                  { value: '华东仓', label: '华东仓' },
                  { value: '华南仓', label: '华南仓' },
                  { value: '华北仓', label: '华北仓' },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                刷新
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedItems}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无库存商品'
        emptyDescription='暂无库存数据'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='SKU 总数'
              value={stats.totalSKU}
              icon={Package}
              accent='cyan'
            />
            <StatTile
              label='库存偏低'
              value={stats.lowStock}
              icon={AlertTriangle}
              accent='warning'
            />
            <StatTile
              label='缺货商品'
              value={stats.outOfStock}
              icon={TrendingDown}
              accent='error'
            />
            <StatTile
              label='库存总价值'
              value={formatAmount(stats.totalValue)}
              icon={Boxes}
              accent='amber'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </ListPageTemplate>

      {filteredItems.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onChange={setCurrentPage}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* 库存详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedItem(null);
        }}
        title='库存详情'
        size='lg'
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {selectedItem.sku}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedItem.product_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedItem.category} · {selectedItem.warehouse}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedItem.status]?.variant || 'default'}>
                  {statusConfig[selectedItem.status]?.label || '未知'}
                </Badge>
              </div>
            </Card>

            {/* 库存水平可视化 */}
            <Card title='库存水平'>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span>当前库存</span>
                  <span style={{ fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)' }}>
                    {selectedItem.quantity} {selectedItem.unit}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 12,
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (selectedItem.quantity / (selectedItem.safety_stock * 2)) * 100)}%`,
                      height: '100%',
                      backgroundColor: getStockLevel(selectedItem).color,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>
                    安全库存：{selectedItem.safety_stock} {selectedItem.unit}
                  </span>
                  <span>{getStockLevel(selectedItem).label}</span>
                </div>
              </div>
            </Card>

            <Card title='库存信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    仓库
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedItem.warehouse}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    计量单位
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedItem.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    单价
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    ¥{selectedItem.unit_price.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    库存价值
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-bold)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatAmount(selectedItem.total_value)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    最近补货日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedItem.last_restock}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default ErpInventoryRedesignPage;
