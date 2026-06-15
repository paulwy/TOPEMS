import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { Box, Chip } from "@mui/material";
import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { PageHeader } from "../components/templates/PageHeader";
import { FilterBar, FilterConfig } from "../components/mui/FilterBar";

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

const mockReports: Report[] = [
  { id: "1", name: "每日生产报表", type: "daily", creator: "张三", created_at: "2024-01-15T08:00:00Z", updated_at: "2024-06-10T10:30:00Z", status: "active", description: "每日生产数据汇总报表" },
  { id: "2", name: "每周质量分析", type: "weekly", creator: "李四", created_at: "2024-02-20T09:00:00Z", updated_at: "2024-06-09T14:20:00Z", status: "active", description: "每周质量检验数据分析" },
  { id: "3", name: "月度销售报告", type: "monthly", creator: "王五", created_at: "2024-03-10T10:00:00Z", updated_at: "2024-06-01T08:45:00Z", status: "active", description: "月度销售业绩汇总" },
  { id: "4", name: "季度研发进度", type: "quarterly", creator: "赵六", created_at: "2024-01-05T11:00:00Z", updated_at: "2024-04-05T16:00:00Z", status: "archived", description: "研发项目季度进度报告" },
  { id: "5", name: "年度财务总结", type: "annual", creator: "孙七", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-02-28T20:00:00Z", status: "archived", description: "年度财务数据汇总分析" },
  { id: "6", name: "设备维护报告", type: "custom", creator: "周八", created_at: "2024-04-12T13:00:00Z", updated_at: "2024-06-08T09:15:00Z", status: "draft", description: "设备维护保养记录统计" },
  { id: "7", name: "库存预警报表", type: "daily", creator: "吴九", created_at: "2024-05-01T08:00:00Z", updated_at: "2024-06-10T11:30:00Z", status: "active", description: "库存低于安全库存预警" },
  { id: "8", name: "人员绩效分析", type: "monthly", creator: "郑十", created_at: "2024-03-20T14:00:00Z", updated_at: "2024-06-05T15:45:00Z", status: "active", description: "员工工作绩效月度统计" },
];

const getTypeConfig = (type: string) => {
  switch (type) {
    case "daily": return { color: "info" as const, label: "日报" };
    case "weekly": return { color: "success" as const, label: "周报" };
    case "monthly": return { color: "warning" as const, label: "月报" };
    case "quarterly": return { color: "secondary" as const, label: "季报" };
    case "annual": return { color: "primary" as const, label: "年报" };
    case "custom": return { color: "default" as const, label: "自定义" };
    default: return { color: "default" as const, label: type };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active": return { color: "success" as const, label: "启用" };
    case "draft": return { color: "warning" as const, label: "草稿" };
    case "archived": return { color: "default" as const, label: "归档" };
    default: return { color: "default" as const, label: status };
  }
};

const themeColor = "#f59e0b";

const BIReportPageRefactored = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Report[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setData(mockReports);
      setLoading(false);
    }, 500);
  }, []);

  const filters: FilterConfig[] = [
    {
      id: "type",
      label: "报表类型",
      type: "select",
      value: filterType,
      options: [
        { label: "日报", value: "daily" },
        { label: "周报", value: "weekly" },
        { label: "月报", value: "monthly" },
        { label: "季报", value: "quarterly" },
        { label: "年报", value: "annual" },
        { label: "自定义", value: "custom" },
      ],
      onChange: (value) => setFilterType(value),
    },
    {
      id: "status",
      label: "状态",
      type: "select",
      value: filterStatus,
      options: [
        { label: "启用", value: "active" },
        { label: "草稿", value: "draft" },
        { label: "归档", value: "archived" },
      ],
      onChange: (value) => setFilterStatus(value),
    },
  ];

  const columns = [
    {
      id: "name",
      label: "报表名称",
      sortable: true,
      render: (row: Report) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FileText size={18} color="#64748b" />
          <Box>
            <Box sx={{ fontWeight: 500 }}>{row.name}</Box>
            <Box sx={{ fontSize: 12, color: "text.secondary" }}>{row.description || "暂无描述"}</Box>
          </Box>
        </Box>
      ),
    },
    {
      id: "type",
      label: "类型",
      sortable: true,
      render: (row: Report) => {
        const typeConfig = getTypeConfig(row.type);
        return <Chip label={typeConfig.label} size="small" color={typeConfig.color} variant="outlined" />;
      },
    },
    {
      id: "creator",
      label: "创建人",
      sortable: true,
      render: (row: Report) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <User size={14} color="#64748b" />
          <Box component="span">{row.creator}</Box>
        </Box>
      ),
    },
    {
      id: "created_at",
      label: "创建时间",
      sortable: true,
      render: (row: Report) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
          <Calendar size={14} />
          {new Date(row.created_at).toLocaleDateString("zh-CN")}
        </Box>
      ),
    },
    {
      id: "status",
      label: "状态",
      sortable: true,
      render: (row: Report) => {
        const statusConfig = getStatusConfig(row.status);
        return <Chip label={statusConfig.label} size="small" color={statusConfig.color} />;
      },
    },
  ];

  const rowActions = [
    { label: "预览", icon: <Eye size={16} />, onClick: (row: Report) => console.log("Preview", row.id) },
    { label: "下载", icon: <Download size={16} />, onClick: (row: Report) => console.log("Download", row.id) },
    { label: "编辑", icon: <Edit size={16} />, onClick: (row: Report) => console.log("Edit", row.id) },
    { label: "删除", icon: <Trash2 size={16} />, onClick: (row: Report) => console.log("Delete", row.id), color: "error" as const },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      <PageHeader
        title="报表管理"
        subtitle="创建、管理和生成业务报表"
        actions={[
          { label: "返回数据大屏", href: "/bi/dashboard", variant: "outlined" },
          { label: "新建报表", icon: <Plus size={16} />, onClick: () => console.log("Create"), variant: "contained", color: "warning" },
        ]}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 500);
        }}
      />

      <FilterBar filters={filters} />

      <ListPageTemplate
        title=""
        columns={columns}
        data={data}
        loading={loading}
        searchable
        searchPlaceholder="搜索报表名称或创建人..."
        searchValue={searchValue}
        onSearch={setSearchValue}
        filters={filters}
        rowActions={rowActions}
        actions={[
          { label: "导出", icon: <Download size={16} />, onClick: () => console.log("Export"), variant: "outlined" },
        ]}
        emptyMessage="暂无报表数据"
        pagination={{
          page: 0,
          pageSize: 10,
          total: data.length,
          onPageChange: () => {},
          onPageSizeChange: () => {},
        }}
      />
    </Box>
  );
};

export default BIReportPageRefactored;
