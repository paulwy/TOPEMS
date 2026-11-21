import React, { useState, useEffect, useMemo } from 'react';
import styles from './ErpInventoryRedesignPage.module.css';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Eye,
  Package,
  Boxes,
  AlertTriangle,
  TrendingDown,
  Warehouse,
  Plus,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  ListPageTemplate,
  Pagination,
  Select,
  StatTile,
  Tabs,
} from '@/components/redesign';
import type { DataTableColumn } from '@/components/redesign';
import { Modal } from '@/components/redesign/overlay/Modal';
import { useTranslation } from 'react-i18next';
import { inventoryApi } from '@/api/erp/core/inventory';
import type { Inventory as ApiInventory, CreateInventoryRequest } from '@/api/erp/core/types';
import { useNotificationStore } from '@/store/notificationStore';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['erp', 'inventory'];

// 详情/卡片重复样式（等价抽取，值不变）
const detailLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
};
const detailValue: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
};

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
// 将 API 返回的 Inventory 类型映射为页面使用的 InventoryItem 类型。
// 部分历史接口使用驼峰别名，收窄为可选字段（ApiInventoryCompat），避免 `as any`。
type InventoryTab = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type ApiInventoryCompat = ApiInventory & {
  sku_code?: string;
  product_name?: string;
  sku?: string;
  category?: string;
  warehouse?: string;
  quantity?: number;
  safety_stock?: number;
  unit?: string;
  unit_price?: number;
  total_value?: number;
  last_restock?: string;
  productName?: string;
  safetyStock?: number;
  unitPrice?: number;
  value?: number;
  lastRestock?: string;
  status?: string;
};

const mapApiInventory = (apiItems: ApiInventoryCompat[]): InventoryItem[] => {
  return apiItems.map((item, index) => ({
    id: item.id,
    sku: item.sku || item.sku_code || `SKU-${String(index + 1).padStart(3, '0')}`,
    product_name: item.product_name || item.productName || '-',
    category: item.category || '-',
    warehouse: item.warehouse || '-',
    quantity: item.quantity || 0,
    safety_stock: item.safety_stock || item.safetyStock || 0,
    unit: item.unit || '-',
    unit_price: item.unit_price || item.unitPrice || 0,
    total_value: item.total_value || item.value || (item.quantity || 0) * (item.unit_price || 0),
    status: (item.status as InventoryItem['status']) || 'in_stock',
    last_restock: item.last_restock || item.lastRestock || '-',
  }));
};

// N2: 不再内置本地种子假数据；API 不可用或返回空时渲染空列表，并提示接口状态。

const ErpInventoryRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    material_code: '',
    material_name: '',
    specification: '',
    unit: '',
    warehouse_name: '',
    quantity: 0,
    safety_stock: 0,
    unit_cost: 0,
    batch_number: '',
  });

  const resetForm = () => {
    setForm({
      material_code: '',
      material_name: '',
      specification: '',
      unit: '',
      warehouse_name: '',
      quantity: 0,
      safety_stock: 0,
      unit_cost: 0,
      batch_number: '',
    });
  };

  // 金额格式化（含"万"单位，需 t() 取数，故置于组件内）
  const formatAmount = (value: number) => {
    if (value >= 10000) {
      return t('erp.erp_inventory_redesign.format.amount_wan', { v0: (value / 10000).toFixed(1) });
    }
    return `¥${value.toLocaleString('zh-CN')}`;
  };

  const statusConfig = useMemo(
    () => ({
      in_stock: {
        label: t('erp.erp_inventory_redesign.status.in_stock'),
        variant: 'success' as const,
      },
      low_stock: {
        label: t('erp.erp_inventory_redesign.status.low_stock'),
        variant: 'warning' as const,
      },
      out_of_stock: {
        label: t('erp.erp_inventory_redesign.status.out_of_stock'),
        variant: 'error' as const,
      },
      overstock: {
        label: t('erp.erp_inventory_redesign.status.overstock'),
        variant: 'info' as const,
      },
    }),
    [t]
  );

  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
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
      // N2: 只展示真实接口数据；不再回退本地种子假数据
      try {
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
        return { items: mapApiInventory(apiItems), total: apiItems.length };
      } catch (e) {
        console.warn('[ERP Inventory] API unavailable, showing empty list:', e);
        return { items: [], total: 0 };
      }
    },
  });

  const handleCreate = async () => {
    if (!form.material_code.trim() || !form.material_name.trim()) {
      addNotification({
        type: 'error',
        title: t('erp.erp_inventory_redesign.modal.title'),
        message: t('erp.erp_inventory_redesign.modal.required'),
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateInventoryRequest = {
        material_id: '',
        material_code: form.material_code.trim(),
        material_name: form.material_name.trim(),
        specification: form.specification.trim() || undefined,
        unit: form.unit.trim() || undefined,
        warehouse_id: '',
        warehouse_name: form.warehouse_name.trim() || '',
        quantity: Number(form.quantity) || 0,
        safety_stock: Number(form.safety_stock) || undefined,
        unit_cost: Number(form.unit_cost) || undefined,
        batch_number: form.batch_number.trim() || undefined,
      };
      await inventoryApi.create(payload);
      addNotification({
        type: 'success',
        title: t('erp.erp_inventory_redesign.modal.title'),
        message: t('erp.erp_inventory_redesign.modal.success'),
      });
      setCreateOpen(false);
      resetForm();
      refetch();
    } catch (e) {
      addNotification({
        type: 'error',
        title: t('erp.erp_inventory_redesign.modal.title'),
        message: (e as { message?: string }).message || t('erp.erp_inventory_redesign.modal.title'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
    { id: 'all', label: t('erp.erp_inventory_redesign.tab.all') },
    {
      id: 'in_stock',
      label: t('erp.erp_inventory_redesign.tab.in_stock'),
      badge: items.filter((i) => i.status === 'in_stock').length,
    },
    {
      id: 'low_stock',
      label: t('erp.erp_inventory_redesign.tab.low_stock'),
      badge: stats.lowStock,
    },
    {
      id: 'out_of_stock',
      label: t('erp.erp_inventory_redesign.tab.out_of_stock'),
      badge: stats.outOfStock,
    },
  ];

  const getStockLevel = (item: InventoryItem) => {
    const ratio = item.quantity / item.safety_stock;
    if (ratio >= 2)
      return {
        color: 'var(--success)',
        label: t('erp.erp_inventory_redesign.stock_level.sufficient'),
      };
    if (ratio >= 1)
      return { color: 'var(--warning)', label: t('erp.erp_inventory_redesign.stock_level.normal') };
    if (ratio >= 0.5)
      return { color: 'var(--error)', label: t('erp.erp_inventory_redesign.stock_level.low') };
    return { color: 'var(--error)', label: t('erp.erp_inventory_redesign.stock_level.critical') };
  };

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'sku',
      header: t('erp.erp_inventory_redesign.column.sku'),
      sortable: true,
      render: (row) => <span className={styles.il1}>{row.sku}</span>,
    },
    {
      key: 'product_name',
      header: t('erp.erp_inventory_redesign.column.product_name'),
      render: (row) => (
        <div>
          <div className={styles.il2}>{row.product_name}</div>
          <div className={styles.il3}>{row.category}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: t('erp.erp_inventory_redesign.column.warehouse'),
      render: (row) => (
        <div className={styles.il4}>
          <Warehouse
            size={14}
            className={styles.il5}
          />
          <span>{row.warehouse}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: t('erp.erp_inventory_redesign.column.quantity'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <div>
          <div className={styles.il6}>
            {row.quantity} {row.unit}
          </div>
          {/* 库存水平进度条 */}
          <div className={styles.il7}>
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
      header: t('erp.erp_inventory_redesign.column.safety_stock'),
      align: 'right',
      render: (row) => (
        <span className={styles.il8}>
          {row.safety_stock} {row.unit}
        </span>
      ),
    },
    {
      key: 'total_value',
      header: t('erp.erp_inventory_redesign.column.total_value'),
      align: 'right',
      sortable: true,
      render: (row) => <span className={styles.il9}>{formatAmount(row.total_value)}</span>,
    },
    {
      key: 'status',
      header: t('erp.erp_inventory_redesign.column.status'),
      align: 'center',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.in_stock;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: t('erp.erp_inventory_redesign.column.actions'),
      align: 'right',
      render: (row) => (
        <div className={styles.il10}>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedItem(row);
              setDetailDrawerOpen(true);
            }}
          >
            {t('erp.erp_inventory_redesign.action.detail')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<InventoryItem>
        header={{
          title: t('erp.erp_inventory_redesign.title'),
          subtitle: t('erp.erp_inventory_redesign.subtitle'),
          breadcrumbs: [
            { label: t('erp.erp_inventory_redesign.breadcrumb.home'), href: '/dashboard' },
            { label: t('erp.erp_inventory_redesign.breadcrumb.erp') },
            { label: t('erp.erp_inventory_redesign.breadcrumb.inventory') },
          ],
        }}
        toolbar={
          <>
            <div className={styles.il11}>
              <Input
                placeholder={t('erp.erp_inventory_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className={styles.il12}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('erp.erp_inventory_redesign.filter.all_warehouses') },
                  {
                    value: t('erp.erp_inventory_redesign.warehouse.east'),
                    label: t('erp.erp_inventory_redesign.warehouse.east'),
                  },
                  {
                    value: t('erp.erp_inventory_redesign.warehouse.south'),
                    label: t('erp.erp_inventory_redesign.warehouse.south'),
                  },
                  {
                    value: t('erp.erp_inventory_redesign.warehouse.north'),
                    label: t('erp.erp_inventory_redesign.warehouse.north'),
                  },
                ]}
                className={styles.il13}
              />
            </div>
            <div className={styles.il14}>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => setCreateOpen(true)}
              >
                {t('erp.erp_inventory_redesign.button.create')}
              </Button>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('erp.erp_inventory_redesign.button.refresh')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedItems}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('erp.erp_inventory_redesign.empty.title')}
        emptyDescription={t('erp.erp_inventory_redesign.empty.description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('erp.erp_inventory_redesign.stat.total_sku')}
              value={stats.totalSKU}
              icon={Package}
              accent='cyan'
            />
            <StatTile
              label={t('erp.erp_inventory_redesign.stat.low_stock')}
              value={stats.lowStock}
              icon={AlertTriangle}
              accent='warning'
            />
            <StatTile
              label={t('erp.erp_inventory_redesign.stat.out_of_stock')}
              value={stats.outOfStock}
              icon={TrendingDown}
              accent='error'
            />
            <StatTile
              label={t('erp.erp_inventory_redesign.stat.total_value')}
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
          onChange={(id) => setActiveTab(id as InventoryTab)}
        />
      </ListPageTemplate>

      {filteredItems.length > 0 && (
        <div className={styles.il15}>
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
        title={t('erp.erp_inventory_redesign.drawer.detail_title')}
        size='lg'
      >
        {selectedItem && (
          <div className={styles.il16}>
            <Card>
              <div className={styles.il17}>
                <div>
                  <div style={detailLabel}>{selectedItem.sku}</div>
                  <div className={styles.il18}>{selectedItem.product_name}</div>
                  <div className={styles.il19}>
                    {selectedItem.category} · {selectedItem.warehouse}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedItem.status]?.variant || 'default'}>
                  {statusConfig[selectedItem.status]?.label ||
                    t('erp.erp_inventory_redesign.status.unknown')}
                </Badge>
              </div>
            </Card>

            {/* 库存水平可视化 */}
            <Card title={t('erp.erp_inventory_redesign.drawer.stock_level')}>
              <div className={styles.il20}>
                <div className={styles.il21}>
                  <span>{t('erp.erp_inventory_redesign.drawer.current_stock')}</span>
                  <span className={styles.il22}>
                    {selectedItem.quantity} {selectedItem.unit}
                  </span>
                </div>
                <div className={styles.il23}>
                  <div
                    style={{
                      width: `${Math.min(100, (selectedItem.quantity / (selectedItem.safety_stock * 2)) * 100)}%`,
                      height: '100%',
                      backgroundColor: getStockLevel(selectedItem).color,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div className={styles.il24}>
                  <span>
                    {t('erp.erp_inventory_redesign.drawer.safety_stock_label', {
                      value: selectedItem.safety_stock,
                      unit: selectedItem.unit,
                    })}
                  </span>
                  <span>{getStockLevel(selectedItem).label}</span>
                </div>
              </div>
            </Card>

            <Card title={t('erp.erp_inventory_redesign.drawer.stock_info')}>
              <div className={styles.il25}>
                <div>
                  <div style={detailLabel}>{t('erp.erp_inventory_redesign.drawer.warehouse')}</div>
                  <div style={detailValue}>{selectedItem.warehouse}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('erp.erp_inventory_redesign.drawer.unit')}</div>
                  <div style={detailValue}>{selectedItem.unit}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('erp.erp_inventory_redesign.drawer.unit_price')}</div>
                  <div className={styles.il26}>
                    ¥{selectedItem.unit_price.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div style={detailLabel}>
                    {t('erp.erp_inventory_redesign.drawer.total_value')}
                  </div>
                  <div className={styles.il27}>{formatAmount(selectedItem.total_value)}</div>
                </div>
                <div>
                  <div style={detailLabel}>
                    {t('erp.erp_inventory_redesign.drawer.last_restock')}
                  </div>
                  <div className={styles.il28}>{selectedItem.last_restock}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* N2: 新建库存记录入口（提交走真实 inventoryApi.create，成功后刷新列表） */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        title={t('erp.erp_inventory_redesign.modal.title')}
        size='lg'
        footer={
          <div className={styles.il29}>
            <Button
              variant='ghost'
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              {t('erp.erp_inventory_redesign.modal.cancel')}
            </Button>
            <Button
              variant='primary'
              disabled={submitting}
              onClick={handleCreate}
            >
              {t('erp.erp_inventory_redesign.modal.submit')}
            </Button>
          </div>
        }
      >
        <div className={styles.il30}>
          {(
            [
              ['material_code', t('erp.erp_inventory_redesign.modal.field.material_code')],
              ['material_name', t('erp.erp_inventory_redesign.modal.field.material_name')],
              ['specification', t('erp.erp_inventory_redesign.modal.field.specification')],
              ['unit', t('erp.erp_inventory_redesign.modal.field.unit')],
              ['warehouse_name', t('erp.erp_inventory_redesign.modal.field.warehouse_name')],
              ['batch_number', t('erp.erp_inventory_redesign.modal.field.batch_number')],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={styles.il31}
            >
              <span style={detailLabel}>{label}</span>
              <Input
                value={String(form[key])}
                onChange={(e) => setField(key, e.target.value)}
              />
            </label>
          ))}
          {(
            [
              ['quantity', t('erp.erp_inventory_redesign.modal.field.quantity')],
              ['safety_stock', t('erp.erp_inventory_redesign.modal.field.safety_stock')],
              ['unit_cost', t('erp.erp_inventory_redesign.modal.field.unit_cost')],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={styles.il32}
            >
              <span style={detailLabel}>{label}</span>
              <Input
                type='number'
                min={0}
                value={String(form[key])}
                onChange={(e) => setField(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default ErpInventoryRedesignPage;
