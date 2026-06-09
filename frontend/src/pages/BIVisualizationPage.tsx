import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Plus,
  Search,
  Filter,
  LineChart,
  PieChart,
  TrendingUp,
  Settings,
  Trash2,
  Edit,
  Eye,
  Copy,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Visualization {
  id: string;
  name: string;
  type: string;
  description?: string;
  data_source?: string;
  config: any;
  created_at: string;
  updated_at: string;
}

const BIVisualizationPage = () => {
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadVisualizations();
  }, []);

  const loadVisualizations = async () => {
    setLoading(true);
    try {
      // 模拟可视化数据
      setVisualizations([
        {
          id: '1',
          name: '月度项目趋势图',
          type: 'line',
          description: '展示各月项目数量变化趋势',
          data_source: '研发数据库',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: '质量合格率分布',
          type: 'pie',
          description: '展示不同质量等级的占比',
          data_source: '质量数据库',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: '生产批次统计',
          type: 'bar',
          description: '展示各生产线批次数量',
          data_source: '生产数据库',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          name: '样品检验进度',
          type: 'gauge',
          description: '展示样品检验完成进度',
          data_source: '实验室数据库',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load visualizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisualizations = visualizations.filter((viz) => {
    const matchesSearch = viz.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || viz.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'line':
        return <LineChart className='w-5 h-5' />;
      case 'bar':
        return <BarChart3 className='w-5 h-5' />;
      case 'pie':
        return <PieChart className='w-5 h-5' />;
      case 'gauge':
        return <TrendingUp className='w-5 h-5' />;
      default:
        return <BarChart3 className='w-5 h-5' />;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      line: '折线图',
      bar: '柱状图',
      pie: '饼图',
      gauge: '仪表盘',
      scatter: '散点图',
      radar: '雷达图',
    };
    return <Badge variant='outline'>{typeLabels[type] || type}</Badge>;
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
          <h2 className='text-2xl font-bold text-gray-800'>可视化图表</h2>
          <p className='text-sm text-gray-500 mt-1'>创建和管理数据可视化图表</p>
        </div>
        <div className='flex items-center gap-3'>
          <Link to='/bi/dashboard'>
            <Button variant='secondary'>返回数据大屏</Button>
          </Link>
          <Button>
            <Plus className='w-4 h-4 mr-2' />
            创建图表
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <Input
                placeholder='搜索图表名称...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-gray-400' />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className='border border-gray-300 rounded-md px-3 py-2 text-sm'
              >
                <option value='all'>全部类型</option>
                <option value='line'>折线图</option>
                <option value='bar'>柱状图</option>
                <option value='pie'>饼图</option>
                <option value='gauge'>仪表盘</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filteredVisualizations.length === 0 ? (
          <Card className='col-span-full'>
            <CardContent className='p-8 text-center'>
              <BarChart3 className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-500'>暂无可视化图表</p>
              <Button className='mt-4'>
                <Plus className='w-4 h-4 mr-2' />
                创建第一个图表
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredVisualizations.map((viz) => (
            <Card key={viz.id} className='hover:shadow-md transition-shadow'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='p-2 bg-blue-50 rounded-lg text-blue-600'>{getTypeIcon(viz.type)}</div>
                    <CardTitle className='text-lg'>{viz.name}</CardTitle>
                  </div>
                  {getTypeBadge(viz.type)}
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600 mb-3'>{viz.description || '暂无描述'}</p>
                <div className='flex items-center justify-between text-xs text-gray-500 mb-4'>
                  <span>数据源: {viz.data_source || '未配置'}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Button size='sm' variant='outline'>
                    <Eye className='w-3 h-3 mr-1' />
                    预览
                  </Button>
                  <Button size='sm' variant='outline'>
                    <Copy className='w-3 h-3 mr-1' />
                    复制
                  </Button>
                  <Button size='sm' variant='outline'>
                    <Edit className='w-3 h-3 mr-1' />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BIVisualizationPage;
