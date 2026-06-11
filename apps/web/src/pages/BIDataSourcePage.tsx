import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Plus,
  Search,
  Filter,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  MoreVertical,
  Activity,
  Server,
  HardDrive,
  Wifi,
  WifiOff,
  Grid3X3,
  List,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/EmptyState';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { fetchDashboards, createDashboard, deleteDashboard, type Dashboard } from '../api/bi';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  host: string;
  database: string;
  last_sync?: string;
  sync_frequency?: string;
  tables_count?: number;
}

const DataSourceCard = ({
  datasource,
  onSync,
  onView,
  onEdit,
  onDelete,
}: {
  datasource: DataSource;
  onSync: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          icon: <Wifi className='w-3.5 h-3.5' />,
          label: '活跃',
          dotColor: 'bg-emerald-500',
        };
      case 'inactive':
        return {
          color: 'bg-slate-50 text-slate-600 border-slate-100',
          icon: <WifiOff className='w-3.5 h-3.5' />,
          label: '未激活',
          dotColor: 'bg-slate-400',
        };
      case 'error':
        return {
          color: 'bg-rose-50 text-rose-600 border-rose-100',
          icon: <XCircle className='w-3.5 h-3.5' />,
          label: '异常',
          dotColor: 'bg-rose-500',
        };
      default:
        return {
          color: 'bg-slate-50 text-slate-600 border-slate-100',
          icon: <Activity className='w-3.5 h-3.5' />,
          label: status,
          dotColor: 'bg-slate-400',
        };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'postgresql':
        return { icon: '🐘', color: 'bg-blue-50 text-blue-600', label: 'PostgreSQL' };
      case 'mysql':
        return { icon: '🐬', color: 'bg-cyan-50 text-cyan-600', label: 'MySQL' };
      case 'mongodb':
        return { icon: '🍃', color: 'bg-emerald-50 text-emerald-600', label: 'MongoDB' };
      case 'redis':
        return { icon: '🔴', color: 'bg-rose-50 text-rose-600', label: 'Redis' };
      case 'elasticsearch':
        return { icon: '🔍', color: 'bg-amber-50 text-amber-600', label: 'Elasticsearch' };
      default:
        return { icon: '💾', color: 'bg-slate-50 text-slate-600', label: type };
    }
  };

  const statusConfig = getStatusConfig(datasource.status);
  const typeConfig = getTypeConfig(datasource.type);

  return (
    <div className='group bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-300'>
      {/* Header */}
      <div className='relative px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className={`p-2.5 rounded-xl border ${typeConfig.color}`}>
              <span className='text-xl'>{typeConfig.icon}</span>
            </div>
            <div>
              <h3 className='font-semibold text-slate-900 group-hover:text-blue-600 transition-colors'>
                {datasource.name}
              </h3>
              <div className='flex items-center gap-2 mt-0.5'>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                <span className='text-xs text-slate-500'>{typeConfig.label}</span>
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className='p-5'>
        {/* Connection Info */}
        <div className='space-y-3 mb-4'>
          <div className='flex items-center gap-3 text-sm'>
            <Server className='w-4 h-4 text-slate-400' />
            <span className='text-slate-500'>主机:</span>
            <span className='font-medium text-slate-700'>{datasource.host}</span>
          </div>
          <div className='flex items-center gap-3 text-sm'>
            <HardDrive className='w-4 h-4 text-slate-400' />
            <span className='text-slate-500'>数据库:</span>
            <span className='font-medium text-slate-700'>{datasource.database}</span>
          </div>
          {datasource.tables_count && (
            <div className='flex items-center gap-3 text-sm'>
              <Database className='w-4 h-4 text-slate-400' />
              <span className='text-slate-500'>表数量:</span>
              <span className='font-medium text-slate-700'>{datasource.tables_count}</span>
            </div>
          )}
          {datasource.last_sync && (
            <div className='flex items-center gap-3 text-sm'>
              <Clock className='w-4 h-4 text-slate-400' />
              <span className='text-slate-500'>最后同步:</span>
              <span className='font-medium text-slate-700 text-xs'>
                {new Date(datasource.last_sync).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' onClick={onSync} className='flex-1'>
            <RefreshCw className='w-3.5 h-3.5 mr-1.5' />
            同步
          </Button>
          <Button size='sm' variant='outline' onClick={onView} className='flex-1'>
            <Eye className='w-3.5 h-3.5 mr-1.5' />
            查看
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='sm' variant='ghost' className='p-2'>
                <MoreVertical className='w-4 h-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-32'>
              <DropdownMenuItem onClick={onEdit} className='cursor-pointer'>
                <Edit className='w-4 h-4 mr-2' />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className='cursor-pointer text-red-600'>
                <Trash2 className='w-4 h-4 mr-2' />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const DataSourceCardSkeleton = () => (
  <div className='bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden'>
    <div className='px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Skeleton className='w-10 h-10 rounded-xl' />
          <div>
            <Skeleton className='h-5 w-24 mb-1' />
            <Skeleton className='h-3 w-16' />
          </div>
        </div>
        <Skeleton className='h-6 w-16 rounded-full' />
      </div>
    </div>
    <div className='p-5'>
      <div className='space-y-3 mb-4'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='flex items-center gap-3'>
            <Skeleton className='w-4 h-4' />
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-4 w-20' />
          </div>
        ))}
      </div>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-9 w-20' />
        <Skeleton className='h-9 w-20' />
        <Skeleton className='h-9 w-9' />
      </div>
    </div>
  </div>
);

const BIDataSourcePage = () => {
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadDatasources();
  }, []);

  const loadDatasources = async () => {
    setLoading(true);
    try {
      // 模拟数据源数据
      setDatasources([
        {
          id: '1',
          name: '研发数据库',
          type: 'postgresql',
          status: 'active',
          host: 'localhost:5432',
          database: 'topems_rs',
          last_sync: new Date().toISOString(),
          tables_count: 45,
        },
        {
          id: '2',
          name: '实验室数据库',
          type: 'postgresql',
          status: 'active',
          host: 'localhost:5432',
          database: 'topems_lims',
          last_sync: new Date().toISOString(),
          tables_count: 38,
        },
        {
          id: '3',
          name: '质量数据库',
          type: 'postgresql',
          status: 'active',
          host: 'localhost:5432',
          database: 'topems_qms',
          last_sync: new Date().toISOString(),
          tables_count: 52,
        },
        {
          id: '4',
          name: '生产数据库',
          type: 'postgresql',
          status: 'inactive',
          host: 'localhost:5432',
          database: 'topems_pdm',
          tables_count: 28,
        },
        {
          id: '5',
          name: '缓存服务',
          type: 'redis',
          status: 'active',
          host: 'localhost:6379',
          database: 'default',
          last_sync: new Date().toISOString(),
        },
        {
          id: '6',
          name: '日志存储',
          type: 'elasticsearch',
          status: 'error',
          host: 'localhost:9200',
          database: 'logs',
        },
      ]);
    } catch (error) {
      console.error('Failed to load datasources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasources = datasources.filter((ds) => {
    const matchesSearch = ds.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ds.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '未激活' },
    { value: 'error', label: '异常' },
  ];

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50/50 p-6 space-y-6'>
        {/* Header skeleton */}
        <div className='flex items-center justify-between'>
          <div>
            <Skeleton className='h-8 w-32 mb-2' />
            <Skeleton className='h-4 w-24' />
          </div>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-10 w-24' />
            <Skeleton className='h-10 w-28' />
          </div>
        </div>

        {/* Filter skeleton */}
        <Skeleton className='h-14 w-full rounded-xl' />

        {/* Cards skeleton */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3, 4].map((i) => (
            <DataSourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50/50 p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-slate-900'>数据源管理</h2>
          <p className='text-sm text-slate-500 mt-1'>配置和管理BI数据源连接</p>
        </div>
        <div className='flex items-center gap-3'>
          <Link to='/bi/dashboard'>
            <Button variant='secondary'>返回数据大屏</Button>
          </Link>
          <Button>
            <Plus className='w-4 h-4 mr-2' />
            添加数据源
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400' />
              <Input
                placeholder='搜索数据源名称...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-slate-400' />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className='border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-center bg-slate-100 rounded-lg p-0.5'>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <Grid3X3 className='w-4 h-4' />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <List className='w-4 h-4' />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredDatasources.length === 0 ? (
        <EmptyState
          icon='folder'
          title='暂无数据源'
          description='还没有配置任何数据源，点击下方按钮添加第一个数据源'
          action={{
            label: '添加数据源',
            onClick: () => console.log('Add datasource'),
          }}
        />
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredDatasources.map((ds) => (
            <DataSourceCard
              key={ds.id}
              datasource={ds}
              onSync={() => console.log('Sync:', ds.id)}
              onView={() => console.log('View:', ds.id)}
              onEdit={() => console.log('Edit:', ds.id)}
              onDelete={() => console.log('Delete:', ds.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BIDataSourcePage;