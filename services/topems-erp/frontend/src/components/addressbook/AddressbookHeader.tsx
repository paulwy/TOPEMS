import React, { useState } from 'react';
import { addressbookApi } from '../../api/addressbook';
import type { ContactType, ExportParams } from '../../types/addressbook';

interface AddressbookHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedType: ContactType | null;
}

const AddressbookHeader: React.FC<AddressbookHeaderProps> = ({
  searchValue,
  onSearchChange,
  selectedType,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params: ExportParams = {
        type: selectedType || undefined,
        format: 'csv',
      };
      const blob = await addressbookApi.exportContacts(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `addressbook-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索姓名、职位、电话、邮箱..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="ml-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isExporting ? '导出中...' : '📥 导出'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressbookHeader;
