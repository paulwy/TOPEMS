/**
 * RsExperimentListPage 重构版本
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
  Tabs,
  Tab,
} from "@mui/material";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Flask,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";
import { useAppStore } from "../../store";

// ============ 类型定义 ============
interface Experiment {
  id: string;
  name: string;
  code: string;
  project_name: string;
  phase: string;
  status: string;
  experimenter: string;
  started_at: string;
  completed_at: string | null;
  batch_number: string | null;
}

interface FilterValues {
  search: string;
  status: string;
  phase: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Experiment>[] = [
  {
    id: "code",
    header: "试验编码",
    accessor: "code",
    sortable: true,
  },
  {
    id: "name",
    header: "试验名称",
    accessor: "name",
    sortable: true,
  },
  {
    id: "project_name",
    header: "所属项目",
    accessor: "project_name",
  },
  {
    id: "phase",
    header: "阶段",
    accessor: "phase",
    sortable: true,
    render: (value) => {
      const phaseMap: Record<string, "info" | "warning" | "error" | "default"> = {
        "小试": "info",
        "中试": "warning",
        "放大": "error",
      };
      return <Chip label={value} size="small" color={phaseMap[value] || "default"} />;
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "primary" | "success" | "warning" | "error" | "default" }> = {
        "进行中": { label: "进行中", color: "primary" },
        "已完成": { label: "已完成", color: "success" },
        "暂停": { label: "暂停", color: "warning" },
        "失败": { label: "失败", color: "error" },
      };
      const config = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "experimenter",
    header: "实验员",
    accessor: "experimenter",
  },
  {
    id: "started_at",
    header: "开始日期",
    accessor: "started_at",
    sortable: true,
  },
  {
    id: "batch_number",
    header: "批次号",
    accessor: "batch_number",
    render: (value) => value || "-",
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
  {
    id: "phase",
    label: "阶段",
    type: "text",
  },
];

// ============ 组件 ============
const RsExperimentListPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Experiment[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
    phase: "",
  });

  // Tab 状态
  const [activeTab, setActiveTab] = useState<"all" | "small" | "pilot" | "scaleup">("all");

  // 模态框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockExperiments: Experiment[] = [
      {
        id: "1",
        name: "催化剂活性测试-第1轮",
        code: "EXP-2024-001",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "李四",
        started_at: "2024-04-16",
        completed_at: "2024-04-25",
        batch_number: "B-2024-001",
      },
      {
        id: "2",
        name: "催化剂活性测试-第2轮",
        code: "EXP-2024-002",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "李四",
        started_at: "2024-05-01",
        completed_at: "2024-05-10",
        batch_number: "B-2024-002",
      },
      {
        id: "3",
        name: "催化剂活性测试-第3轮",
        code: "EXP-2024-003",
        project_name: "新型催化剂研发项目",
        phase: "中试",
        status: "进行中",
        experimenter: "王五",
        started_at: "2024-07-15",
        completed_at: null,
        batch_number: "B-2024-003",
      },
      {
        id: "4",
        name: "热稳定性评估",
        code: "EXP-2024-004",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "赵六",
        started_at: "2024-05-15",
        completed_at: "2024-05-20",
        batch_number: null,
      },
      {
        id: "5",
        name: "配方优化实验",
        code: "EXP-2024-005",
        project_name: "新型催化剂研发项目",
        phase: "中试",
        status: "进行中",
        experimenter: "李四",
        started_at: "2024-08-01",
        completed_at: null,
        batch_number: "B-2024-005",
      },
      {
        id: "6",
        name: "聚合物拉伸强度测试",
        code: "EXP-2024-006",
        project_name: "聚合物改性研究",
        phase: "小试",
        status: "已完成",
        experimenter: "张三",
        started_at: "2024-03-01",
        completed_at: "2024-03-15",
        batch_number: null,
      },
      {
        id: "7",
        name: "环保材料降解测试",
        code: "EXP-2024-007",
        project_name: "环保材料开发",
        phase: "放大",
        status: "已完成",
        experimenter: "王五",
        started_at: "2024-06-01",
        completed_at: "2024-06-30",
        batch_number: "B-2024-007",
      },
    ];

    setTimeout(() => {
      setData(mockExperiments);
      setTotal(mockExperiments.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取试验列表
  const fetchExperiments = useCallback(() => {
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
    (experiment: Experiment) => {
      navigate(`/rs/experiments/${experiment.id}`);
    },
    [navigate],
  );

  // 处理编辑
  const handleEdit = useCallback(
    (experiment: Experiment) => {
      navigate(`/rs/experiments/${experiment.id}/edit`);
    },
    [navigate],
  );

  // 处理删除
  const handleDeleteClick = useCallback((experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedExperiment) {
      setData((prev) => prev.filter((e) => e.id !== selectedExperiment.id));
      addNotification({
        title: "成功",
        message: "试验删除成功",
        type: "success",
      });
    }
    setDeleteDialogOpen(false);
    setSelectedExperiment(null);
  }, [selectedExperiment, addNotification]);

  // 过滤数据
  const filteredData = data.filter((exp) => {
    const matchesSearch =
      !filtersValue.search ||
      exp.name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      exp.code.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesStatus =
      !filtersValue.status || exp.status === filtersValue.status;
    const matchesPhase = !filtersValue.phase || exp.phase === filtersValue.phase;

    // 标签页筛选
    if (activeTab === "small" && exp.phase !== "小试") return false;
    if (activeTab === "pilot" && exp.phase !== "中试") return false;
    if (activeTab === "scaleup" && exp.phase !== "放大") return false;

    return matchesSearch && matchesStatus && matchesPhase;
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

  // Tab 配置
  const tabs = [
    { value: "all", label: "全部试验" },
    { value: "small", label: "小试阶段" },
    { value: "pilot", label: "中试阶段" },
    { value: "scaleup", label: "放大试验" },
  ];

  return (
    <>
      <PageHeader
        title="试验管理"
        subtitle="管理研发试验、记录数据、追踪批次"
        createButton={{
          label: "新建试验",
          href: "/rs/experiments/create",
        }}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchExperiments}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      {/* 标签页 */}
      <Box sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 3 }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.value !== "all" ? <Flask size={20} /> : undefined}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

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
        emptyMessage="暂无试验数据"
        searchable
        searchPlaceholder="搜索试验名称或编码..."
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除试验 "{selectedExperiment?.name}" 吗？此操作不可恢复。
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

export default RsExperimentListPageRefactored;
