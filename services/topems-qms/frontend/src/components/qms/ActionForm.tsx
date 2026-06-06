import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { CorrectiveAction } from '../../api/qualityStandard';

interface ActionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CorrectiveAction>) => Promise<void>;
  initialData?: CorrectiveAction;
  loading?: boolean;
}

export const ActionForm: React.FC<ActionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    action_type: 'corrective' as 'corrective' | 'preventive' | 'improvement',
    assigned_to: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'verified',
    description: '',
    target_date: '',
    issue_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        action_type: initialData.action_type || 'corrective',
        assigned_to: initialData.assigned_to || '',
        status: initialData.status || 'pending',
        description: initialData.description || '',
        target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '',
        issue_id: initialData.issue_id || '',
      });
    } else {
      setFormData({ title: '', action_type: 'corrective', assigned_to: '', status: 'pending', description: '', target_date: '', issue_id: '' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '标题不能为空';
    if (!formData.assigned_to.trim()) newErrors.assigned_to = '负责人不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={initialData ? '编辑纠正措施' : '创建纠正措施'}
      loading={loading}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">标题 *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">类型</label>
          <select
            name="action_type"
            value={formData.action_type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="corrective">纠正</option>
            <option value="preventive">预防</option>
            <option value="improvement">改进</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">负责人 *</label>
          <input
            type="text"
            name="assigned_to"
            value={formData.assigned_to}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.assigned_to ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.assigned_to && <p className="mt-1 text-sm text-red-500">{errors.assigned_to}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending">待执行</option>
            <option value="in_progress">执行中</option>
            <option value="completed">已完成</option>
            <option value="verified">已验证</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">目标日期</label>
          <input
            type="date"
            name="target_date"
            value={formData.target_date}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </FormModal>
  );
};