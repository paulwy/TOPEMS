import { useState, useEffect, useMemo } from "react";
import { logger } from "@/utils/logger";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { Chip, Box, Typography, Tooltip, IconButton,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";

interface Report {
  id: string;
  name: string;
  type: string;
  creator: string;
  created_at: string;
  updated_at: string;
  status: "active" | "draft" | "archived";
  description?: string;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case "daily":
      return { color: "info" as const, label: "日报" };
    case "weekly":
      return { color: "success" as const, label: "周报" };
    case "monthly":
      return { color: "warning" as const, label: "月报" };
    case "quarterly":
      return { color: "secondary" as const, label: "季报" };
    case "annual":
      return { color: "primary" as const, label: "年报" };
    case "custom":
      return { color: "default" as const, label: "自定义" };
    default:
      return { color: "default" as const, label: type };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":
      return { color: "success" as const, label: "启用" };
    case "draft":
      return { color: "warning" as const, label: "草稿" };
    case "archived":
      return { color: "default" as const, label: "归档" };
    default:
      return { color: "default" as const, label: status };
  }
};

const mockReports: Report[] = [
  {
    id: "1",
    name: "每日生产报表",
    type: "daily",
    creator: "张三",
    created_at: "2024-01-15T08:00:00Z",
    updated_at: "2024-06-10T10:30:00Z",
    status: "active",
    description: "每日生产数据汇总报表",
  },
  {
    id: "2",
    name: "每周质量分析",
    type: "weekly",
    creator: "李四",
    created_at: "2024-02-20T09:00:00Z",
    updated_at: "2024-06-09T14:20:00Z",
    status: "active",
    description: "每周质量检验数据分析",
  },
  {
    id: "3",
    name: "月度销售报告",
    type: "monthly",
    creator: "王五",
    created_at: "2024-03-10T10:00:00Z",
    updated_at: "2024-06-01T08:45:00Z",
    status: "active",
    description: "月度销售业绩汇总",
  },
  {
    id: "4",
    name: "季度研发进度",
    type: "quarterly",
    creator: "赵六",
    created_at: "2024-01-05T11:00:00Z",
    updated_at: "2024-04-05T16:00:00Z",
    status: "archived",
    description: "研发项目季度进度报告",
  },
  {
    id: "5",
    name: "年度财务总结",
    type: "annual",
    creator: "孙七",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-02-28T20:00:00Z",
    status: "archived",
    description: "年度财务数据汇总分析",
  },
  {
    id: "6",
    name: "设备维护报告",
    type: "custom",
    creator: "周八",
    created_at: "2024-04-12T13:00:00Z",
    updated_at: "2024-06-08T09:15:00Z",
    status: "draft",
    description: "设备维护保养记录统计",
  },
  {
    id: "7",
    name: "库存预警报表",
    type: "daily",
    creator: "吴九",
    created_at: "2024-05-01T08:00:00Z",
    updated_at: "2024-06-10T11:30:00Z",
    status: "active",
    description: "库存低于安全库存预警",
  },
  {
    id: "8",
    name: "人员绩效分析",
    type: "monthly",
    creator: "郑十",
    created_at: "2024-03-20T14:00:00Z",
    updated_at: "2024-06-05T15:45:00Z",
    status: "active",
    description: "员工工作绩效月度统计",
  },
];

const BIReportPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        setReports(mockReports);
        setLoading(false);
      }, 500);
    } catch (error) {
      logger.error("Failed to load reports:", error);
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.creator.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || report.type === filterType;
      const matchesStatus = !filterStatus || report.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, filterType, filterStatus]);

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newPageSize: number) => {
    setRowsPerPage(newPageSize);
    setPage(0);
  };

  const columns = useMemo<ColumnDef<Report>[]>(
    () => [
      {
        id: "name",
        label: "报表名称",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FileText size={18} color="#64748b" />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.description || "暂无描述"}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: "type",
        label: "类型",
        render: (row) => {
          const typeConfig = getTypeConfig(row.type);
          return (
            <Chip
              label={typeConfig.label}
              size="small"
              color={typeConfig.color}
              variant="outlined"
            />
          );
        },
      },
      {
        id: "creator",
        label: "创建人",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <User size={14} color="#64748b" />
            <Typography variant="body2">{row.creator}</Typography>
          </Box>
        ),
      },
      {
        id: "created_at",
        label: "创建时间",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Calendar size={14} color="#64748b" />
            <Typography variant="body2" color="text.secondary">
              {new Date(row.created_at).toLocaleDateString("zh-CN")}
            </Typography>
          </Box>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return (
            <Chip
              label={statusConfig.label}
              size="small"
              color={statusConfig.color}
            />
          );
        },
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Report>[]>(
    () => [
      {
        label: "预览",
        icon: <Eye size={16} />,
        onClick: (row) => logger.info("View:", row.id),
      },
      {
        label: "下载",
        icon: <Download size={16} />,
        onClick: (row) => logger.info("Download:", row.id),
      },
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: (row) => logger.info("Edit:", row.id),
      },
      {
        label: "删除",
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => logger.info("Delete:", row.id),
        confirm: true,
        confirmMessage: "确定要删除这个报表吗?",
      },
    ],
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: "type",
        label: "报表类型",
        type: "select",
        options: [
          { value: "", label: "全部类型" },
          { value: "daily", label: "日报" },
          { value: "weekly", label: "周报" },
          { value: "monthly", label: "月报" },
          { value: "quarterly", label: "季报" },
          { value: "annual", label: "年报" },
          { value: "custom", label: "自定义" },
        ],
        value: filterType,
        onChange: (value) => setFilterType(value as string),
      },
      {
        id: "status",
        label: "状态",
        type: "select",
        options: [
          { value: "", label: "全部" },
          { value: "active", label: "启用" },
          { value: "draft", label: "草稿" },
          { value: "archived", label: "归档" },
        ],
        value: filterStatus,
        onChange: (value) => setFilterStatus(value as string),
      },
    ],
    [filterType, filterStatus],
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize: rowsPerPage,
      total: filteredReports.length,
      onPageChange: handleChangePage,
      onPageSizeChange: handleChangeRowsPerPage,
    }),
    [page, rowsPerPage, filteredReports.length],
  );

  return (
    <ListPageTemplate<Report>
      title="报表管理"
      subtitle="创建、管理和生成业务报表"
      columns={columns}
      data={filteredReports}
      loading={loading}
      searchable
      searchPlaceholder="搜索报表名称或创建人..."
      searchValue={searchTerm}
      onSearch={(value) => setSearchTerm(value)}
      filters={filters}
      pagination={pagination}
      rowActions={rowActions}
      actions={[
        {
          label: "返回数据大屏",
          variant: "outlined",
          onClick: () => logger.info("Back to dashboard"),
        },
        {
          label: "新建报表",
          icon: <Plus size={16} />,
          variant: "contained",
          onClick: () => logger.info("Create report"),
        },
      ]}
    />
  );
};

export default BIReportPage;
