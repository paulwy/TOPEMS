import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
} from "lucide-react";
import { Box, Chip, IconButton, Tooltip } from "@mui/material";
import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { PageHeader } from "../components/templates/PageHeader";
import { FilterBar, FilterConfig } from "../components/mui/FilterBar";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error";
  host: string;
  database: string;
  last_sync?: string;
  dataVolume?: number;
}

const mockDataSources: DataSource[] = [
  { id: "1", name: "研发数据库", type: "postgresql", status: "active", host: "localhost:5432", database: "topems_rs", last_sync: new Date().toISOString(), dataVolume: 1250000 },
  { id: "2", name: "实验室数据库", type: "postgresql", status: "active", host: "localhost:5432", database: "topems_lims", last_sync: new Date().toISOString(), dataVolume: 850000 },
  { id: "3", name: "质量数据库", type: "postgresql", status: "active", host: "localhost:5432", database: "topems_qms", last_sync: new Date().toISOString(), dataVolume: 620000 },
  { id: "4", name: "生产数据库", type: "postgresql", status: "inactive", host: "localhost:5432", database: "topems_pdm", dataVolume: 2100000 },
  { id: "5", name: "缓存服务", type: "redis", status: "active", host: "localhost:6379", database: "default", last_sync: new Date().toISOString(), dataVolume: 15000 },
  { id: "6", name: "日志存储", type: "elasticsearch", status: "error", host: "localhost:9200", database: "logs", dataVolume: 3500000 },
  { id: "7", name: "ERP系统接口", type: "api", status: "active", host: "erp.company.com", database: "ERP", last_sync: new Date().toISOString(), dataVolume: 450000 },
  { id: "8", name: "财务数据文件", type: "file", status: "active", host: "/data/finance", database: "Excel", last_sync: new Date().toISOString(), dataVolume: 8500 },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":
      return { color: "success" as const, icon: <CheckCircle size={14} />, label: "已连接" };
    case "inactive":
      return { color: "default" as const, icon: <Clock size={14} />, label: "未激活" };
    case "error":
      return { color: "error" as const, icon: <XCircle size={14} />, label: "异常" };
    default:
      return { color: "default" as const, icon: <Clock size={14} />, label: status };
  }
};

const getTypeConfig = (type: string) => {
  switch (type) {
    case "postgresql": return { icon: "🐘", label: "PostgreSQL" };
    case "mysql": return { icon: "🐬", label: "MySQL" };
    case "mongodb": return { icon: "🍃", label: "MongoDB" };
    case "redis": return { icon: "🔴", label: "Redis" };
    case "elasticsearch": return { icon: "🔍", label: "Elasticsearch" };
    case "api": return { icon: "🌐", label: "API" };
    case "file": return { icon: "📁", label: "文件" };
    default: return { icon: "💾", label: type };
  }
};

const themeColor = "#f59e0b";

const BIDataSourcePageRefactored = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DataSource[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setData(mockDataSources);
      setLoading(false);
    }, 500);
  }, []);

  const filters: FilterConfig[] = [
    {
      id: "type",
      label: "数据源类型",
      type: "select",
      value: filterType,
      options: [
        { label: "PostgreSQL", value: "postgresql" },
        { label: "MySQL", value: "mysql" },
        { label: "MongoDB", value: "mongodb" },
        { label: "Redis", value: "redis" },
        { label: "Elasticsearch", value: "elasticsearch" },
        { label: "API", value: "api" },
        { label: "文件", value: "file" },
      ],
      onChange: (value) => setFilterType(value),
    },
    {
      id: "status",
      label: "连接状态",
      type: "select",
      value: filterStatus,
      options: [
        { label: "已连接", value: "active" },
        { label: "未激活", value: "inactive" },
        { label: "异常", value: "error" },
      ],
      onChange: (value) => setFilterStatus(value),
    },
  ];

  const columns = [
    {
      id: "name",
      label: "数据源名称",
      sortable: true,
      render: (row: DataSource) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Database size={18} color="#64748b" />
          <Box>
            <Box sx={{ fontWeight: 500 }}>{row.name}</Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: "text.secondary" }}>
              <Server size={12} /> {row.host}
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      id: "type",
      label: "类型",
      sortable: true,
      render: (row: DataSource) => {
        const typeConfig = getTypeConfig(row.type);
        return (
          <Chip
            icon={<Box component="span">{typeConfig.icon}</Box>}
            label={typeConfig.label}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      id: "status",
      label: "连接状态",
      sortable: true,
      render: (row: DataSource) => {
        const statusConfig = getStatusConfig(row.status);
        return (
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            size="small"
            color={statusConfig.color}
          />
        );
      },
    },
    {
      id: "last_sync",
      label: "最后同步时间",
      sortable: true,
      render: (row: DataSource) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
          <Clock size={12} />
          {row.last_sync ? new Date(row.last_sync).toLocaleString("zh-CN") : "未同步"}
        </Box>
      ),
    },
    {
      id: "dataVolume",
      label: "数据量",
      sortable: true,
      render: (row: DataSource) => row.dataVolume ? `${(row.dataVolume / 1000).toFixed(1)}K` : "-",
    },
  ];

  const rowActions = [
    { label: "同步", icon: <RefreshCw size={16} />, onClick: (row: DataSource) => console.log("Sync", row.id) },
    { label: "测试连接", icon: <TestTube size={16} />, onClick: (row: DataSource) => console.log("Test", row.id) },
    { label: "查看", icon: <Eye size={16} />, onClick: (row: DataSource) => console.log("View", row.id) },
    { label: "编辑", icon: <Edit size={16} />, onClick: (row: DataSource) => console.log("Edit", row.id) },
    { label: "删除", icon: <Trash2 size={16} />, onClick: (row: DataSource) => console.log("Delete", row.id), color: "error" as const },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      <PageHeader
        title="数据源管理"
        subtitle="配置和管理BI数据源连接"
        actions={[
          { label: "返回数据大屏", href: "/bi/dashboard", variant: "outlined" },
          { label: "新增数据源", icon: <Plus size={16} />, onClick: () => console.log("Add"), variant: "contained", color: "warning" },
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
        searchPlaceholder="搜索数据源名称..."
        searchValue={searchValue}
        onSearch={setSearchValue}
        filters={filters}
        rowActions={rowActions}
        actions={[
          { label: "导出", icon: <Database size={16} />, onClick: () => console.log("Export"), variant: "outlined" },
        ]}
        emptyMessage="暂无数据源"
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

export default BIDataSourcePageRefactored;
