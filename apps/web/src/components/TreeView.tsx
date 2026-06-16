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
  onSelect?: (_node: TreeNode) => void;
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
        return <User sx={{ width: 16, height: 16, color: "#3b82f6" }} />;
      }
      if (hasChildren && isExpanded) {
        return <FolderOpen sx={{ width: 16, height: 16, color: "#f59e0b" }} />;
      }
      return <Folder sx={{ width: 16, height: 16, color: "#f59e0b" }} />;
    };

    return (
      <div key={node.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingTop: "8px",
            paddingBottom: "8px",
            paddingLeft: undefined,
            paddingRight: "12px",
            cursor: "pointer",
            transition: "background-color 0.2s",
            backgroundColor: isSelected ? "#eff6ff" : "transparent",
            color: isSelected ? "#1d4ed8" : "#334155",
            fontWeight: isSelected ? 500 : 400,
            ...(paddingLeft ? { paddingLeft } : {}),
          }}
          onClick={() => {
            toggleExpand(node.id);
            onSelect?.(node);
          }}
        >
          {hasChildren && (
            <span style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isExpanded ? (
                <ChevronDown sx={{ width: 16, height: 16, color: "#94a3b8" }} />
              ) : (
                <ChevronRight sx={{ width: 16, height: 16, color: "#94a3b8" }} />
              )}
            </span>
          )}
          {!hasChildren && <span style={{ width: "20px" }} />}
          <span style={{ flexShrink: 0 }}>{getIcon()}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
          {showEmployeeCount && node.type !== "employee" && node.children && (
            <span style={{ fontSize: "12px", color: "#94a3b8", backgroundColor: "#f1f5f9", paddingLeft: "8px", paddingRight: "8px", paddingTop: "2px", paddingBottom: "2px", borderRadius: "9999px" }}>
              {node.children.length}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {(node.children || []).map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>{data.map((node) => renderNode(node))}</div>
  );
};

export default TreeView;
