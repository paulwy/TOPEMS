import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import TreeView, { TreeNode } from '../TreeView';

const sampleData: TreeNode[] = [
  {
    id: 'node-1',
    label: 'Node 1',
    children: [
      { id: 'node-1-1', label: 'Child 1.1' },
      { id: 'node-1-2', label: 'Child 1.2' },
    ],
  },
  {
    id: 'node-2',
    label: 'Node 2',
  },
];

describe('TreeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tree nodes from data', () => {
    renderWithProviders(<TreeView data={sampleData} />);
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });

  it('does not render child nodes when parent is collapsed', () => {
    renderWithProviders(<TreeView data={sampleData} />);
    expect(screen.queryByText('Child 1.1')).not.toBeInTheDocument();
    expect(screen.queryByText('Child 1.2')).not.toBeInTheDocument();
  });

  it('renders child nodes when parent is expanded via expanded prop', () => {
    renderWithProviders(
      <TreeView
        data={sampleData}
        expanded={['node-1']}
      />
    );
    expect(screen.getByText('Child 1.1')).toBeInTheDocument();
    expect(screen.getByText('Child 1.2')).toBeInTheDocument();
  });

  it('toggles node expansion when expand icon is clicked', () => {
    renderWithProviders(<TreeView data={sampleData} />);
    // Child should not be visible initially
    expect(screen.queryByText('Child 1.1')).not.toBeInTheDocument();

    // Click the expand toggle button for Node 1 (the row's first IconButton)
    const nodeLabel = screen.getByText('Node 1');
    const row = nodeLabel.parentElement!.parentElement!;
    const toggleButton = row.querySelector('button');
    expect(toggleButton).not.toBeNull();
    fireEvent.click(toggleButton!);

    expect(screen.getByText('Child 1.1')).toBeInTheDocument();
    expect(screen.getByText('Child 1.2')).toBeInTheDocument();
  });

  it('calls onSelect when a node is clicked', () => {
    const handleSelect = vi.fn();
    renderWithProviders(
      <TreeView
        data={sampleData}
        onSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Node 2'));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect.mock.calls[0][0].id).toBe('node-2');
  });

  it('does not call onSelect when a disabled node is clicked', () => {
    const handleSelect = vi.fn();
    const disabledData: TreeNode[] = [
      { id: 'disabled-node', label: 'Disabled Node', disabled: true },
    ];
    renderWithProviders(
      <TreeView
        data={disabledData}
        onSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Disabled Node'));
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('calls onExpand when expand icon is clicked with controlled expanded prop', () => {
    const handleExpand = vi.fn();
    renderWithProviders(
      <TreeView
        data={sampleData}
        expanded={[]}
        onExpand={handleExpand}
      />
    );

    const nodeLabel = screen.getByText('Node 1');
    const row = nodeLabel.parentElement!.parentElement!;
    const toggleButton = row.querySelector('button');
    fireEvent.click(toggleButton!);

    expect(handleExpand).toHaveBeenCalledWith('node-1');
  });

  it('supports density prop without crashing', () => {
    const { container } = renderWithProviders(
      <TreeView
        data={sampleData}
        density='compact'
      />
    );
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(container).toBeDefined();
  });

  it('renders node with badge when provided', () => {
    const dataWithBadge: TreeNode[] = [{ id: 'badge-node', label: 'Badge Node', badge: 5 }];
    renderWithProviders(<TreeView data={dataWithBadge} />);
    expect(screen.getByText('Badge Node')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
