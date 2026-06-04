import React, { useState, useEffect } from 'react';
import { Building, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { companyApi, type Company } from '../api/erp';

interface CompanyManagementPageProps {
  onNavigate?: (page: string) => void;
}

const CompanyManagementPage: React.FC<CompanyManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '',
    short_name: '',
    registration_number: '',
    tax_number: '',
    address: '',
    contact_phone: '',
    email: '',
    website: '',
    status: 'active',
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await companyApi.list();
      if (res.success && res.data) {
        setCompanies(res.data.items || []);
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      setError(err.message || '加载公司列表失败');
      showNotification('error', '加载公司列表失败');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await companyApi.create(newCompany);
      if (res.success) {
        showNotification('success', '公司创建成功');
        setShowCreateModal(false);
        setNewCompany({
          name: '',
          short_name: '',
          registration_number: '',
          tax_number: '',
          address: '',
          contact_phone: '',
          email: '',
          website: '',
          status: 'active',
        });
        loadCompanies();
      } else {
        showNotification('error', res.message || '创建公司失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建公司失败');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('确定要删除这个公司吗？')) return;
    try {
      const res = await companyApi.delete(id);
      if (res.success) {
        showNotification('success', '公司删除成功');
        loadCompanies();
      } else {
        showNotification('error', res.message || '删除公司失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除公司失败');
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const res = await companyApi.update(selectedCompany.id, selectedCompany);
      if (res.success) {
        showNotification('success', '公司信息更新成功');
        setShowEditModal(false);
        setSelectedCompany(null);
        loadCompanies();
      } else {
        showNotification('error', res.message || '更新公司失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '更新公司失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      archived: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
      active: '活跃',
      inactive: '停用',
      archived: '归档',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <Building className='w-7 h-7 mr-3 text-blue-600' />
                  公司管理
                </h1>
                <p className='mt-1 text-sm text-gray-500'>管理企业信息、组织架构基础数据</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <Plus className='w-5 h-5 mr-2' />
              新增公司
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='搜索公司名称、简称、邮箱...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
            <button
              onClick={loadCompanies}
              className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              刷新
            </button>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          {loading ? (
            <div className='p-8 text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent'></div>
              <p className='mt-2 text-gray-500'>加载中...</p>
            </div>
          ) : error ? (
            <div className='p-8 text-center'>
              <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-3' />
              <p className='text-red-600'>{error}</p>
              <button
                onClick={loadCompanies}
                className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
              >
                重试
              </button>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className='p-8 text-center'>
              <Building className='w-12 h-12 text-gray-400 mx-auto mb-3' />
              <p className='text-gray-500'>暂无公司数据</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6'>
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className='bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow'
                >
                  <div className='flex items-start justify-between mb-4'>
                    <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <Building className='w-6 h-6 text-blue-600' />
                    </div>
                    {getStatusBadge(company.status)}
                  </div>

                  <h3 className='text-lg font-semibold text-gray-900 mb-2'>{company.name}</h3>

                  {company.short_name && <p className='text-sm text-gray-600 mb-2'>{company.short_name}</p>}

                  <div className='space-y-1 text-sm text-gray-500'>
                    {company.email && <div>📧 {company.email}</div>}
                    {company.contact_phone && <div>📞 {company.contact_phone}</div>}
                    {company.address && <div>📍 {company.address}</div>}
                  </div>

                  <div className='mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2'>
                    <button
                      onClick={() => {
                        setSelectedCompany(company);
                        setShowEditModal(true);
                      }}
                      className='p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors'
                      title='编辑'
                    >
                      <Edit className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(company.id)}
                      className='p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors'
                      title='删除'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>新增公司</h3>
              <form onSubmit={handleCreateCompany}>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>公司名称 *</label>
                      <input
                        type='text'
                        required
                        value={newCompany.name || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入公司名称'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>简称</label>
                      <input
                        type='text'
                        value={newCompany.short_name || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, short_name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入简称'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>注册号</label>
                      <input
                        type='text'
                        value={newCompany.registration_number || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, registration_number: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入注册号'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>税号</label>
                      <input
                        type='text'
                        value={newCompany.tax_number || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, tax_number: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入税号'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>地址</label>
                    <textarea
                      value={newCompany.address || ''}
                      onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      rows={2}
                      placeholder='请输入地址'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>联系电话</label>
                      <input
                        type='text'
                        value={newCompany.contact_phone || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, contact_phone: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入联系电话'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>邮箱</label>
                      <input
                        type='email'
                        value={newCompany.email || ''}
                        onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='请输入邮箱'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>网站</label>
                    <input
                      type='text'
                      value={newCompany.website || ''}
                      onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder='请输入网站地址'
                    />
                  </div>
                </div>

                <div className='mt-6 flex justify-end space-x-3'>
                  <button
                    type='button'
                    onClick={() => setShowCreateModal(false)}
                    className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200'
                  >
                    取消
                  </button>
                  <button type='submit' className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedCompany && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>编辑公司</h3>
              <form onSubmit={handleEditCompany}>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>公司名称 *</label>
                      <input
                        type='text'
                        required
                        value={selectedCompany.name}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>简称</label>
                      <input
                        type='text'
                        value={selectedCompany.short_name || ''}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, short_name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>注册号</label>
                      <input
                        type='text'
                        value={selectedCompany.registration_number || ''}
                        onChange={(e) =>
                          setSelectedCompany({ ...selectedCompany, registration_number: e.target.value })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>税号</label>
                      <input
                        type='text'
                        value={selectedCompany.tax_number || ''}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, tax_number: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>地址</label>
                    <textarea
                      value={selectedCompany.address || ''}
                      onChange={(e) => setSelectedCompany({ ...selectedCompany, address: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      rows={2}
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>联系电话</label>
                      <input
                        type='text'
                        value={selectedCompany.contact_phone || ''}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, contact_phone: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>邮箱</label>
                      <input
                        type='email'
                        value={selectedCompany.email || ''}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, email: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>网站</label>
                    <input
                      type='text'
                      value={selectedCompany.website || ''}
                      onChange={(e) => setSelectedCompany({ ...selectedCompany, website: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                </div>

                <div className='mt-6 flex justify-end space-x-3'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCompany(null);
                    }}
                    className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200'
                  >
                    取消
                  </button>
                  <button type='submit' className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagementPage;
