import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  User,
} from "lucide-react";

export interface TreeNode {
  id: string;
  name: string;
  type: "company" | "department" | "employee";
  children?: TreeNode[];
  [key: string]: any;
}

interface TreeViewProps {
  data: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  showEmployeeCount?: boolean;
}

const TreeView: React.FC<TreeViewProps> = ({
  data,
  onSelect,
  selectedId,
  showEmployeeCount = true,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;

    const paddingLeft = `${level * 16}px`;

    const getIcon = () => {
      if (node.type === "employee") {
        return <User className="w-4 h-4 text-blue-500" />;
      }
      if (hasChildren && isExpanded) {
        return <FolderOpen className="w-4 h-4 text-amber-500" />;
      }
      return <Folder className="w-4 h-4 text-amber-500" />;
    };

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors hover:bg-slate-100 ${
            isSelected
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-slate-700"
          }`}
          style={{ paddingLeft }}
          onClick={() => {
            toggleExpand(node.id);
            onSelect?.(node);
          }}
        >
          {hasChildren && (
            <span className="w-5 h-5 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-5" />}
          <span className="flex-shrink-0">{getIcon()}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {showEmployeeCount && node.type !== "employee" && node.children && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {node.children.length}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">{data.map((node) => renderNode(node))}</div>
  );
};

export default TreeView;
