import { useState, useEffect, useMemo } from "react";
import { logger } from "@/utils/logger";
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
} from "lucide-react";
import {
  Button,
  Chip,
  Box,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";

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

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":
      return {
        color: "success" as const,
        icon: <CheckCircle size={14} />,
        label: "已连接",
      };
    case "inactive":
      return {
        color: "default" as const,
        icon: <Clock size={14} />,
        label: "未激活",
      };
    case "error":
      return {
        color: "error" as const,
        icon: <XCircle size={14} />,
        label: "异常",
      };
    default:
      return {
        color: "default" as const,
        icon: <Clock size={14} />,
        label: status,
      };
  }
};

const getTypeConfig = (type: string) => {
  switch (type) {
    case "postgresql":
      return { icon: "🐘", label: "PostgreSQL" };
    case "mysql":
      return { icon: "🐬", label: "MySQL" };
    case "mongodb":
      return { icon: "🍃", label: "MongoDB" };
    case "redis":
      return { icon: "🔴", label: "Redis" };
    case "elasticsearch":
      return { icon: "🔍", label: "Elasticsearch" };
    case "api":
      return { icon: "🌐", label: "API" };
    case "file":
      return { icon: "📁", label: "文件" };
    default:
      return { icon: "💾", label: type };
  }
};

const BIDataSourcePage = () => {
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadDatasources();
  }, []);

  const loadDatasources = async () => {
    setLoading(true);
    try {
      setDatasources([
        {
          id: "1",
          name: "研发数据库",
          type: "postgresql",
          status: "active",
          host: "localhost:5432",
          database: "topems_rs",
          last_sync: new Date().toISOString(),
          dataVolume: 1250000,
        },
        {
          id: "2",
          name: "实验室数据库",
          type: "postgresql",
          status: "active",
          host: "localhost:5432",
          database: "topems_lims",
          last_sync: new Date().toISOString(),
          dataVolume: 850000,
        },
        {
          id: "3",
          name: "质量数据库",
          type: "postgresql",
          status: "active",
          host: "localhost:5432",
          database: "topems_qms",
          last_sync: new Date().toISOString(),
          dataVolume: 620000,
        },
        {
          id: "4",
          name: "生产数据库",
          type: "postgresql",
          status: "inactive",
          host: "localhost:5432",
          database: "topems_pdm",
          dataVolume: 2100000,
        },
        {
          id: "5",
          name: "缓存服务",
          type: "redis",
          status: "active",
          host: "localhost:6379",
          database: "default",
          last_sync: new Date().toISOString(),
          dataVolume: 15000,
        },
        {
          id: "6",
          name: "日志存储",
          type: "elasticsearch",
          status: "error",
          host: "localhost:9200",
          database: "logs",
          dataVolume: 3500000,
        },
        {
          id: "7",
          name: "ERP系统接口",
          type: "api",
          status: "active",
          host: "erp.company.com",
          database: "ERP",
          last_sync: new Date().toISOString(),
          dataVolume: 450000,
        },
        {
          id: "8",
          name: "财务数据文件",
          type: "file",
          status: "active",
          host: "/data/finance",
          database: "Excel",
          last_sync: new Date().toISOString(),
          dataVolume: 8500,
        },
      ]);
    } catch (error) {
      logger.error("Failed to load datasources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasources = useMemo(() => {
    return datasources.filter((ds) => {
      const matchesSearch =
        ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.database.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || ds.type === filterType;
      const matchesStatus = !filterStatus || ds.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [datasources, searchTerm, filterType, filterStatus]);

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSync = (ds: DataSource) => {
    logger.info("Sync:", ds.id);
  };

  const handleTestConnection = (ds: DataSource) => {
    logger.info("Test connection:", ds.id);
  };

  const columns = useMemo<ColumnDef<DataSource>[]>(
    () => [
      {
        id: "name",
        label: "数据源名称",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Database size={18} color="#64748b" />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <Server size={12} /> {row.host}
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
              icon={<Typography component="span">{typeConfig.icon}</Typography>}
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
        render: (row) => {
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
        render: (row) =>
          row.last_sync ? (
            <Typography variant="body2" color="text.secondary">
              <Clock size={12} />{" "}
              {new Date(row.last_sync).toLocaleString("zh-CN")}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              未同步
            </Typography>
          ),
      },
      {
        id: "dataVolume",
        label: "数据量",
        render: (row) => (
          <Typography variant="body2">
            {row.dataVolume ? `${(row.dataVolume / 1000).toFixed(1)}K` : "-"}
          </Typography>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<DataSource>[]>(
    () => [
      {
        label: "同步",
        icon: <RefreshCw size={16} />,
        onClick: (row) => handleSync(row),
      },
      {
        label: "测试连接",
        icon: <TestTube size={16} />,
        onClick: (row) => handleTestConnection(row),
      },
      {
        label: "查看",
        icon: <Eye size={16} />,
        onClick: (row) => logger.info("View:", row.id),
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
        confirmMessage: "确定要删除这个数据源吗?",
      },
    ],
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: "type",
        label: "数据源类型",
        type: "select",
        options: [
          { value: "", label: "全部类型" },
          { value: "postgresql", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
          { value: "mongodb", label: "MongoDB" },
          { value: "redis", label: "Redis" },
          { value: "elasticsearch", label: "Elasticsearch" },
          { value: "api", label: "API" },
          { value: "file", label: "文件" },
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
          { value: "active", label: "已连接" },
          { value: "inactive", label: "未激活" },
          { value: "error", label: "异常" },
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
      total: filteredDatasources.length,
      onPageChange: handleChangePage,
      onPageSizeChange: handleChangeRowsPerPage,
    }),
    [page, rowsPerPage, filteredDatasources.length],
  );

  return (
    <ListPageTemplate<DataSource>
      title="数据源管理"
      subtitle="配置和管理BI数据源连接"
      columns={columns}
      data={filteredDatasources}
      loading={loading}
      searchable
      searchPlaceholder="搜索数据源名称..."
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
          label: "新增数据源",
          icon: <Plus size={16} />,
          variant: "contained",
          onClick: () => logger.info("Add datasource"),
        },
      ]}
    />
  );
};

export default BIDataSourcePage;
