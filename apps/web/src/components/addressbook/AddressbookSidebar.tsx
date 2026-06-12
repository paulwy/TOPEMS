import React, { useState } from "react";
import {
  Users,
  Building,
  User,
  Folder,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { DepartmentNode } from "../../types/addressbook";

interface AddressbookSidebarProps {
  departments: DepartmentNode[];
  selectedType: "all" | "EMPLOYEE" | "DEPARTMENT" | "COMPANY";
  onTypeSelect: (_type: "all" | "EMPLOYEE" | "DEPARTMENT" | "COMPANY") => void;
  selectedDepartment: string | null;
  onDepartmentSelect: (_id: string | null) => void;
}

export const AddressbookSidebar: React.FC<AddressbookSidebarProps> = ({
  departments,
  selectedType,
  onTypeSelect,
  selectedDepartment,
  onDepartmentSelect,
}) => {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(
    new Set(),
  );

  const toggleDepartment = (id: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDepartments(newExpanded);
  };

  const renderDepartmentNode = (
    node: DepartmentNode,
    level: number = 0,
  ): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedDepartments.has(node.id);
    const isSelected = selectedDepartment === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded ${
            isSelected ? "bg-blue-50 text-blue-700" : "text-slate-700"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onDepartmentSelect(isSelected ? null : node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDepartment(node.id);
              }}
              className="p-1 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <Folder className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) =>
              renderDepartmentNode(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  const typeFilters = [
    { id: "all", label: "全部", icon: Users },
    { id: "EMPLOYEE", label: "员工", icon: User },
    { id: "DEPARTMENT", label: "部门", icon: Folder },
    { id: "COMPANY", label: "公司", icon: Building },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">通讯录</h2>
      </div>

      {/* 类型筛选 */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 mb-3">分类</h3>
        <div className="space-y-1">
          {typeFilters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTypeSelect(id as any)}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors ${
                selectedType === id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 部门树 */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-3">组织架构</h3>
        <div className="space-y-1">
          <button
            onClick={() => onDepartmentSelect(null)}
            className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors ${
              selectedDepartment === null
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>全部部门</span>
          </button>
          {departments.map((dept) => renderDepartmentNode(dept))}
        </div>
      </div>
    </div>
  );
};
