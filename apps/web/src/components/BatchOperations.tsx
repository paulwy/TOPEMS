import { useRef, useEffect } from "react";

export interface BatchAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: "primary" | "danger" | "success" | "warning" | "default";
  disabled?: boolean;
}

interface BatchOperationsProps {
  selectedIds: string[];
  allItemsSelected: boolean;
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: BatchAction[];
  onAction: (_actionId: string) => void;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedIds,
  allItemsSelected,
  totalItems,
  onSelectAll,
  onDeselectAll,
  actions,
  onAction,
}) => {
  const hasSelection = selectedIds.length > 0;
  const isIndeterminate = !allItemsSelected && hasSelection;

  const checkboxRef1 = useRef<HTMLInputElement>(null);
  const checkboxRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef1.current) {
      checkboxRef1.current.indeterminate = isIndeterminate;
    }
    if (checkboxRef2.current) {
      checkboxRef2.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const getButtonClass = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white";
    }
  };

  const getButtonIcon = (icon: React.ReactNode) => {
    return icon;
  };

  return (
    <>
      {/* Header Row with Select All */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer select-none">
            <input
              ref={checkboxRef1}
              type="checkbox"
              checked={allItemsSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll();
                } else {
                  onDeselectAll();
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">
              {allItemsSelected ? "取消全选" : "全选"}
            </span>
          </label>
          {hasSelection && (
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
              已选择 {selectedIds.length} 项
            </span>
          )}
          {!hasSelection && (
            <span className="ml-3 text-sm text-gray-400">
              共 {totalItems} 项
            </span>
          )}
        </div>

        {/* Batch Actions */}
        {hasSelection && (
          <div className="flex items-center space-x-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                disabled={action.disabled}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${getButtonClass(action.color)} ${
                  action.disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={action.label}
              >
                {getButtonIcon(action.icon)}
                <span className="ml-1">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Select Column Header Cell */}
      <div className="select-column-header" style={{ width: "48px" }}>
        <label className="flex items-center cursor-pointer select-none h-full">
          <input
            ref={checkboxRef2}
            type="checkbox"
            checked={allItemsSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectAll();
              } else {
                onDeselectAll();
              }
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </label>
      </div>

      {/* Row Checkbox Cell (for use in table rows) */}
      <div className="select-cell" style={{ width: "48px" }}>
        <label className="flex items-center cursor-pointer select-none h-full">
          <input
            type="checkbox"
            checked={false}
            onChange={() => {}}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </label>
      </div>
    </>
  );
};

export default BatchOperations;
