import React from 'react';
import { QualityInspection } from '../../api/qualityStandard';

interface InspectionFormProps {
  initialData?: Partial<QualityInspection>;
  onSubmit: (data: Partial<QualityInspection>) => void;
  onCancel: () => void;
}

const InspectionForm: React.FC<InspectionFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || '',
    inspection_type: initialData?.inspection_type || '巡检' as const,
    inspector: initialData?.inspector || '',
    status: initialData?.status || 'pending' as const,
    description: initialData?.description || '',
    result: initialData?.result || '',
    findings: initialData?.findings || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inspectionTypes = ['巡检', '定期检查', '专项检查', '来料检查', '出货检查'];
  const statuses = [
    { value: 'pending', label: '待检查' },
    { value: 'in_progress', label: '检查中' },
    { value: 'completed', label: '已完成' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">标题</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">检查类型</label>
        <select
          value={formData.inspection_type}
          onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        >
          {inspectionTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">检查员</label>
        <input
          type="text"
          value={formData.inspector}
          onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">状态</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">检查结果</label>
        <textarea
          value={formData.result}
          onChange={(e) => setFormData({ ...formData, result: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">发现问题</label>
        <textarea
          value={formData.findings}
          onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {initialData?.id ? '更新' : '创建'}
        </button>
      </div>
    </form>
  );
};

export default InspectionForm;