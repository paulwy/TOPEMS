/**
 * RsFormulaListPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";
import { useAppStore } from "../../store";

// ============ 类型定义 ============
interface Formula {
  id: string;
  name: string;
  code: string;
  version: string;
  project_name: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface FilterValues {
  search: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Formula>[] = [
  {
    id: "code",
    header: "配方编码",
    accessor: "code",
    sortable: true,
  },
  {
    id: "name",
    header: "配方名称",
    accessor: "name",
    sortable: true,
  },
  {
    id: "version",
    header: "版本",
    accessor: "version",
    render: (value) => (
      <Chip label={value} size="small" variant="outlined" />
    ),
  },
  {
    id: "project_name",
    header: "所属项目",
    accessor: "project_name",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "success" | "warning" | "primary" | "default" }> = {
        "已发布": { label: "已发布", color: "success" },
        "测试中": { label: "测试中", color: "warning" },
        "草稿": { label: "草稿", color: "default" },
      };
      const config = statusMap[value] || { label: value, color: "primary" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "created_by",
    header: "创建人",
    accessor: "created_by",
  },
  {
    id: "created_at",
    header: "创建日期",
    accessor: "created_at",
    sortable: true,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
];

// ============ 组件 ============
const RsFormulaListPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Formula[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
  });

  // 模态框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockFormulas: Formula[] = [
      {
        id: "1",
        name: "配方A-001",
        code: "FM-2024-001",
        version: "v1.0",
        project_name: "新型催化剂研发项目",
        status: "已发布",
        created_by: "张三",
        created_at: "2024-03-15",
      },
      {
        id: "2",
        name: "配方A-002",
        code: "FM-2024-002",
        version: "v2.0",
        project_name: "新型催化剂研发项目",
        status: "测试中",
        created_by: "李四",
        created_at: "2024-05-20",
      },
      {
        id: "3",
        name: "配方B-001",
        code: "FM-2024-003",
        version: "v1.0",
        project_name: "聚合物改性研究",
        status: "已发布",
        created_by: "王五",
        created_at: "2024-04-10",
      },
      {
        id: "4",
        name: "配方C-001",
        code: "FM-2024-004",
        version: "v1.5",
        project_name: "环保材料开发",
        status: "已发布",
        created_by: "赵六",
        created_at: "2024-06-01",
      },
      {
        id: "5",
        name: "配方D-001",
        code: "FM-2024-005",
        version: "v0.1",
        project_name: "纳米材料合成工艺",
        status: "草稿",
        created_by: "孙七",
        created_at: "2024-07-15",
      },
    ];

    setTimeout(() => {
      setData(mockFormulas);
      setTotal(mockFormulas.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取配方列表
  const fetchFormulas = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理查看
  const handleView = useCallback(
    (formula: Formula) => {
      navigate(`/rs/formulas/${formula.id}`);
    },
    [navigate],
  );

  // 处理编辑
  const handleEdit = useCallback(
    (formula: Formula) => {
      navigate(`/rs/formulas/${formula.id}/edit`);
    },
    [navigate],
  );

  // 处理删除
  const handleDeleteClick = useCallback((formula: Formula) => {
    setSelectedFormula(formula);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedFormula) {
      setData((prev) => prev.filter((f) => f.id !== selectedFormula.id));
      addNotification({
        title: "成功",
        message: "配方删除成功",
        type: "success",
      });
    }
    setDeleteDialogOpen(false);
    setSelectedFormula(null);
  }, [selectedFormula, addNotification]);

  // 过滤数据
  const filteredData = data.filter((formula) => {
    const matchesSearch =
      !filtersValue.search ||
      formula.name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      formula.code.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesStatus =
      !filtersValue.status || formula.status === filtersValue.status;
    return matchesSearch && matchesStatus;
  });

  // 行操作
  const rowActions = [
    {
      label: "查看",
      icon: <Eye size={16} />,
      onClick: handleView,
      color: "primary" as const,
    },
    {
      label: "编辑",
      icon: <Edit size={16} />,
      onClick: handleEdit,
      color: "warning" as const,
    },
    {
      label: "删除",
      icon: <Trash2 size={16} />,
      onClick: handleDeleteClick,
      color: "error" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="配方管理"
        subtitle="管理研发配方、版本控制、配方发布"
        createButton={{
          label: "新增配方",
          href: "/rs/formulas/create",
        }}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchFormulas}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleView}
        rowActions={rowActions}
        emptyMessage="暂无配方数据"
        searchable
        searchPlaceholder="搜索配方名称或编码..."
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除配方 "{selectedFormula?.name}" 吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsFormulaListPageRefactored;
