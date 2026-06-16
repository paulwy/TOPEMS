/**
 * FlowTemplatePage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 ListPageTemplate 替代 Card + Table 布局
 * 3. 使用 ColumnDef 定义表格列
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Eye,
  Edit,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface FlowTemplate {
  id: string;
  name: string;
  type: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
}

interface FilterValues {
  search: string;
  type: string;
}

// ============ Mock 数据 ============
const mockTemplates: FlowTemplate[] = [
  {
    id: "TPL-001",
    name: "标准请假流程",
    type: "approval",
    scope: "全公司",
    usageCount: 156,
    creator: "张三",
    createdAt: "2024-01-10",
  },
  {
    id: "TPL-002",
    name: "差旅报销流程",
    type: "reimbursement",
    scope: "全公司",
    usageCount: 89,
    creator: "李四",
    createdAt: "2024-01-15",
  },
  {
    id: "TPL-003",
    name: "采购审批流程",
    type: "purchase",
    scope: "采购部",
    usageCount: 45,
    creator: "王五",
    createdAt: "2024-02-01",
  },
  {
    id: "TPL-004",
    name: "合同审批流程",
    type: "contract",
    scope: "法务部",
    usageCount: 23,
    creator: "赵六",
    createdAt: "2024-02-10",
  },
  {
    id: "TPL-005",
    name: "加班申请流程",
    type: "approval",
    scope: "全公司",
    usageCount: 234,
    creator: "张三",
    createdAt: "2024-02-15",
  },
  {
    id: "TPL-006",
    name: "设备借用流程",
    type: "approval",
    scope: "行政部",
    usageCount: 67,
    creator: "李四",
    createdAt: "2024-02-20",
  },
  {
    id: "TPL-007",
    name: "入职审批流程",
    type: "approval",
    scope: "人力资源部",
    usageCount: 12,
    creator: "孙七",
    createdAt: "2024-03-01",
  },
  {
    id: "TPL-008",
    name: "离职审批流程",
    type: "approval",
    scope: "人力资源部",
    usageCount: 8,
    creator: "孙七",
    createdAt: "2024-03-05",
  },
];

// ============ 类型映射 ============
const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    approval: "审批流程",
    reimbursement: "报销流程",
    purchase: "采购流程",
    contract: "合同流程",
  };
  return typeMap[type] || type;
};

// ============ 列定义 ============
const columns: ColumnDef<FlowTemplate>[] = [
  {
    id: "name",
    label: "模板名称",
    sortable: true,
  },
  {
    id: "type",
    label: "模板类型",
    render: (row) => getTypeText(row.type),
  },
  {
    id: "scope",
    label: "适用范围",
  },
  {
    id: "usageCount",
    label: "使用次数",
    sortable: true,
  },
  {
    id: "creator",
    label: "创建人",
  },
  {
    id: "createdAt",
    label: "创建时间",
  },
];

// ============ 组件 ============
const FlowTemplatePageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FlowTemplate[]>(mockTemplates);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    type: "all",
  });

  // 删除弹窗
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  // 筛选后的数据
  const filteredData = data.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(filtersValue.search.toLowerCase());
    const matchesType =
      filtersValue.type === "all" || item.type === filtersValue.type;
    return matchesSearch && matchesType;
  });

  // 分页数据
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const totalCount = filteredData.length;

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setFiltersValue((prev) => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFiltersValue((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 处理每页数量变化
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  // 处理查看
  const handleView = useCallback((template: FlowTemplate) => {
    console.log("查看模板:", template.id);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((template: FlowTemplate) => {
    console.log("编辑模板:", template.id);
  }, []);

  // 处理复制
  const handleCopy = useCallback(
    (template: FlowTemplate) => {
      const newTemplate: FlowTemplate = {
        ...template,
        id: `TPL-${String(data.length + 1).padStart(3, "0")}`,
        name: `${template.name} (副本)`,
        usageCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setData((prev) => [...prev, newTemplate]);
    },
    [data.length],
  );

  // 处理删除
  const handleDelete = useCallback((template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  }, []);

  // 确认删除
  const confirmDelete = useCallback(() => {
    if (selectedTemplate) {
      setData((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  }, [selectedTemplate]);

  // 新建模板
  const handleNewTemplate = useCallback(() => {
    console.log("新建模板");
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  // 行操作
  const rowActions: RowAction<FlowTemplate>[] = [
    { label: "查看", icon: <Eye size={18} />, onClick: handleView },
    { label: "编辑", icon: <Edit size={18} />, onClick: handleEdit },
    { label: "复制", icon: <Copy size={18} />, onClick: handleCopy },
    {
      label: "删除",
      icon: <Trash2 size={18} />,
      onClick: handleDelete,
      color: "error",
    },
  ];

  return (
    <>
      <PageHeader
        title="流程模板"
        subtitle="管理和使用流程模板"
        backButton={{ onClick: () => navigate(-1) }}
      />

      <ListPageTemplate<FlowTemplate>
        title="流程模板列表"
        columns={columns}
        data={paginatedData}
        loading={loading}
        searchable
        searchPlaceholder="搜索模板名称..."
        searchValue={filtersValue.search}
        onSearch={handleSearch}
        filters={[
          {
            id: "type",
            label: "模板类型",
            type: "select",
            options: [
              { value: "all", label: "全部" },
              { value: "approval", label: "审批流程" },
              { value: "reimbursement", label: "报销流程" },
              { value: "purchase", label: "采购流程" },
              { value: "contract", label: "合同流程" },
            ],
          },
        ]}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: totalCount,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无流程模板"
        rowActions={rowActions}
        headerContent={
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2, justifyContent: "flex-end" }}
          >
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={handleNewTemplate}
              sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" } }}
            >
              新建模板
            </Button>
            <Tooltip title="刷新">
              <IconButton onClick={handleRefresh}>
                <RefreshCw
                  size={20}
                  style={{
                    animation: loading ? "spin 1s linear infinite" : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>删除模板</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除模板 <strong>{selectedTemplate?.name}</strong> 吗？
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
            删除后无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShowDeleteDialog(false)}>
            取消
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowTemplatePageRefactored;
