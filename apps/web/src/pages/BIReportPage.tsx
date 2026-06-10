import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Settings,
  Trash2,
  Edit,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { fetchReports, createReport, deleteReport, type Report } from '../api/bi';

const BIReportPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      if (res.success && res.data) {
        setReports(res.data.reports || []);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await deleteReport(reportId);
      if (res.success) {
        loadReports();
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.report_type === filterType;
    return matchesSearch && matchesType;
  });

  const reportTypes = [
    { value: 'all', label: '全部类型' },
    { value: 'daily', label: '日报' },
    { value: 'weekly', label: '周报' },
    { value: 'monthly', label: '月报' },
    { value: 'custom', label: '自定义报表' },
  ];

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
          <h2 className='text-2xl font-bold text-gray-800'>报表管理</h2>
          <p className='text-sm text-gray-500 mt-1'>创建、管理和生成业务报表</p>
        </div>
        <div className='flex items-center gap-3'>
          <Link to='/bi/dashboard'>
            <Button variant='secondary'>返回数据大屏</Button>
          </Link>
          <Button>
            <Plus className='w-4 h-4 mr-2' />
            创建报表
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <Input
                placeholder='搜索报表名称...'
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
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filteredReports.length === 0 ? (
          <Card className='col-span-full'>
            <CardContent className='p-8 text-center'>
              <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-500'>暂无报表数据</p>
              <Button className='mt-4'>
                <Plus className='w-4 h-4 mr-2' />
                创建第一个报表
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className='hover:shadow-md transition-shadow'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>{report.name}</CardTitle>
                  <Badge variant='outline'>{report.report_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600 mb-4'>{report.description || '暂无描述'}</p>
                <div className='flex items-center gap-2 text-xs text-gray-500 mb-4'>
                  <Calendar className='w-3 h-3' />
                  <span>创建于 {new Date(report.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Button size='sm' variant='outline'>
                    <Download className='w-3 h-3 mr-1' />
                    导出
                  </Button>
                  <Button size='sm' variant='outline'>
                    <Edit className='w-3 h-3 mr-1' />
                    编辑
                  </Button>
                  <Button size='sm' variant='outline' onClick={() => handleDeleteReport(report.id)}>
                    <Trash2 className='w-3 h-3 mr-1' />
                    删除
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

export default BIReportPage;
