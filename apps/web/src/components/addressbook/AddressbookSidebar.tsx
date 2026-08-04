import React, { useState } from 'react';
import { Users, Building, User, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import type { DepartmentNode } from '../../types/addressbook';

interface AddressbookSidebarProps {
  departments: DepartmentNode[];
  selectedType: 'all' | 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  onTypeSelect: (_type: 'all' | 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY') => void;
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
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  const toggleDepartment = (id: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDepartments(newExpanded);
  };

  const renderDepartmentNode = (node: DepartmentNode, level: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedDepartments.has(node.id);
    const isSelected = selectedDepartment === node.id;

    return (
      <div
        key={node.id}
        style={{ userSelect: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            paddingLeft: level * 16 + 12,
            fontSize: 14,
            cursor: 'pointer',
            borderRadius: 4,
            backgroundColor: isSelected ? 'primary.light' : 'transparent',
            color: isSelected ? 'primary.dark' : 'grey.700',
          }}
          role='button'
          tabIndex={0}
          onClick={() => onDepartmentSelect(isSelected ? null : node.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDepartmentSelect(isSelected ? null : node.id);
            }
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'grey.100';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDepartment(node.id);
              }}
              style={{
                padding: 4,
                borderRadius: 4,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'border.default';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isExpanded ? (
                <ChevronDown sx={{ width: 16, height: 16 }} />
              ) : (
                <ChevronRight sx={{ width: 16, height: 16 }} />
              )}
            </button>
          ) : (
            <div style={{ width: 24 }} />
          )}
          <Folder sx={{ width: 16, height: 16, flexShrink: 0 }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderDepartmentNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  const typeFilters: Array<{
    id: 'all' | 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
    label: string;
    icon: React.ComponentType<{ sx?: object }>;
  }> = [
    { id: 'all', label: '全部', icon: Users },
    { id: 'EMPLOYEE', label: '员工', icon: User },
    { id: 'DEPARTMENT', label: '部门', icon: Folder },
    { id: 'COMPANY', label: '公司', icon: Building },
  ];

  return (
    <div
      style={{
        width: 256,
        backgroundColor: 'common.white',
        borderRight: '1px solid border.default',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 16, borderBottom: '1px solid border.default' }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--mui-palette-text-primary)',
            margin: 0,
          }}
        >
          通讯录
        </h2>
      </div>

      {/* 类型筛选 */}
      <div style={{ padding: 16, borderBottom: '1px solid border.default' }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'grey.600',
            marginBottom: 12,
          }}
        >
          分类
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {typeFilters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTypeSelect(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedType === id ? 'primary.light' : 'transparent',
                color: selectedType === id ? 'primary.dark' : 'grey.700',
                transition: 'colors 0.2s',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (selectedType !== id) {
                  e.currentTarget.style.backgroundColor = 'grey.100';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedType !== id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon sx={{ width: 16, height: 16 }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 部门树 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'grey.600',
            marginBottom: 12,
          }}
        >
          组织架构
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => onDepartmentSelect(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              fontSize: 14,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: selectedDepartment === null ? 'primary.light' : 'transparent',
              color: selectedDepartment === null ? 'primary.dark' : 'grey.700',
              transition: 'colors 0.2s',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (selectedDepartment !== null) {
                e.currentTarget.style.backgroundColor = 'grey.100';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedDepartment !== null) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Building sx={{ width: 16, height: 16 }} />
            <span>全部部门</span>
          </button>
          {departments.map((dept) => renderDepartmentNode(dept))}
        </div>
      </div>
    </div>
  );
};
