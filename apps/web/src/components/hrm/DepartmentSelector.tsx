import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { Building2, ChevronRight } from 'lucide-react';
import { type Department, type Employee } from '@/api/hrm';
import type { TreeNode } from '../common/TreeView';
import TreeView from '../common/TreeView';
import i18n from '@/i18n';

interface DepartmentSelectorProps {
  departments: Department[];
  selectedId: string | undefined;
  onSelect: (node: TreeNode) => void;
  employees?: Employee[];
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  departments,
  selectedId,
  onSelect,
  employees = [],
}) => {
  const theme = useTheme();
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
      if (dept.parentId && deptMap.has(dept.parentId)) {
        deptMap.get(dept.parentId)!.children!.push(node);
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
            fontSize: designTokens.typography.fontSize.scale['1.125rem'],
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Building2 style={{ width: 20, height: 20, color: theme.palette.success.main }} />
          {i18n.t('components.department_selector.k0')}
        </Typography>
        <Typography
          sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'grey.600' }}
        >
          {departments.length} {i18n.t('components.department_selector.k0')}
        </Typography>
      </Box>
      {treeData.length === 0 ? (
        <Box sx={{ p: 8, textAlign: 'center', color: 'grey.600' }}>
          <Building2
            style={{
              width: 48,
              height: 48,
              color: theme.palette.text.disabled,
              margin: '0 auto 12px',
            }}
          />
          <Typography>{i18n.t('components.department_selector.k0')}</Typography>
        </Box>
      ) : (
        <TreeView
          data={treeData}
          onSelect={onSelect}
          selected={selectedId}
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
        fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                color: 'grey.400',
                margin: `0 ${designTokens.spacing.xs}px`,
              }}
            />
          )}
          {item.onClick ? (
            <Button
              onClick={item.onClick}
              sx={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                color: 'grey.600',
                transition: 'color',
                '&:hover': { color: 'grey.700' },
              }}
            >
              {item.label}
            </Button>
          ) : (
            <Typography sx={{ color: 'grey.900', fontWeight: 500 }}>{item.label}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};
