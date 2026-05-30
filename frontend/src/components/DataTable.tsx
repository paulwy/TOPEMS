import React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  PaginationState,
  VisibilityState,
} from '@tanstack/react-table'
import { Download, Settings2, Eye, EyeOff } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  loading?: boolean
  onRowClick?: (row: TData) => void
  exportFileName?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  loading,
  onRowClick,
  exportFileName = 'export',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const addNotification = useAppStore((state) => state.addNotification)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
  })

  // 导出为 CSV
  const exportToCSV = () => {
    try {
      const visibleColumns = table.getAllLeafColumns().filter(column => column.getIsVisible())
      const headers = visibleColumns.map(col => col.id)
      const headerNames = visibleColumns.map(col => (col.columnDef.header as string) || col.id)
      
      const csvData = [
        headerNames.join(','),
        ...table.getFilteredRowModel().rows.map(row => {
          return visibleColumns.map(col => {
            const value = row.getValue(col.id)
            if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        })
      ].join('\n')
      
      const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${exportFileName}-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      addNotification({
        title: '导出成功',
        message: '数据已成功导出为 CSV 文件',
        type: 'success'
      })
    } catch (error) {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
        type: 'error'
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        {/* 搜索栏 */}
        {searchKey && (
          <div className="flex items-center flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
        )}
        {!searchKey && <div className="flex-1" />}
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                列设置
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>显示/隐藏列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => column.toggleVisibility()}
                >
                  <span>{(column.columnDef.header as string) || column.id}</span>
                  {column.getIsVisible() ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控制 */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-gray-500">
          共 {table.getFilteredRowModel().rows.length} 条记录
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-500">
            第 {table.getState().pagination.pageIndex + 1} 页，共{' '}
            {table.getPageCount()} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
