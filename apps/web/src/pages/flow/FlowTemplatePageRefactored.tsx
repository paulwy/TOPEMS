/**
 * FlowTemplatePage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Eye,
  Edit,
  Copy,
  Trash2,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

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
    header: "模板名称",
    accessor: "name",
    sortable: true,
  },
  {
    id: "type",
    header: "模板类型",
    accessor: "type",
    render: (value) => getTypeText(value as string),
  },
  {
    id: "scope",
    header: "适用范围",
    accessor: "scope",
  },
  {
    id: "usageCount",
    header: "使用次数",
    accessor: "usageCount",
    sortable: true,
  },
  {
    id: "creator",
    header: "创建人",
    accessor: "creator",
  },
  {
    id: "createdAt",
    header: "创建时间",
    accessor: "createdAt",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索模板名称...",
  },
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
];

// ============ 组件 ============
const FlowTemplatePageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FlowTemplate[]>(mockTemplates);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

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
    const matchesSearch = item.name.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesType = filtersValue.type === "all" || item.type === filtersValue.type;
    return matchesSearch && matchesType;
  });

  // 分页数据
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalCount = filteredData.length;

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
    setPage(1);
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
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

  return (
    <>
      <PageHeader
        title="流程模板"
        subtitle="管理和使用流程模板"
        icon={<FileText size={24} />}
        showBack
        onBack={() => navigate(-1)}
      />

      <ListPageTemplate
        columns={columns}
        data={paginatedData}
        loading={loading}
        filters={filters}
        filtersValue={filtersValue}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: totalCount,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无流程模板"
        customActions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={handleNewTemplate}
              sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" } }}
            >
              新建模板
            </Button>
            <IconButton onClick={handleRefresh} title="刷新">
              <Loader2 size={20} sx={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </IconButton>
          </>
        }
        renderRowActions={(template) => (
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => handleView(template)} title="查看">
              <Eye size={18} />
            </IconButton>
            <IconButton size="small" onClick={() => handleEdit(template)} title="编辑">
              <Edit size={18} />
            </IconButton>
            <IconButton size="small" onClick={() => handleCopy(template)} title="复制">
              <Copy size={18} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(template)}
              title="删除"
              sx={{ color: "error.main" }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        )}
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
