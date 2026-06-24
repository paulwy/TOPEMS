import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Building2, ChevronRight } from 'lucide-react';
import { type Department } from '@/api/hrm';
import type { TreeNode } from '../TreeView';
import TreeView from '../TreeView';

interface DepartmentSelectorProps {
  departments: Department[];
  selectedId: string | undefined;
  onSelect: (node: TreeNode) => void;
  employees?: any[];
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  departments,
  selectedId,
  onSelect,
  employees = [],
}) => {
  const treeData = React.useMemo(() => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        children: [],
        data: dept,
      });
    });

    departments.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    employees.forEach((emp) => {
      const empNode: TreeNode = {
        id: emp.id,
        name: emp.name,
        type: 'employee' as const,
        data: emp,
      };
      if (emp.department_id && deptMap.has(emp.department_id)) {
        deptMap.get(emp.department_id)!.children!.push(empNode);
      }
    });

    return rootNodes;
  }, [departments, employees]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Building2 style={{ width: 20, height: 20, color: '#10b981' }} />
          部门树
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
          {departments.length} 个部门
        </Typography>
      </Box>
      {treeData.length === 0 ? (
        <Box sx={{ p: 8, textAlign: 'center', color: '#64748b' }}>
          <Building2
            style={{
              width: 48,
              height: 48,
              color: '#9ca3af',
              margin: '0 auto 12px',
            }}
          />
          <Typography>暂无部门数据</Typography>
        </Box>
      ) : (
        <TreeView
          data={treeData}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      )}
    </Box>
  );
};

interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface DepartmentBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const DepartmentBreadcrumb: React.FC<DepartmentBreadcrumbProps> = ({ items }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        fontSize: '0.875rem',
      }}
    >
      {items.map((item, index) => (
        <Box
          key={index}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          {index > 0 && (
            <ChevronRight
              style={{
                width: 16,
                height: 16,
                color: '#94a3b8',
                margin: '0 4px',
              }}
            />
          )}
          {item.onClick ? (
            <Button
              onClick={item.onClick}
              sx={{
                fontSize: '0.875rem',
                color: '#64748b',
                transition: 'color',
                '&:hover': { color: '#334155' },
              }}
            >
              {item.label}
            </Button>
          ) : (
            <Typography sx={{ color: '#0f172a', fontWeight: 500 }}>{item.label}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};
