import React, { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// 模拟工作流数据
type Workflow = {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'inactive'
  createdAt: string
  createdBy: string
  version: string
}

// 生成示例数据
const generateData = (count: number): Workflow[] => {
  const statuses: ('draft' | 'active' | 'inactive')[] = ['draft', 'active', 'inactive']
  const data: Workflow[] = []
  
  for (let i = 1; i <= count; i++) {
    data.push({
      id: `wf-${i}`,
      name: `工作流 ${i}`,
      description: `这是工作流 ${i} 的描述`,
      status: statuses[i % 3],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
      createdBy: ['张三', '李四', '王五'][i % 3],
      version: `${Math.floor(i / 3) + 1}.${i % 3}`,
    })
  }
  
  return data
}

export function WorkflowTableExample() {
  const [loading, setLoading] = useState(false)
  const [data] = useState<Workflow[]>(() => generateData(50))

  // 列定义
  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => <div className="text-left">ID</div>,
        cell: ({ row }) => (
          <div className="text-left font-medium">{row.getValue('id')}</div>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto"
            >
              工作流名称
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="text-left">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'description',
        header: () => <div className="text-left">描述</div>,
        cell: ({ row }) => (
          <div className="text-left">{row.getValue('description')}</div>
        ),
      },
      {
        accessorKey: 'status',
        header: () => <div className="text-left">状态</div>,
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          const statusConfig: Record<string, { label: string; color: string }> = {
            draft: { label: '草稿', color: 'bg-yellow-100 text-yellow-800' },
            active: { label: '启用', color: 'bg-green-100 text-green-800' },
            inactive: { label: '禁用', color: 'bg-gray-100 text-gray-800' },
          }
          const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
          
          return (
            <div className="text-left">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'createdBy',
        header: () => <div className="text-left">创建者</div>,
        cell: ({ row }) => (
          <div className="text-left">{row.getValue('createdBy')}</div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => <div className="text-left">创建时间</div>,
        cell: ({ row }) => (
          <div className="text-left">{row.getValue('createdAt')}</div>
        ),
      },
      {
        accessorKey: 'version',
        header: () => <div className="text-left">版本</div>,
        cell: ({ row }) => (
          <div className="text-left">{row.getValue('version')}</div>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const workflow = row.original
          
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">打开菜单</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>操作</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => console.log('查看工作流:', workflow.id)}>
                    查看
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('编辑工作流:', workflow.id)}>
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('查看历史:', workflow.id)}>
                    版本历史
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => console.log('删除工作流:', workflow.id)}>
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">工作流列表 (使用 TanStack Table)</h1>
      
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKey="name"
        searchPlaceholder="搜索工作流..."
        onRowClick={(workflow) => {
          console.log('点击工作流:', workflow)
        }}
      />
    </div>
  )
}
