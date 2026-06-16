/**
 * FlowDefinitionPage 重构版本
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
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  Eye,
  Plus,
  Edit,
  Send,
  Ban,
  Loader2,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface FlowDefinition {
  id: string;
  name: string;
  type: string;
  version: string;
  status: "active" | "inactive" | "draft";
  creator: string;
  createdAt: string;
}

interface FilterValues {
  search: string;
  type: string;
  status: string;
}

// ============ Mock 数据 ============
const mockFlowDefinitions: FlowDefinition[] = [
  {
    id: "1",
    name: "请假审批流程",
    type: "approval",
    version: "v1.2",
    status: "active",
    creator: "张三",
    createdAt: "2024-01-15 10:30",
  },
  {
    id: "2",
    name: "费用报销流程",
    type: "reimbursement",
    version: "v2.0",
    status: "active",
    creator: "李四",
    createdAt: "2024-02-20 14:20",
  },
  {
    id: "3",
    name: "合同审批流程",
    type: "contract",
    version: "v1.0",
    status: "draft",
    creator: "王五",
    createdAt: "2024-03-05 09:15",
  },
  {
    id: "4",
    name: "采购申请流程",
    type: "purchase",
    version: "v1.1",
    status: "active",
    creator: "赵六",
    createdAt: "2024-03-10 16:45",
  },
  {
    id: "5",
    name: "加班申请流程",
    type: "approval",
    version: "v1.0",
    status: "inactive",
    creator: "张三",
    createdAt: "2024-03-12 11:00",
  },
  {
    id: "6",
    name: "设备借用流程",
    type: "approval",
    version: "v1.0",
    status: "active",
    creator: "李四",
    createdAt: "2024-03-15 13:30",
  },
  {
    id: "7",
    name: "差旅申请流程",
    type: "travel",
    version: "v2.1",
    status: "active",
    creator: "王五",
    createdAt: "2024-03-18 08:00",
  },
  {
    id: "8",
    name: "入职审批流程",
    type: "approval",
    version: "v1.0",
    status: "draft",
    creator: "赵六",
    createdAt: "2024-03-20 10:15",
  },
];

// ============ 状态映射 ============
const getStatusConfig = (status: FlowDefinition["status"]) => {
  const statusMap: Record<string, { label: string; color: "success" | "default" | "warning" }> = {
    active: { label: "已发布", color: "success" },
    inactive: { label: "已禁用", color: "default" },
    draft: { label: "草稿", color: "warning" },
  };
  return statusMap[status] || { label: status, color: "default" as const };
};

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    approval: "审批流程",
    reimbursement: "报销流程",
    contract: "合同流程",
    purchase: "采购流程",
    travel: "差旅流程",
  };
  return typeMap[type] || type;
};

// ============ 列定义 ============
const columns: ColumnDef<FlowDefinition>[] = [
  {
    id: "name",
    label: "流程名称",
    sortable: true,
    render: (row) => row.name,
  },
  {
    id: "type",
    label: "流程类型",
    render: (row) => getTypeText(row.type),
  },
  {
    id: "version",
    label: "版本",
    render: (row) => row.version,
  },
  {
    id: "status",
    label: "状态",
    render: (row) => {
      const config = getStatusConfig(row.status);
      return <Chip size="small" label={config.label} color={config.color} />;
    },
  },
  {
    id: "creator",
    label: "创建人",
    render: (row) => row.creator,
  },
  {
    id: "createdAt",
    label: "创建时间",
    render: (row) => row.createdAt,
  },
];

// ============ 组件 ============
const FlowDefinitionPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FlowDefinition[]>(mockFlowDefinitions);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    type: "all",
    status: "all",
  });

  // 详情弹窗
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);

  // 筛选后的数据
  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesType = filtersValue.type === "all" || item.type === filtersValue.type;
    const matchesStatus = filtersValue.status === "all" || item.status === filtersValue.status;
    return matchesSearch && matchesType && matchesStatus;
  });

  // 分页数据
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalCount = filteredData.length;

  // 获取流程类型文本
  const getTypeTextLocal = (type: string) => getTypeText(type);

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
  const handleView = useCallback((flow: FlowDefinition) => {
    setSelectedFlow(flow);
    setShowDetailModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((flow: FlowDefinition) => {
    console.log("编辑流程:", flow.id);
  }, []);

  // 处理发布
  const handlePublish = useCallback((flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, status: "active" as const } : f)),
    );
  }, []);

  // 处理禁用
  const handleDisable = useCallback((flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, status: "inactive" as const } : f)),
    );
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <>
      <PageHeader
        title="流程定义"
        subtitle="管理所有流程的定义和配置"
        backButton={{ onClick: () => navigate(-1) }}
        actions={[
          {
            label: "新建流程",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: () => {},
            variant: "contained",
            color: "primary",
          },
          {
            label: "刷新",
            icon: <Loader2 style={{ width: 18, height: 18 }} />,
            onClick: handleRefresh,
            variant: "outlined",
          },
        ]}
      />

      <ListPageTemplate
        title="流程列表"
        columns={columns as any}
        data={paginatedData}
        loading={loading}
        pagination={{
          page,
          pageSize,
          total: totalCount,
          onPageChange: handlePageChange,
          onPageSizeChange: () => {},
        }}
        onRowClick={handleView as any}
        emptyMessage="暂无流程定义"
        rowActions={[
          {
            label: "查看",
            icon: <Eye style={{ width: 16, height: 16 }} />,
            onClick: (flow) => handleView(flow as unknown as FlowDefinition),
          },
          {
            label: "编辑",
            icon: <Edit style={{ width: 16, height: 16 }} />,
            onClick: (flow) => handleEdit(flow as unknown as FlowDefinition),
            color: "primary",
          },
          {
            label: "发布",
            icon: <Send style={{ width: 16, height: 16 }} />,
            onClick: (flow) => handlePublish(flow as unknown as FlowDefinition),
            show: (row) => (row as unknown as FlowDefinition).status !== "active",
          },
          {
            label: "禁用",
            icon: <Ban style={{ width: 16, height: 16 }} />,
            onClick: (flow) => handleDisable(flow as unknown as FlowDefinition),
            show: (row) => (row as unknown as FlowDefinition).status === "active",
          },
        ]}
      />

      {/* 详情对话框 */}
      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>流程详情</DialogTitle>
        <DialogContent>
          {selectedFlow && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  流程名称
                </Typography>
                <Typography variant="body1">{selectedFlow.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  流程类型
                </Typography>
                <Typography variant="body1">{getTypeTextLocal(selectedFlow.type)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  版本
                </Typography>
                <Typography variant="body1">{selectedFlow.version}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  状态
                </Typography>
                <Chip
                  size="small"
                  label={getStatusConfig(selectedFlow.status).label}
                  color={getStatusConfig(selectedFlow.status).color}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  创建人
                </Typography>
                <Typography variant="body1">{selectedFlow.creator}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  创建时间
                </Typography>
                <Typography variant="body1">{selectedFlow.createdAt}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlowDefinitionPageRefactored;
