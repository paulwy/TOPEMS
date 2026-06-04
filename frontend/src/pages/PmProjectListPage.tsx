import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pmApi, Project } from '../api/pm';

const PROJECT_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'research', label: '科研项目' },
  { value: 'production', label: '生产项目' },
  { value: 'construction', label: '施工项目' },
  { value: 'design', label: '设计项目' },
  { value: 'service', label: '服务项目' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadProjects();
  }, [selectedType, selectedStatus]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await pmApi.projects.list({
        project_type: selectedType || undefined,
        status: selectedStatus || undefined,
      });
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个项目吗？')) return;
    try {
      const response = await pmApi.projects.delete(id);
      if (response.success) {
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待审批';
      case 'approved':
        return '已批准';
      case 'cancelled':
        return '已取消';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = PROJECT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>项目管理</h1>
        <p className='text-gray-500 mt-1'>管理所有类型的项目，跟踪进度和状态</p>
      </div>

      <div className='bg-white rounded-lg shadow p-6 mb-6'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='搜索项目名称或编号...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
          <div className='flex gap-3'>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigate('/pm/projects/create')}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <Plus className='w-5 h-5' />
              创建项目
            </button>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>总项目数</p>
              <p className='text-2xl font-bold text-gray-900'>{projects.length}</p>
            </div>
            <div className='p-3 bg-blue-100 rounded-full'>
              <FolderKanban className='w-6 h-6 text-blue-600' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>进行中</p>
              <p className='text-2xl font-bold text-green-600'>
                {projects.filter((p) => p.status === 'active').length}
              </p>
            </div>
            <div className='p-3 bg-green-100 rounded-full'>
              <TrendingUp className='w-6 h-6 text-green-600' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>待审批</p>
              <p className='text-2xl font-bold text-yellow-600'>
                {projects.filter((p) => p.status === 'pending').length}
              </p>
            </div>
            <div className='p-3 bg-yellow-100 rounded-full'>
              <Calendar className='w-6 h-6 text-yellow-600' />
            </div>
          </div>
        </div>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>已完成</p>
              <p className='text-2xl font-bold text-blue-600'>
                {projects.filter((p) => p.status === 'completed').length}
              </p>
            </div>
            <div className='p-3 bg-blue-100 rounded-full'>
              <Users className='w-6 h-6 text-blue-600' />
            </div>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>项目名称</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>类型</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>状态</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>进度</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>预算</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>时间</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>操作</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center text-gray-500'>
                    暂无项目数据
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4'>
                      <div>
                        <p className='font-medium text-gray-900'>{project.name}</p>
                        <p className='text-xs text-gray-500'>{project.code}</p>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span className='text-sm text-gray-600'>{getTypeLabel(project.project_type)}</span>
                    </td>
                    <td className='px-6 py-4'>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <div className='w-24 bg-gray-200 rounded-full h-2'>
                          <div
                            className={`h-2 rounded-full ${project.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'}`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className='text-sm text-gray-600'>{project.progress}%</span>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>{formatCurrency(project.budget)}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      <div>
                        <p>{formatDate(project.start_date)}</p>
                        <p className='text-xs text-gray-400'>至 {formatDate(project.end_date)}</p>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => navigate(`/pm/projects/${project.id}`)}
                          className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                          title='查看详情'
                        >
                          <Eye className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => navigate(`/pm/projects/${project.id}/edit`)}
                          className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                          title='编辑'
                        >
                          <Edit className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                          title='删除'
                        >
                          <Trash2 className='w-5 h-5' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PmProjectListPage;
