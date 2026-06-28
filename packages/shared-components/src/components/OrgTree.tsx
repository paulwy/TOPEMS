import React, { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse } from '@mui/material';

import type { Department } from '@topems/shared-types';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface OrgTreeProps {
  departments: Department[];
  selectedId?: string;
  onSelect?: (department: Department) => void;
}

const DepartmentItem: React.FC<{
  department: Department;
  selectedId?: string;
  onSelect?: (department: Department) => void;
}> = ({ department, selectedId, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = department.children && department.children.length > 0;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          selected={department.id === selectedId}
          onClick={() => {
            if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
            onSelect?.(department);
          }}
          sx={{ pl: hasChildren ? 2 : 4 }}
        >
          <ListItemIcon>
            {hasChildren ? (
              isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
            ) : (
              <Folder fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText primary={department.name} />
          {hasChildren && (
            <ChevronRight
              style={{
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={isExpanded}>
          <List component="div" disablePadding>
            {department.children!.map((child) => (
              <DepartmentItem
                key={child.id}
                department={child}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export const OrgTree: React.FC<OrgTreeProps> = ({ departments, selectedId, onSelect }) => {
  const rootDepartments = departments.filter((d) => !d.parentId);

  return (
    <List sx={{ height: '100%', overflowY: 'auto' }}>
      {rootDepartments.map((department) => (
        <DepartmentItem
          key={department.id}
          department={department}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
};
