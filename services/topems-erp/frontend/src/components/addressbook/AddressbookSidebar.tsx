import React, { useState } from 'react';
import type { DepartmentNode, ContactType } from '../../types/addressbook';

interface AddressbookSidebarProps {
  departmentTree: DepartmentNode[];
  selectedDepartmentId: string | null;
  selectedType: ContactType | null;
  onDepartmentSelect: (departmentId: string | null) => void;
  onTypeSelect: (type: ContactType | null) => void;
}

const AddressbookSidebar: React.FC<AddressbookSidebarProps> = ({
  departmentTree,
  selectedDepartmentId,
  selectedType,
  onDepartmentSelect,
  onTypeSelect,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: DepartmentNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedDepartmentId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-2 px-3 cursor-pointer hover:bg-gray-100 rounded-md ${
            isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => onDepartmentSelect(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-1 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="mr-1 w-3" />
          )}
          <span className="flex-1 text-sm truncate">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-gray-400">{node.children.length}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: DepartmentNode) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const typeOptions: { type: ContactType | null; label: string }[] = [
    { type: null, label: '全部' },
    { type: 'EMPLOYEE', label: '员工' },
    { type: 'DEPARTMENT', label: '部门' },
    { type: 'COMPANY', label: '公司' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          快速筛选
        </h3>
        <div className="space-y-1">
          {typeOptions.map(({ type, label }) => (
            <button
              key={type || 'all'}
              onClick={() => onTypeSelect(type)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                selectedType === type
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {type === null && '📇 '}
              {type === 'EMPLOYEE' && '👤 '}
              {type === 'DEPARTMENT' && '🏢 '}
              {type === 'COMPANY' && '🏛️ '}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          部门结构
        </h3>
        <button
          onClick={() => onDepartmentSelect(null)}
          className={`w-full text-left px-3 py-2 text-sm rounded-md mb-2 transition-colors ${
            selectedDepartmentId === null
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          🏢 所有部门
        </button>
        <div className="space-y-1">
          {departmentTree.map((node) => renderTreeNode(node))}
        </div>
      </div>
    </div>
  );
};

export default AddressbookSidebar;
