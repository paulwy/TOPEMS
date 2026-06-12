import React from "react";

interface AddressbookFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export const AddressbookFilters: React.FC<AddressbookFiltersProps> = ({
  statusFilter,
  onStatusChange,
}) => {
  const statuses = [
    { value: "", label: "全部状态" },
    { value: "active", label: "在职" },
    { value: "inactive", label: "离职" },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-600">状态:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
