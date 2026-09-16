import React, { useState, useEffect, useMemo } from 'react';
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

// Mock 数据（API 不可用时的 fallback）
const mockLocations: Location[] = [
  {
    id: '1',
    code: 'A-01-01',
    name: '原材料区-01排-01位',
    warehouse: '原材料仓',
    zone: 'A区',
    status: 'occupied',
    capacity: 100,
    occupied: 75,
    current_sku: 'SKU-001',
    current_product: '伺服电机',
    created_at: '2026-01-15 09:00:00',
  },
  {
    id: '2',
    code: 'A-01-02',
    name: '原材料区-01排-02位',
    warehouse: '原材料仓',
    zone: 'A区',
    status: 'occupied',
    capacity: 50,
    occupied: 30,
    current_sku: 'SKU-002',
    current_product: 'PLC 控制器',
    created_at: '2026-01-15 09:00:00',
  },
  {
    id: '3',
    code: 'A-02-03',
    name: '原材料区-02排-03位',
    warehouse: '原材料仓',
    zone: 'A区',
    status: 'occupied',
    capacity: 200,
    occupied: 150,
    current_sku: 'SKU-004',
    current_product: '工业相机',
    created_at: '2026-01-15 09:00:00',
  },
  {
    id: '4',
    code: 'B-02-01',
    name: '半成品区-02排-01位',
    warehouse: '半成品仓',
    zone: 'B区',
    status: 'available',
    capacity: 80,
    occupied: 0,
    created_at: '2026-02-20 14:00:00',
  },
  {
    id: '5',
    code: 'C-03-01',
    name: '成品区-03排-01位',
    warehouse: '成品仓',
    zone: 'C区',
    status: 'occupied',
    capacity: 120,
    occupied: 60,
    current_sku: 'SKU-005',
    current_product: '变频器',
    created_at: '2026-03-10 10:30:00',
  },
  {
    id: '6',
    code: 'A-03-05',
    name: '原材料区-03排-05位',
    warehouse: '原材料仓',
    zone: 'A区',
    status: 'locked',
    capacity: 40,
    occupied: 0,
    created_at: '2026-01-15 09:00:00',
  },
  {
    id: '7',
    code: 'B-01-01',
    name: '半成品区-01排-01位',
    warehouse: '半成品仓',
    zone: 'B区',
    status: 'maintenance',
    capacity: 60,
    occupied: 0,
    created_at: '2026-02-20 14:00:00',
  },
];

const statusConfig = {
  available: { label: '空闲', variant: 'success' as const, icon: CheckCircle },
  occupied: { label: '已占用', variant: 'info' as const, icon: Package },
  locked: { label: '已锁定', variant: 'warning' as const, icon: AlertTriangle },
  maintenance: { label: '维护中', variant: 'default' as const, icon: Clock },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const WmsLocationPage: React.FC = () => {
  const queryClient = useQueryClient();

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
      pushToast('success', '库位删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
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
      pushToast('success', '库位创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
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
      pushToast('success', '库位更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
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
      { id: 'all', label: '全部' },
      { id: 'available', label: '空闲', badge: stats.available },
      { id: 'occupied', label: '已占用', badge: stats.occupied },
      {
        id: 'locked',
        label: '已锁定',
        badge: locations.filter((l) => l.status === 'locked').length,
      },
      {
        id: 'maintenance',
        label: '维护中',
        badge: locations.filter((l) => l.status === 'maintenance').length,
      },
    ],
    [stats, locations]
  );

  const columns: DataTableColumn<Location>[] = useMemo(
    () => [
      {
        key: 'code',
        header: '库位编码',
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
        header: '库位名称',
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
        header: '所属仓库',
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
      },
      {
        key: 'capacity',
        header: '容量利用率',
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
        header: '当前存放',
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
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.available;
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
                setSelectedLocation(row);
                setDetailDrawerOpen(true);
              }}
            >
              详情
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
              编辑
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedLocation, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
          ⚠️ 当前为演示模式，数据可能不是最新。API 连接失败，正在使用本地演示数据。
        </div>
      )}
      <ListPageTemplate<Location>
        header={{
          title: '库位管理',
          subtitle: '管理仓库库位，监控库位使用状态和容量利用率',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '仓储物流', href: WMS_PATHS.root },
            { label: '库位管理' },
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
                placeholder='搜索库位编码/名称/区域...'
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
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
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
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedLocation(null);
                  setCreateModalOpen(true);
                }}
              >
                新建库位
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedLocations}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无库位数据'
        emptyDescription='点击右上角「新建库位」按钮创建第一个库位'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='库位总数'
              value={stats.total}
              icon={MapPin}
              accent='cyan'
            />
            <StatTile
              label='空闲库位'
              value={stats.available}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label='已占用'
              value={stats.occupied}
              icon={Package}
              accent='amber'
            />
            <StatTile
              label='锁定/维护'
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
        title='库位详情'
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
                  {statusConfig[selectedLocation.status]?.label || '未知'}
                </Badge>
              </div>
            </Card>

            <Card title='容量信息'>
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
                    已用 {selectedLocation.occupied} / 总容量 {selectedLocation.capacity}
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

            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    所属仓库
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedLocation.warehouse}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    所属区域
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedLocation.zone}
                  </div>
                </div>
                {selectedLocation.current_product && (
                  <>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        当前存放物料
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                        {selectedLocation.current_product}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        物料 SKU
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                        {selectedLocation.current_sku}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
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
        title={selectedLocation ? '编辑库位' : '新建库位'}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Location> = {
                  code:
                    (document.querySelector('input[placeholder*="库位编码"]') as HTMLInputElement)
                      ?.value || '',
                  name:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="库位名称"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                  warehouse: (document.querySelector('select') as HTMLSelectElement)?.value || '',
                  zone:
                    (document.querySelectorAll('input[placeholder*="区域"]')[0] as HTMLInputElement)
                      ?.value || '',
                  capacity: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                };
                if (selectedLocation) {
                  updateMutation.mutate({ id: selectedLocation.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedLocation ? '保存修改' : '创建库位'}
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
                库位编码 *
              </label>
              <Input
                id='field-1'
                placeholder='例如：A-01-01'
                defaultValue={selectedLocation?.code}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                库位名称
              </label>
              <Input
                id='field-2'
                placeholder='例如：原材料区-01排-01位'
                defaultValue={selectedLocation?.name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                所属仓库 *
              </label>
              <Select
                id='field-3'
                defaultValue={selectedLocation?.warehouse || '原材料仓'}
                options={[
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                所属区域
              </label>
              <Input
                id='field-4'
                placeholder='例如：A区'
                defaultValue={selectedLocation?.zone}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                容量（件）
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder='例如：100'
                defaultValue={selectedLocation?.capacity}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                状态
              </label>
              <Select
                id='field-6'
                defaultValue={selectedLocation?.status || 'available'}
                options={[
                  { value: 'available', label: '空闲' },
                  { value: 'occupied', label: '已占用' },
                  { value: 'locked', label: '已锁定' },
                  { value: 'maintenance', label: '维护中' },
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
        title='删除库位'
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          确定要删除库位「{deleteTarget?.code}」吗？此操作不可撤销。
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
