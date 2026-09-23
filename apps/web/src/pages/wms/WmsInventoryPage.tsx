import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Package,
  Box,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  ListPageTemplate,
  Modal,
  Pagination,
  Select,
  StatTile,
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { WMS_PATHS } from '@/modules/wms/config';
import { inventoryApi } from '@/api/wms/inventory';
import type { InventoryItem as ApiInventoryItem } from '@/api/wms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'inventory'];

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  product_code: string;
  warehouse: string;
  location: string;
  quantity: number;
  safety_stock: number;
  unit: string;
  unit_price: number;
  total_value: number;
  status: 'normal' | 'low' | 'out' | 'overstock';
  updated_at: string;
}

// Mock 数据
// 将 API 返回的 InventoryItem 类型映射为页面使用的 InventoryItem 类型
const mapApiInventory = (apiItems: ApiInventoryItem[]): InventoryItem[] => {
  return apiItems.map((item, index) => ({
    id: item.id,
    sku: (item as any).sku || (item as any).sku_code || `SKU-${String(index + 1).padStart(3, '0')}`,
    product_name: (item as any).product_name || (item as any).productName || '-',
    product_code: (item as any).product_code || (item as any).productCode || '-',
    warehouse: (item as any).warehouse || '-',
    location: (item as any).location || '-',
    quantity: (item as any).quantity || 0,
    safety_stock: (item as any).safety_stock || (item as any).safetyStock || 0,
    unit: (item as any).unit || '-',
    unit_price: (item as any).unit_price || (item as any).unitPrice || 0,
    total_value:
      (item as any).total_value ||
      (item as any).totalValue ||
      ((item as any).quantity || 0) * ((item as any).unit_price || 0),
    status: ((item as any).status as InventoryItem['status']) || 'normal',
    last_restock: (item as any).last_restock || (item as any).lastRestock || '-',
    updated_at: (item as any).updated_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockInventory

const buildStatusConfig = (t: (k: string) => string) => ({
  normal: { label: t('wms.inventory_page.status_normal'), variant: 'success' as const },
  low: { label: t('wms.inventory_page.status_low'), variant: 'warning' as const },
  out: { label: t('wms.inventory_page.status_out'), variant: 'error' as const },
  overstock: { label: t('wms.inventory_page.status_overstock'), variant: 'amber' as const },
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const WmsInventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig = useMemo(() => buildStatusConfig(t), [t]);

  const mockInventory: InventoryItem[] = [
    {
      id: '1',
      sku: 'SKU-001',
      product_name: t('wms.demo.inv_product_servo'),
      product_code: 'MTR-SERVO-750',
      warehouse: t('wms.inventory_page.wh_raw_material'),
      location: 'A-01-01',
      quantity: 520,
      safety_stock: 100,
      unit: t('wms.demo.unit_piece'),
      unit_price: 850,
      total_value: 442000,
      status: 'normal',
      updated_at: '2026-09-13 14:30:00',
    },
    {
      id: '2',
      sku: 'SKU-002',
      product_name: t('wms.demo.inv_product_plc'),
      product_code: 'PLC-1200',
      warehouse: t('wms.inventory_page.wh_raw_material'),
      location: 'A-01-02',
      quantity: 85,
      safety_stock: 100,
      unit: t('wms.demo.unit_piece'),
      unit_price: 2400,
      total_value: 204000,
      status: 'low',
      updated_at: '2026-09-13 15:20:00',
    },
    {
      id: '3',
      sku: 'SKU-003',
      product_name: t('wms.demo.inv_product_hmi'),
      product_code: 'HMI-7INCH',
      warehouse: t('wms.inventory_page.wh_semi_finished'),
      location: 'B-02-01',
      quantity: 0,
      safety_stock: 50,
      unit: t('wms.demo.unit_piece'),
      unit_price: 1200,
      total_value: 0,
      status: 'out',
      updated_at: '2026-09-12 09:15:00',
    },
    {
      id: '4',
      sku: 'SKU-004',
      product_name: t('wms.demo.inv_product_camera'),
      product_code: 'CAM-5MP',
      warehouse: t('wms.inventory_page.wh_raw_material'),
      location: 'A-02-03',
      quantity: 1500,
      safety_stock: 200,
      unit: t('wms.demo.unit_ge'),
      unit_price: 350,
      total_value: 525000,
      status: 'overstock',
      updated_at: '2026-09-13 11:45:00',
    },
    {
      id: '5',
      sku: 'SKU-005',
      product_name: t('wms.demo.inv_product_inverter'),
      product_code: 'INV-2.2KW',
      warehouse: t('wms.inventory_page.wh_finished'),
      location: 'C-03-01',
      quantity: 320,
      safety_stock: 80,
      unit: t('wms.demo.unit_piece'),
      unit_price: 680,
      total_value: 217600,
      status: 'normal',
      updated_at: '2026-09-13 16:00:00',
    },
    {
      id: '6',
      sku: 'SKU-006',
      product_name: t('wms.demo.inv_product_sensor'),
      product_code: 'SENSOR-PROX',
      warehouse: t('wms.inventory_page.wh_raw_material'),
      location: 'A-03-05',
      quantity: 28,
      safety_stock: 50,
      unit: t('wms.demo.unit_ge'),
      unit_price: 120,
      total_value: 3360,
      status: 'low',
      updated_at: '2026-09-13 10:30:00',
    },
  ];

  const formatAmount = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}${t('wms.inventory_page.unit_wan')}`;
    }
    return value.toLocaleString('zh-CN');
  };

  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'low' | 'out' | 'overstock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        // 尝试调用真实 API
        const res = await inventoryApi.list({ page: 1, pageSize: 100 } as any);
        const resData = res as unknown as {
          data?: { list?: ApiInventoryItem[]; items?: ApiInventoryItem[] } | ApiInventoryItem[];
        };
        let apiItems: ApiInventoryItem[] = [];
        if (Array.isArray(resData)) {
          apiItems = resData;
        } else if (resData.data) {
          apiItems = Array.isArray(resData.data)
            ? resData.data
            : resData.data.list || resData.data.items || [];
        }
        if (apiItems.length > 0) {
          return { items: mapApiInventory(apiItems), total: apiItems.length };
        }
      } catch (e) {
        console.warn('[WMS Inventory] API unavailable, using mock data:', e);
      }
      return { items: mockInventory, total: mockInventory.length };
    },
  });

  const items = data?.items || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

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
          i.product_code.toLowerCase().includes(query)
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
    const lowStock = items.filter((i) => i.status === 'low' || i.status === 'out').length;
    const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);
    const overstock = items.filter((i) => i.status === 'overstock').length;
    return { totalSKU, lowStock, totalValue, overstock };
  }, [items]);

  const tabsConfig = [
    { id: 'all', label: t('wms.inventory_page.tab_all') },
    {
      id: 'normal',
      label: t('wms.inventory_page.status_normal'),
      badge: items.filter((i) => i.status === 'normal').length,
    },
    {
      id: 'low',
      label: t('wms.inventory_page.status_low'),
      badge: items.filter((i) => i.status === 'low').length,
    },
    {
      id: 'out',
      label: t('wms.inventory_page.status_out'),
      badge: items.filter((i) => i.status === 'out').length,
    },
    {
      id: 'overstock',
      label: t('wms.inventory_page.status_overstock'),
      badge: items.filter((i) => i.status === 'overstock').length,
    },
  ];

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)' }}>
          {row.sku}
        </span>
      ),
    },
    {
      key: 'product_name',
      header: t('wms.inventory_page.col_product_name'),
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.product_name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {row.product_code}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: t('wms.inventory_page.col_warehouse'),
      render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
    },
    {
      key: 'location',
      header: t('wms.inventory_page.col_location'),
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {row.location}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: t('wms.inventory_page.col_quantity'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-semibold)' }}>
            {row.quantity.toLocaleString()} {row.unit}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {t('wms.inventory_page.safety_stock_label', { count: row.safety_stock })}
          </div>
        </div>
      ),
    },
    {
      key: 'total_value',
      header: t('wms.inventory_page.col_value'),
      align: 'right',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
          ¥{formatAmount(row.total_value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('wms.inventory_page.col_status'),
      align: 'center',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.normal;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: t('wms.inventory_page.col_actions'),
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
            {t('wms.inventory_page.action_detail')}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<Edit2 size={14} />}
            onClick={() => pushToast('info', t('wms.inventory_page.toast_adjust_dev'))}
          >
            {t('wms.inventory_page.action_adjust')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<InventoryItem>
        header={{
          title: t('wms.inventory_page.title'),
          subtitle: t('wms.inventory_page.subtitle'),
          breadcrumbs: [
            { label: t('wms.inventory_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.inventory_page.breadcrumb_warehouse'), href: WMS_PATHS.root },
            { label: t('wms.inventory_page.title') },
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
                placeholder={t('wms.inventory_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('wms.inventory_page.filter_all_warehouse') },
                  {
                    value: t('wms.inventory_page.wh_raw_material'),
                    label: t('wms.inventory_page.wh_raw_material'),
                  },
                  {
                    value: t('wms.inventory_page.wh_semi_finished'),
                    label: t('wms.inventory_page.wh_semi_finished'),
                  },
                  {
                    value: t('wms.inventory_page.wh_finished'),
                    label: t('wms.inventory_page.wh_finished'),
                  },
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
                {t('wms.inventory_page.action_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => pushToast('info', t('wms.inventory_page.toast_adjust_dev'))}
              >
                {t('wms.inventory_page.action_adjust_stock')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedItems}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('wms.inventory_page.empty_title')}
        emptyDescription={t('wms.inventory_page.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('wms.inventory_page.stat_sku_count')}
              value={stats.totalSKU}
              icon={Package}
              accent='cyan'
            />
            <StatTile
              label={t('wms.inventory_page.stat_low_warning')}
              value={stats.lowStock}
              icon={AlertTriangle}
              accent='warning'
            />
            <StatTile
              label={t('wms.inventory_page.stat_total_value')}
              value={`¥${formatAmount(stats.totalValue)}`}
              icon={TrendingUp}
              accent='success'
            />
            <StatTile
              label={t('wms.inventory_page.stat_overstock')}
              value={stats.overstock}
              icon={TrendingDown}
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
        title={t('wms.inventory_page.drawer_title')}
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
                    {selectedItem.product_code}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedItem.status]?.variant || 'default'}>
                  {statusConfig[selectedItem.status]?.label ||
                    t('wms.inventory_page.status_unknown')}
                </Badge>
              </div>
            </Card>

            <Card title={t('wms.inventory_page.section_inventory_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.inventory_page.label_current_stock')}
                  </div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
                    {selectedItem.quantity.toLocaleString()} {selectedItem.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.inventory_page.label_safety_stock')}
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
                    {selectedItem.safety_stock.toLocaleString()} {selectedItem.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.inventory_page.label_warehouse_location')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedItem.warehouse} / {selectedItem.location}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.inventory_page.label_price_value')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    ¥{selectedItem.unit_price.toLocaleString()} / ¥
                    {selectedItem.total_value.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            <Card title={t('wms.inventory_page.section_level_analysis')}>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-sm)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  <span>{t('wms.inventory_page.stock_level')}</span>
                  <span>
                    {selectedItem.safety_stock > 0
                      ? Math.round((selectedItem.quantity / selectedItem.safety_stock) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    backgroundColor: 'var(--surface-3)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        selectedItem.safety_stock > 0
                          ? (selectedItem.quantity / selectedItem.safety_stock) * 100
                          : 0
                      )}%`,
                      height: '100%',
                      backgroundColor:
                        selectedItem.status === 'out'
                          ? 'var(--error-500)'
                          : selectedItem.status === 'low'
                            ? 'var(--warning-500)'
                            : 'var(--success-500)',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  {t('wms.inventory_page.last_updated', {
                    date: formatDateTime(selectedItem.updated_at),
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default WmsInventoryPage;
