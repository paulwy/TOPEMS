import React from "react";
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
declare const TreeView: React.FC<TreeViewProps>;
export default TreeView;
