import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { QualityStandard } from '../../api/qualityStandard';

interface StandardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QualityStandard>) => Promise<void>;
  initialData?: QualityStandard;
  loading?: boolean;
}

export const StandardForm: React.FC<StandardFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    version: '',
    description: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        category: initialData.category || '',
        version: initialData.version || '',
        description: initialData.description || '',
        status: initialData.status || 'active',
      });
    } else {
      setFormData({ code: '', name: '', category: '', version: '', description: '', status: 'active' });
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
    if (!formData.code.trim()) newErrors.code = '编号不能为空';
    if (!formData.name.trim()) newErrors.name = '名称不能为空';
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
      title={initialData ? '编辑质量标准' : '创建质量标准'}
      loading={loading}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">编号 *</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.code ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">名称 *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">类别</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">请选择</option>
            <option value="产品标准">产品标准</option>
            <option value="过程标准">过程标准</option>
            <option value="检验标准">检验标准</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">版本</label>
          <input
            type="text"
            name="version"
            value={formData.version}
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
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="draft">草稿</option>
            <option value="active">激活</option>
            <option value="expired">过期</option>
          </select>
        </div>
      </div>
    </FormModal>
  );
};