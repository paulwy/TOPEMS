import React, { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { flowApi, type Workflow } from '../api/flow';

export function WorkflowTableExample() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await flowApi.workflows.list();
      if (response.success && response.data) {
        setData(response.data.items || []);
      } else {
        setError(response.message || '加载工作流失败');
      }
    } catch (err: any) {
      console.error('加载工作流失败:', err);
      setError('加载工作流失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => <div className='text-left'>ID</div>,
        cell: ({ row }) => <div className='text-left font-medium'>{row.getValue('id')}</div>,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='p-0 h-auto'
            >
              工作流名称
              <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
          );
        },
        cell: ({ row }) => <div className='text-left'>{row.getValue('name')}</div>,
      },
      {
        accessorKey: 'description',
        header: () => <div className='text-left'>描述</div>,
        cell: ({ row }) => <div className='text-left'>{row.getValue('description')}</div>,
      },
      {
        accessorKey: 'is_active',
        header: () => <div className='text-left'>状态</div>,
        cell: ({ row }) => {
          const isActive = row.getValue('is_active') as boolean;
          const config = isActive
            ? { label: '启用', color: 'bg-green-100 text-green-800' }
            : { label: '禁用', color: 'bg-gray-100 text-gray-800' };

          return (
            <div className='text-left'>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
              >
                {config.label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'created_by',
        header: () => <div className='text-left'>创建者</div>,
        cell: ({ row }) => <div className='text-left'>{row.getValue('created_by') || '-'}</div>,
      },
      {
        accessorKey: 'created_at',
        header: () => <div className='text-left'>创建时间</div>,
        cell: ({ row }) => <div className='text-left'>{row.getValue('created_at')}</div>,
      },
      {
        accessorKey: 'updated_at',
        header: () => <div className='text-left'>更新时间</div>,
        cell: ({ row }) => <div className='text-left'>{row.getValue('updated_at')}</div>,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const workflow = row.original;

          return (
            <div className='text-right'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='h-8 w-8 p-0'>
                    <span className='sr-only'>打开菜单</span>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel>操作</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => console.log('查看工作流:', workflow.id)}>查看</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('编辑工作流:', workflow.id)}>编辑</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('查看历史:', workflow.id)}>版本历史</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='text-red-600' onClick={() => console.log('删除工作流:', workflow.id)}>
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  if (error) {
    return (
      <div className='p-6'>
        <h1 className='text-2xl font-bold mb-6'>工作流列表</h1>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-700'>
          {error}
          <Button variant='outline' className='ml-4' onClick={loadWorkflows}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>工作流列表</h1>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKey='name'
        searchPlaceholder='搜索工作流...'
        onRowClick={(workflow) => {
          console.log('点击工作流:', workflow);
        }}
      />
    </div>
  );
}
