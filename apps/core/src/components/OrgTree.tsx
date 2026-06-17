import React, { useState, useEffect } from 'react';
import type { Department } from '@topems/shared-types';
import { OrgTree as OrgTreeUI } from '@topems/shared-components';
import { orgApi } from '../api/org';

interface OrgTreeProps {
  selectedId?: string;
  onSelect?: (department: Department) => void;
}

export const OrgTree: React.FC<OrgTreeProps> = ({ selectedId, onSelect }) => {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await orgApi.getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };

    fetchDepartments();
  }, []);

  return <OrgTreeUI departments={departments} selectedId={selectedId} onSelect={onSelect} />;
};
