import React from 'react';
import type { Department } from '@topems/shared-types';
interface OrgTreeProps {
    selectedId?: string;
    onSelect?: (department: Department) => void;
}
export declare const OrgTree: React.FC<OrgTreeProps>;
export {};
