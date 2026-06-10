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
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { fetchDashboards, createDashboard, deleteDashboard, type Dashboard } from '../api/bi';

const BIDataSourcePage = () => {
  const [datasources, setDatasources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
        },
        {
          id: '2',
          name: '实验室数据库',
          type: 'postgresql',
          status: 'active',
          host: 'localhost:5432',
          database: 'topems_lims',
          last_sync: new Date().toISOString(),
        },
        {
          id: '3',
          name: '质量数据库',
          type: 'postgresql',
          status: 'active',
          host: 'localhost:5432',
          database: 'topems_qms',
          last_sync: new Date().toISOString(),
        },
        {
          id: '4',
          name: '生产数据库',
          type: 'postgresql',
          status: 'inactive',
          host: 'localhost:5432',
          database: 'topems_pdm',
          last_sync: null,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className='bg-green-100 text-green-800'>活跃</Badge>;
      case 'inactive':
        return <Badge className='bg-gray-100 text-gray-800'>未激活</Badge>;
      case 'error':
        return <Badge className='bg-red-100 text-red-800'>异常</Badge>;
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
        return '🐘';
      case 'mysql':
        return '🐬';
      case 'mongodb':
        return '🍃';
      case 'redis':
        return '🔴';
      default:
        return '💾';
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-800'>数据源管理</h2>
          <p className='text-sm text-gray-500 mt-1'>配置和管理BI数据源连接</p>
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

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <Input
                placeholder='搜索数据源名称...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-gray-400' />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className='border border-gray-300 rounded-md px-3 py-2 text-sm'
              >
                <option value='all'>全部状态</option>
                <option value='active'>活跃</option>
                <option value='inactive'>未激活</option>
                <option value='error'>异常</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filteredDatasources.map((ds) => (
          <Card key={ds.id} className='hover:shadow-md transition-shadow'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-2xl'>{getTypeIcon(ds.type)}</span>
                  <CardTitle className='text-lg'>{ds.name}</CardTitle>
                </div>
                {getStatusBadge(ds.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-500'>类型:</span>
                  <span className='font-medium'>{ds.type}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-500'>主机:</span>
                  <span className='font-medium'>{ds.host}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-500'>数据库:</span>
                  <span className='font-medium'>{ds.database}</span>
                </div>
                {ds.last_sync && (
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-500'>最后同步:</span>
                    <span className='font-medium text-xs'>{new Date(ds.last_sync).toLocaleString('zh-CN')}</span>
                  </div>
                )}
              </div>
              <div className='flex items-center gap-2 mt-4'>
                <Button size='sm' variant='outline'>
                  <RefreshCw className='w-3 h-3 mr-1' />
                  同步
                </Button>
                <Button size='sm' variant='outline'>
                  <Eye className='w-3 h-3 mr-1' />
                  查看
                </Button>
                <Button size='sm' variant='outline'>
                  <Edit className='w-3 h-3 mr-1' />
                  编辑
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BIDataSourcePage;
