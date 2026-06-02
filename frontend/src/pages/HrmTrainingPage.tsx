import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Eye, Calendar, Users, BookOpen,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Award, Clock
} from 'lucide-react';
import {
  trainingPlanApi,
  trainingCourseApi,
  trainingRecordApi,
  type TrainingPlan,
  type TrainingCourse,
  type TrainingRecord,
} from '../api/hrm';
import { useNotification } from '../hooks/useNotification';

const HrmTrainingPage: React.FC = () => {
  const { success, error } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'plans' | 'courses' | 'records'>('plans');
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<TrainingPlan | TrainingCourse>>({});
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'plans':
          const planRes = await trainingPlanApi.list({ page_size: 100 });
          if (planRes.code === 200) {
            setPlans(planRes.data?.items || []);
          }
          break;
        case 'courses':
          const courseRes = await trainingCourseApi.list({ page_size: 100 });
          if (courseRes.code === 200) {
            setCourses(courseRes.data?.items || []);
          }
          break;
        case 'records':
          const recordRes = await trainingRecordApi.list({ page_size: 100 });
          if (recordRes.code === 200) {
            setRecords(recordRes.data?.items || []);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditItem(item);
      setFormData({ ...item });
    } else {
      setEditItem(null);
      setFormData({});
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      let response;
      if (editItem) {
        if (activeTab === 'plans') {
          response = await trainingPlanApi.update(editItem.id, formData);
        } else {
          response = await trainingCourseApi.update(editItem.id, formData);
        }
      } else {
        if (activeTab === 'plans') {
          response = await trainingPlanApi.create(formData);
        } else {
          response = await trainingCourseApi.create(formData);
        }
      }
      
      if (response.code === 200) {
        success(editItem ? '更新成功' : '创建成功');
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to save:', err);
      error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    
    try {
      let response;
      if (activeTab === 'plans') {
        response = await trainingPlanApi.delete(id);
      } else if (activeTab === 'courses') {
        response = await trainingCourseApi.delete(id);
      } else {
        response = await trainingRecordApi.delete(id);
      }
      
      if (response.code === 200) {
        success('删除成功');
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      error('删除失败');
    }
  };

  const handleStatusChange = async (id: string, activate: boolean) => {
    try {
      const response = await (activate 
        ? trainingPlanApi.activate(id) 
        : trainingPlanApi.deactivate(id)
      );
      if (response.code === 200) {
        success(activate ? '已启用' : '已停用');
        loadData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      error('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">培训管理</h1>
              <p className="text-sm text-gray-500">管理培训计划、课程和记录</p>
            </div>
            {(activeTab !== 'records') && (
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                新增
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-4 mb-6">
          {[
            { key: 'plans', label: '培训计划', icon: Calendar },
            { key: 'courses', label: '培训课程', icon: BookOpen },
            { key: 'records', label: '培训记录', icon: Users },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'plans' && (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">计划名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">代码</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">时间安排</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">预算</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        暂无培训计划
                      </td>
                    </tr>
                  ) : (
                    plans.map((plan) => (
                      <React.Fragment key={plan.id}>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <button
                                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                                className="mr-2"
                              >
                                {expandedPlan === plan.id ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <span className="font-medium text-gray-900">{plan.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.code || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(plan.start_date).toLocaleDateString()} ~ {new Date(plan.end_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {plan.budget ? `¥${plan.budget.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              plan.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {plan.status === 'active' ? '进行中' : '已结束'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleOpenModal(plan)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(plan.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(plan.id, plan.status !== 'active')}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                              >
                                {plan.status === 'active' ? (
                                  <XCircle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedPlan === plan.id && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="ml-6">
                                <p className="text-sm text-gray-600"><strong>描述:</strong> {plan.description || '-'}</p>
                                <p className="text-sm text-gray-500 mt-2">
                                  <strong>创建时间:</strong> {new Date(plan.created_at).toLocaleString()}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">课程名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">分类</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">级别</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">时长</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">讲师</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        暂无培训课程
                      </td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{course.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.level}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.duration_hours ? `${course.duration_hours}小时` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.instructor_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            course.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {course.status === 'active' ? '开放报名' : '已关闭'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleOpenModal(course)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(course.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}

        {activeTab === 'records' && (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">课程</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">员工</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">报名日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">出勤状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">完成状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">成绩</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        暂无培训记录
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.course_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.employee_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(record.enrollment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.attendance_status === 'attended'
                              ? 'bg-green-100 text-green-800'
                              : record.attendance_status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.attendance_status === 'attended' ? '已出勤' : 
                             record.attendance_status === 'absent' ? '缺勤' : '未考勤'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.completion_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {record.completion_status === 'completed' ? '已完成' : '未完成'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.score ? (
                            <span className="flex items-center">
                              <Award className="w-4 h-4 text-yellow-500 mr-1" />
                              {record.score}分
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editItem ? '编辑' : '新增'}
                {activeTab === 'plans' ? '培训计划' : '培训课程'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {activeTab === 'plans' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">计划名称 *</label>
                    <input
                      type="text"
                      value={(formData as TrainingPlan).name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="请输入计划名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">计划代码</label>
                    <input
                      type="text"
                      value={(formData as TrainingPlan).code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="请输入计划代码"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">开始日期 *</label>
                      <input
                        type="date"
                        value={(formData as TrainingPlan).start_date || ''}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">结束日期 *</label>
                      <input
                        type="date"
                        value={(formData as TrainingPlan).end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">预算</label>
                    <input
                      type="number"
                      value={(formData as TrainingPlan).budget || ''}
                      onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || undefined })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="请输入预算金额"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">描述</label>
                    <textarea
                      value={(formData as TrainingPlan).description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="请输入计划描述"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">课程名称 *</label>
                    <input
                      type="text"
                      value={(formData as TrainingCourse).name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="请输入课程名称"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">分类 *</label>
                      <select
                        value={(formData as TrainingCourse).category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">请选择分类</option>
                        <option value="technical">技术培训</option>
                        <option value="management">管理培训</option>
                        <option value="soft_skill">软技能</option>
                        <option value="onboarding">入职培训</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">级别 *</label>
                      <select
                        value={(formData as TrainingCourse).level || ''}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">请选择级别</option>
                        <option value="beginner">入门级</option>
                        <option value="intermediate">中级</option>
                        <option value="advanced">高级</option>
                        <option value="expert">专家级</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">时长(小时)</label>
                      <input
                        type="number"
                        value={(formData as TrainingCourse).duration_hours || ''}
                        onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || undefined })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">最大人数</label>
                      <input
                        type="number"
                        value={(formData as TrainingCourse).max_participants || ''}
                        onChange={(e) => setFormData({ ...formData, max_participants: parseFloat(e.target.value) || undefined })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">讲师</label>
                    <input
                      type="text"
                      value={(formData as TrainingCourse).instructor_name || ''}
                      onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="请输入讲师姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">描述</label>
                    <textarea
                      value={(formData as TrainingCourse).description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="请输入课程描述"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrmTrainingPage;