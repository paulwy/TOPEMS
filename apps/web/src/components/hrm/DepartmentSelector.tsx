import React from "react";
import { Building2, ChevronRight } from "lucide-react";
import { type Department } from "../../api/hrm";
import type { TreeNode } from "../TreeView";
import TreeView from "../TreeView";

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
        type: "department" as const,
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
        type: "employee" as const,
        data: emp,
      };
      if (emp.department_id && deptMap.has(emp.department_id)) {
        deptMap.get(emp.department_id)!.children!.push(empNode);
      }
    });

    return rootNodes;
  }, [departments, employees]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          部门树
        </h3>
        <div className="text-sm text-slate-500">
          {departments.length} 个部门
        </div>
      </div>
      {treeData.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p>暂无部门数据</p>
        </div>
      ) : (
        <TreeView data={treeData} onSelect={onSelect} selectedId={selectedId} />
      )}
    </div>
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

export const DepartmentBreadcrumb: React.FC<DepartmentBreadcrumbProps> = ({
  items,
}) => {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
