import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TreeView from "../TreeView";
import type { TreeNode } from "../TreeView";

describe("TreeView", () => {
  const mockData: TreeNode[] = [
    { id: "1", label: "根节点" },
    { id: "2", label: "独立节点" },
  ];

  it("应该渲染组件", () => {
    const { container } = render(<TreeView data={mockData} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("应该接受 selected 属性", () => {
    const { container } = render(<TreeView data={mockData} selected="2" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("应该接受 expanded 属性", () => {
    const { container } = render(<TreeView data={mockData} expanded={["1"]} />);
    expect(container.firstChild).toBeTruthy();
  });
});