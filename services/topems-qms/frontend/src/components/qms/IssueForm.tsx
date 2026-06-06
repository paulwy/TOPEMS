import React from 'react';
import { QualityIssue } from '../api/qualityStandard';

interface IssueFormProps {
  initialData?: Partial<QualityIssue>;
  onSubmit: (data: Partial<QualityIssue>) => void;
}

export const IssueForm: React.FC<IssueFormProps> = ({ initialData = {}, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<QualityIssue> = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      severity: formData.get('severity') as QualityIssue['severity'] || 'minor',
      status: formData.get('status') as QualityIssue['status'] || 'open',
      source: formData.get('source') as string || undefined,
      assigned_to: formData.get('assigned_to') as string || undefined,
      priority: formData.get('priority') as string || undefined,
    };
    onSubmit(data);
  };

  return (
    <form id="issue-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          标题 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          defaultValue={initialData.title}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          描述
        </label>
        <textarea
          name="description"
          id="description"
          rows={3}
          defaultValue={initialData.description}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
            严重性 <span className="text-red-500">*</span>
          </label>
          <select
            name="severity"
            id="severity"
            required
            defaultValue={initialData.severity || 'minor'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="critical">严重</option>
            <option value="major">较大</option>
            <option value="minor">一般</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            状态 <span className="text-red-500">*</span>
          </label>
          <select
            name="status"
            id="status"
            required
            defaultValue={initialData.status || 'open'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="open">开放</option>
            <option value="in_progress">处理中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium text-gray-700">
          来源
        </label>
        <input
          type="text"
          name="source"
          id="source"
          defaultValue={initialData.source}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
            指派给
          </label>
          <input
            type="text"
            name="assigned_to"
            id="assigned_to"
            defaultValue={initialData.assigned_to}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            优先级
          </label>
          <input
            type="text"
            name="priority"
            id="priority"
            defaultValue={initialData.priority}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </form>
  );
};
