import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
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
import { locationApi } from '@/api/wms/location';
import type { Location as ApiLocation } from '@/api/wms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'locations'];

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  zone: string;
  status: 'available' | 'occupied' | 'locked' | 'maintenance';
  capacity: number;
  occupied: number;
  current_sku?: string;
  current_product?: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 Location 类型映射为页面使用的 Location 类型
const mapApiLocations = (apiLocations: ApiLocation[]): Location[] => {
  return apiLocations.map((loc, index) => ({
    id: loc.id,
    code:
      (loc as any).code ||
      (loc as any).location_code ||
      `LOC-${String(index + 1).padStart(3, '0')}`,
    name: (loc as any).name || (loc as any).location_name || '-',
    warehouse: (loc as any).warehouse || (loc as any).warehouse_name || '-',
    zone: (loc as any).zone || '-',
    status: ((loc as any).status as Location['status']) || 'available',
    capacity: (loc as any).capacity || 0,
    occupied: (loc as any).occupied || 0,
    current_sku: (loc as any).current_sku || (loc as any).currentSku || '-',
    current_product: (loc as any).current_product || (loc as any).currentProduct || '-',
    remark: (loc as any).remark || '',
    created_at: loc.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockLocations

const buildStatusConfig = (t: (k: string) => string) => ({
  available: {
    label: t('wms.location_page.status_available'),
    variant: 'success' as const,
    icon: CheckCircle,
  },
  occupied: {
    label: t('wms.location_page.status_occupied'),
    variant: 'info' as const,
    icon: Package,
  },
  locked: {
    label: t('wms.location_page.status_locked'),
    variant: 'warning' as const,
    icon: AlertTriangle,
  },
  maintenance: {
    label: t('wms.location_page.status_maintenance'),
    variant: 'default' as const,
    icon: Clock,
  },
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const WmsLocationPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusConfig = useMemo(() => buildStatusConfig(t), [t]);

  const mockLocations: Location[] = [
    {
      id: '1',
      code: 'A-01-01',
      name: t('wms.demo.loc_name_1'),
      warehouse: t('wms.location_page.wh_raw_material'),
      zone: t('wms.demo.zone_a'),
      status: 'occupied',
      capacity: 100,
      occupied: 75,
      current_sku: 'SKU-001',
      current_product: t('wms.demo.inv_product_servo'),
      created_at: '2026-01-15 09:00:00',
    },
    {
      id: '2',
      code: 'A-01-02',
      name: t('wms.demo.loc_name_2'),
      warehouse: t('wms.location_page.wh_raw_material'),
      zone: t('wms.demo.zone_a'),
      status: 'occupied',
      capacity: 50,
      occupied: 30,
      current_sku: 'SKU-002',
      current_product: t('wms.demo.inv_product_plc'),
      created_at: '2026-01-15 09:00:00',
    },
    {
      id: '3',
      code: 'A-02-03',
      name: t('wms.demo.loc_name_3'),
      warehouse: t('wms.location_page.wh_raw_material'),
      zone: t('wms.demo.zone_a'),
      status: 'occupied',
      capacity: 200,
      occupied: 150,
      current_sku: 'SKU-004',
      current_product: t('wms.demo.inv_product_camera'),
      created_at: '2026-01-15 09:00:00',
    },
    {
      id: '4',
      code: 'B-02-01',
      name: t('wms.demo.loc_name_4'),
      warehouse: t('wms.location_page.wh_semi_finished'),
      zone: t('wms.demo.zone_b'),
      status: 'available',
      capacity: 80,
      occupied: 0,
      created_at: '2026-02-20 14:00:00',
    },
    {
      id: '5',
      code: 'C-03-01',
      name: t('wms.demo.loc_name_5'),
      warehouse: t('wms.location_page.wh_finished'),
      zone: t('wms.demo.zone_c'),
      status: 'occupied',
      capacity: 120,
      occupied: 60,
      current_sku: 'SKU-005',
      current_product: t('wms.demo.inv_product_inverter'),
      created_at: '2026-03-10 10:30:00',
    },
    {
      id: '6',
      code: 'A-03-05',
      name: t('wms.demo.loc_name_6'),
      warehouse: t('wms.location_page.wh_raw_material'),
      zone: t('wms.demo.zone_a'),
      status: 'locked',
      capacity: 40,
      occupied: 0,
      created_at: '2026-01-15 09:00:00',
    },
    {
      id: '7',
      code: 'B-01-01',
      name: t('wms.demo.loc_name_7'),
      warehouse: t('wms.location_page.wh_semi_finished'),
      zone: t('wms.demo.zone_b'),
      status: 'maintenance',
      capacity: 60,
      occupied: 0,
      created_at: '2026-02-20 14:00:00',
    },
  ];

  const [activeTab, setActiveTab] = useState<
    'all' | 'available' | 'occupied' | 'locked' | 'maintenance'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, warehouseFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (warehouseFilter !== 'all') {
          params.warehouse = warehouseFilter;
        }
        const res = await locationApi.list(params);
        const resData = res as unknown as {
          data?: { list?: ApiLocation[]; items?: ApiLocation[]; total?: number } | ApiLocation[];
        };
        let apiLocations: ApiLocation[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiLocations = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiLocations = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiLocations.length;
        }
        if (apiLocations.length > 0) {
          setIsMockData(false);
          return { locations: mapApiLocations(apiLocations), total };
        }
      } catch (e) {
        console.warn('[WMS Locations] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockLocations;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (l) => l.code.includes(debouncedSearch) || l.warehouse.includes(debouncedSearch)
        );
      }
      if (warehouseFilter !== 'all') {
        filtered = filtered.filter((l) => l.warehouse === warehouseFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { locations: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const locations = data?.locations || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', t('wms.location_page.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('wms.location_page.toast_delete_error'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Location>) => {
      try {
        await locationApi.create({
          code: data.code,
          name: data.name,
          warehouse: data.warehouse,
          zone: data.zone,
          status: data.status,
          capacity: data.capacity,
        } as any);
      } catch (e) {
        console.warn('[WMS Locations] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('wms.location_page.toast_create_success'));
    },
    onError: () => {
      pushToast('error', t('wms.location_page.toast_create_error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      try {
        await locationApi.update(id, {
          status: data.status,
          capacity: data.capacity,
        } as any);
      } catch (e) {
        console.warn('[WMS Locations] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('wms.location_page.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('wms.location_page.toast_update_error'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredLocations = locations;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedLocations = filteredLocations;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, warehouseFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: locations.length,
      available: locations.filter((l) => l.status === 'available').length,
      occupied: locations.filter((l) => l.status === 'occupied').length,
      locked: locations.filter((l) => l.status === 'locked' || l.status === 'maintenance').length,
    };
  }, [locations]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('wms.location_page.tab_all') },
      { id: 'available', label: t('wms.location_page.status_available'), badge: stats.available },
      { id: 'occupied', label: t('wms.location_page.status_occupied'), badge: stats.occupied },
      {
        id: 'locked',
        label: t('wms.location_page.status_locked'),
        badge: locations.filter((l) => l.status === 'locked').length,
      },
      {
        id: 'maintenance',
        label: t('wms.location_page.status_maintenance'),
        badge: locations.filter((l) => l.status === 'maintenance').length,
      },
    ],
    [stats, locations, t]
  );

  const columns: DataTableColumn<Location>[] = useMemo(
    () => [
      {
        key: 'code',
        header: t('wms.location_page.col_code'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.code}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('wms.location_page.col_name'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.zone}
            </div>
          </div>
        ),
      },
      {
        key: 'warehouse',
        header: t('wms.location_page.col_warehouse'),
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
      },
      {
        key: 'capacity',
        header: t('wms.location_page.col_capacity'),
        render: (row) => {
          const percent = row.capacity > 0 ? Math.round((row.occupied / row.capacity) * 100) : 0;
          return (
            <div style={{ minWidth: 120 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--text-xs)',
                  marginBottom: 4,
                }}
              >
                <span>
                  {row.occupied}/{row.capacity}
                </span>
                <span>{percent}%</span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: 'var(--surface-3)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor:
                      percent > 90
                        ? 'var(--error-500)'
                        : percent > 70
                          ? 'var(--warning-500)'
                          : 'var(--success-500)',
                  }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'current_product',
        header: t('wms.location_page.col_current_product'),
        render: (row) =>
          row.current_product ? (
            <div>
              <div style={{ fontSize: 'var(--text-sm)' }}>{row.current_product}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {row.current_sku}
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          ),
      },
      {
        key: 'status',
        header: t('wms.location_page.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.available;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('wms.location_page.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedLocation(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('wms.location_page.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedLocation(row);
                setCreateModalOpen(true);
              }}
            >
              {t('wms.location_page.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('wms.location_page.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedLocation, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
  );

  return (
    <>
      {isMockData && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--warning-700)',
            backgroundColor: 'color-mix(in srgb, var(--warning-500) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning-500) 30%, transparent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {t('wms.location_page.demo_banner')}
        </div>
      )}
      <ListPageTemplate<Location>
        header={{
          title: t('wms.location_page.title'),
          subtitle: t('wms.location_page.subtitle'),
          breadcrumbs: [
            { label: t('wms.location_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.location_page.breadcrumb_warehouse'), href: WMS_PATHS.root },
            { label: t('wms.location_page.title') },
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
                placeholder={t('wms.location_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('wms.location_page.filter_all_warehouse') },
                  {
                    value: t('wms.location_page.wh_raw_material'),
                    label: t('wms.location_page.wh_raw_material'),
                  },
                  {
                    value: t('wms.location_page.wh_semi_finished'),
                    label: t('wms.location_page.wh_semi_finished'),
                  },
                  {
                    value: t('wms.location_page.wh_finished'),
                    label: t('wms.location_page.wh_finished'),
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
                {t('wms.location_page.action_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedLocation(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('wms.location_page.action_new')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedLocations}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('wms.location_page.empty_title')}
        emptyDescription={t('wms.location_page.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('wms.location_page.stat_total')}
              value={stats.total}
              icon={MapPin}
              accent='cyan'
            />
            <StatTile
              label={t('wms.location_page.stat_available')}
              value={stats.available}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label={t('wms.location_page.status_occupied')}
              value={stats.occupied}
              icon={Package}
              accent='amber'
            />
            <StatTile
              label={t('wms.location_page.stat_locked_maintenance')}
              value={stats.locked}
              icon={AlertTriangle}
              accent='warning'
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

      {filteredLocations.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
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

      {/* 库位详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedLocation(null);
        }}
        title={t('wms.location_page.drawer_title')}
        size='lg'
      >
        {selectedLocation && (
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
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {selectedLocation.code}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-secondary)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedLocation.name}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedLocation.status]?.variant || 'default'}>
                  {statusConfig[selectedLocation.status]?.label ||
                    t('wms.location_page.status_unknown')}
                </Badge>
              </div>
            </Card>

            <Card title={t('wms.location_page.section_capacity')}>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-sm)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span>
                    {t('wms.location_page.capacity_used', {
                      occupied: selectedLocation.occupied,
                      capacity: selectedLocation.capacity,
                    })}
                  </span>
                  <span style={{ fontWeight: 'var(--font-semibold)' }}>
                    {selectedLocation.capacity > 0
                      ? Math.round((selectedLocation.occupied / selectedLocation.capacity) * 100)
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
                      width: `${
                        selectedLocation.capacity > 0
                          ? (selectedLocation.occupied / selectedLocation.capacity) * 100
                          : 0
                      }%`,
                      height: '100%',
                      backgroundColor:
                        selectedLocation.capacity > 0 &&
                        selectedLocation.occupied / selectedLocation.capacity > 0.9
                          ? 'var(--error-500)'
                          : selectedLocation.capacity > 0 &&
                              selectedLocation.occupied / selectedLocation.capacity > 0.7
                            ? 'var(--warning-500)'
                            : 'var(--success-500)',
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card title={t('wms.location_page.section_basic_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.location_page.col_warehouse')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedLocation.warehouse}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.location_page.label_zone')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedLocation.zone}
                  </div>
                </div>
                {selectedLocation.current_product && (
                  <>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {t('wms.location_page.label_current_material')}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                        {selectedLocation.current_product}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {t('wms.location_page.label_sku')}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                        {selectedLocation.current_sku}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('wms.location_page.label_created_at')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedLocation.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑库位弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedLocation
            ? t('wms.location_page.modal_edit_title')
            : t('wms.location_page.action_new')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('wms.location_page.button_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const codeEl = document.getElementById('field-1') as HTMLInputElement | null;
                const nameEl = document.getElementById('field-2') as HTMLInputElement | null;
                const warehouseEl = document.getElementById('field-3') as HTMLSelectElement | null;
                const zoneEl = document.getElementById('field-4') as HTMLInputElement | null;
                const capacityEl = document.getElementById('field-5') as HTMLInputElement | null;
                const formData: Partial<Location> = {
                  code: codeEl?.value || '',
                  name: nameEl?.value || '',
                  warehouse: warehouseEl?.value || '',
                  zone: zoneEl?.value || '',
                  capacity: Number(capacityEl?.value || 0),
                };
                if (selectedLocation) {
                  updateMutation.mutate({ id: selectedLocation.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedLocation
                ? t('wms.location_page.button_save')
                : t('wms.location_page.button_create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-1'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.field_code')}
              </label>
              <Input
                id='field-1'
                placeholder={t('wms.location_page.placeholder_code')}
                defaultValue={selectedLocation?.code}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.field_name')}
              </label>
              <Input
                id='field-2'
                placeholder={t('wms.location_page.placeholder_name')}
                defaultValue={selectedLocation?.name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.field_warehouse')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedLocation?.warehouse || t('wms.location_page.wh_raw_material')}
                options={[
                  {
                    value: t('wms.location_page.wh_raw_material'),
                    label: t('wms.location_page.wh_raw_material'),
                  },
                  {
                    value: t('wms.location_page.wh_semi_finished'),
                    label: t('wms.location_page.wh_semi_finished'),
                  },
                  {
                    value: t('wms.location_page.wh_finished'),
                    label: t('wms.location_page.wh_finished'),
                  },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.field_zone')}
              </label>
              <Input
                id='field-4'
                placeholder={t('wms.location_page.placeholder_zone')}
                defaultValue={selectedLocation?.zone}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.field_capacity')}
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder={t('wms.location_page.placeholder_capacity')}
                defaultValue={selectedLocation?.capacity}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('wms.location_page.col_status')}
              </label>
              <Select
                id='field-6'
                defaultValue={selectedLocation?.status || 'available'}
                options={[
                  { value: 'available', label: t('wms.location_page.status_available') },
                  { value: 'occupied', label: t('wms.location_page.status_occupied') },
                  { value: 'locked', label: t('wms.location_page.status_locked') },
                  { value: 'maintenance', label: t('wms.location_page.status_maintenance') },
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('wms.location_page.delete_modal_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('wms.location_page.button_cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('wms.location_page.button_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('wms.location_page.delete_confirm_message', { code: deleteTarget?.code })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default WmsLocationPage;
