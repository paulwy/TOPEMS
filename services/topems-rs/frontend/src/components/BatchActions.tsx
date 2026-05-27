import React from 'react';

export interface BatchAction {
  id: string;
  label: string;
  icon?: string;
  color?: 'default' | 'danger' | 'primary';
}

export interface BatchActionsProps {
  selectedIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAction: (actionId: string) => void;
  actions: BatchAction[];
  totalCount: number;
}

const BatchActions: React.FC<BatchActionsProps> = ({
  selectedIds,
  onSelectAll,
  onDeselectAll,
  onAction,
  actions,
  totalCount,
}) => {
  const isAllSelected = selectedIds.length === totalCount && totalCount > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < totalCount;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectAll();
    } else {
      onDeselectAll();
    }
  };

  const getActionColor = (color?: string) => {
    switch (color) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'primary':
        return 'bg-primary-600 hover:bg-primary-700 text-white';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAll}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">全选</span>
          </label>
          
          {selectedIds.length > 0 && (
            <span className="text-sm text-gray-600">
              已选择 <span className="font-medium text-primary-600">{selectedIds.length}</span> 项
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${getActionColor(action.color)}`}
              >
                {action.icon && <span>{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchActions;
