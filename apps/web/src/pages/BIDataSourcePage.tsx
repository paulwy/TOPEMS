import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Plus,
  Search,
  Filter,
  RefreshCw,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  MoreVertical,
  Server,
  HardDrive,
  Wifi,
  WifiOff,
  Grid3X3,
  List,
  Activity,
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Box,
  Skeleton,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error";
  host: string;
  database: string;
  last_sync?: string;
  sync_frequency?: string;
  tables_count?: number;
}

const DataSourceCard = ({
  datasource,
  onSync,
  onView,
  onEdit,
  onDelete,
}: {
  datasource: DataSource;
  onSync: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "success.light",
          icon: <Wifi size={14} />,
          label: "活跃",
          dotColor: "success.main",
        };
      case "inactive":
        return {
          color: "grey.100",
          icon: <WifiOff size={14} />,
          label: "未激活",
          dotColor: "grey.400",
        };
      case "error":
        return {
          color: "error.light",
          icon: <XCircle size={14} />,
          label: "异常",
          dotColor: "error.main",
        };
      default:
        return {
          color: "grey.100",
          icon: <Activity size={14} />,
          label: status,
          dotColor: "grey.400",
        };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "postgresql":
        return {
          icon: "🐘",
          color: "info.light",
          label: "PostgreSQL",
        };
      case "mysql":
        return {
          icon: "🐬",
          color: "info.light",
          label: "MySQL",
        };
      case "mongodb":
        return {
          icon: "🍃",
          color: "success.light",
          label: "MongoDB",
        };
      case "redis":
        return {
          icon: "🔴",
          color: "error.light",
          label: "Redis",
        };
      case "elasticsearch":
        return {
          icon: "🔍",
          color: "warning.light",
          label: "Elasticsearch",
        };
      default:
        return { icon: "💾", color: "grey.100", label: type };
    }
  };

  const statusConfig = getStatusConfig(datasource.status);
  const typeConfig = getTypeConfig(datasource.type);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ bgcolor: "background.paper", borderRadius: 4, boxShadow: 1, border: 1, borderColor: "grey.200", overflow: "hidden", transition: "all 0.3s", "&:hover": { boxShadow: 6, borderColor: "grey.300" } }}>
      {/* Header */}
      <Box sx={{ position: "relative", px: 2.5, py: 2, bgcolor: "grey.50", borderBottom: 1, borderColor: "grey.100" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1.25, borderRadius: 1.25, border: 1, borderColor: "divider", bgcolor: typeConfig.color }}>
              <Typography component="span" sx={{ fontSize: "1.25rem", lineHeight: 1 }}>{typeConfig.icon}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "grey.900" }}>
                {datasource.name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: statusConfig.dotColor,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <Typography component="span" sx={{ fontSize: "0.75rem", color: "grey.500" }}>
                  {typeConfig.label}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              fontSize: "0.75rem",
              fontWeight: 500,
              borderRadius: 4,
              border: 1,
              borderColor: "divider",
              bgcolor: statusConfig.color,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5 }}>
        {/* Connection Info */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: "0.875rem" }}>
            <Server size={16} color="#94a3b8" />
            <Typography component="span" sx={{ color: "grey.500" }}>主机:</Typography>
            <Typography component="span" sx={{ fontWeight: 500, color: "grey.700" }}>
              {datasource.host}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: "0.875rem" }}>
            <HardDrive size={16} color="#94a3b8" />
            <Typography component="span" sx={{ color: "grey.500" }}>数据库:</Typography>
            <Typography component="span" sx={{ fontWeight: 500, color: "grey.700" }}>
              {datasource.database}
            </Typography>
          </Box>
          {datasource.tables_count && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: "0.875rem" }}>
              <Database size={16} color="#94a3b8" />
              <Typography component="span" sx={{ color: "grey.500" }}>表数量:</Typography>
              <Typography component="span" sx={{ fontWeight: 500, color: "grey.700" }}>
                {datasource.tables_count}
              </Typography>
            </Box>
          )}
          {datasource.last_sync && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: "0.875rem" }}>
              <Clock size={16} color="#94a3b8" />
              <Typography component="span" sx={{ color: "grey.500" }}>最后同步:</Typography>
              <Typography component="span" sx={{ fontWeight: 500, color: "grey.700", fontSize: "0.75rem" }}>
                {new Date(datasource.last_sync).toLocaleString("zh-CN")}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={onSync}
            sx={{ flex: 1 }}
          >
            <RefreshCw size={14} sx={{ mr: 1 }} />
            同步
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={onView}
            sx={{ flex: 1 }}
          >
            <Eye size={14} sx={{ mr: 1 }} />
            查看
          </Button>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertical size={16} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => { onEdit(); handleMenuClose(); }}>
              <Edit size={16} sx={{ mr: 2 }} />
              编辑
            </MenuItem>
            <MenuItem onClick={() => { onDelete(); handleMenuClose(); }} sx={{ color: "error.main" }}>
              <Trash2 size={16} sx={{ mr: 2 }} />
              删除
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

const DataSourceCardSkeleton = () => (
  <Box sx={{ bgcolor: "background.paper", borderRadius: 4, boxShadow: 1, border: 1, borderColor: "grey.200", overflow: "hidden" }}>
    <Box sx={{ px: 2.5, py: 2, bgcolor: "grey.50", borderBottom: 1, borderColor: "grey.100" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Skeleton variant="rounded" width={40} height={40} />
          <Box>
            <Skeleton variant="text" width={96} height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width={64} height={12} />
          </Box>
        </Box>
        <Skeleton variant="rounded" width={64} height={24} />
      </Box>
    </Box>
    <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width={48} height={16} />
            <Skeleton variant="text" width={80} height={16} />
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={36} height={36} />
      </Box>
    </Box>
  </Box>
);

const BIDataSourcePage = () => {
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
          tables_count: 45,
        },
        {
          id: "2",
          name: "实验室数据库",
          type: "postgresql",
          status: "active",
          host: "localhost:5432",
          database: "topems_lims",
          last_sync: new Date().toISOString(),
          tables_count: 38,
        },
        {
          id: "3",
          name: "质量数据库",
          type: "postgresql",
          status: "active",
          host: "localhost:5432",
          database: "topems_qms",
          last_sync: new Date().toISOString(),
          tables_count: 52,
        },
        {
          id: "4",
          name: "生产数据库",
          type: "postgresql",
          status: "inactive",
          host: "localhost:5432",
          database: "topems_pdm",
          tables_count: 28,
        },
        {
          id: "5",
          name: "缓存服务",
          type: "redis",
          status: "active",
          host: "localhost:6379",
          database: "default",
          last_sync: new Date().toISOString(),
        },
        {
          id: "6",
          name: "日志存储",
          type: "elasticsearch",
          status: "error",
          host: "localhost:9200",
          database: "logs",
        },
      ]);
    } catch (error) {
      console.error("Failed to load datasources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasources = datasources.filter((ds) => {
    const matchesSearch = ds.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || ds.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "全部状态" },
    { value: "active", label: "活跃" },
    { value: "inactive", label: "未激活" },
    { value: "error", label: "异常" },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Header skeleton */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Skeleton variant="text" width={128} height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={96} height={16} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="rounded" width={96} height={40} />
            <Skeleton variant="rounded" width={112} height={40} />
          </Box>
        </Box>

        {/* Filter skeleton */}
        <Skeleton variant="rounded" width="100%" height={56} />

        {/* Cards skeleton */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <DataSourceCardSkeleton key={i} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: "1.5rem", color: "grey.900" }}>数据源管理</Typography>
          <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>配置和管理BI数据源连接</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Link to="/bi/dashboard">
            <Button variant="outlined">返回数据大屏</Button>
          </Link>
          <Button variant="contained">
            <Plus size={16} sx={{ mr: 2 }} />
            添加数据源
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              placeholder="搜索数据源名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              size="small"
              InputProps={{
                startAdornment: <Search size={16} color="#94a3b8" sx={{ mr: 1 }} />,
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Filter size={16} color="#94a3b8" />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={filterStatus}
                  label="状态"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", bgcolor: "grey.100", borderRadius: 1, p: 0.5 }}>
              <Button
                onClick={() => setViewMode("grid")}
                size="small"
                sx={{
                  p: 0.75,
                  borderRadius: 0.5,
                  bgcolor: viewMode === "grid" ? "background.paper" : "transparent",
                  boxShadow: viewMode === "grid" ? 1 : 0,
                  color: viewMode === "grid" ? "primary.main" : "grey.500",
                  minWidth: "auto",
                }}
              >
                <Grid3X3 size={16} />
              </Button>
              <Button
                onClick={() => setViewMode("list")}
                size="small"
                sx={{
                  p: 0.75,
                  borderRadius: 0.5,
                  bgcolor: viewMode === "list" ? "background.paper" : "transparent",
                  boxShadow: viewMode === "list" ? 1 : 0,
                  color: viewMode === "list" ? "primary.main" : "grey.500",
                  minWidth: "auto",
                }}
              >
                <List size={16} />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredDatasources.length === 0 ? (
        <EmptyState
          icon="folder"
          title="暂无数据源"
          description="还没有配置任何数据源，点击下方按钮添加第一个数据源"
          action={{
            label: "添加数据源",
            onClick: () => console.log("Add datasource"),
          }}
        />
      ) : (
        <Box
          sx={
            viewMode === "grid"
              ? { display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }
              : { display: "flex", flexDirection: "column", gap: 2 }
          }
        >
          {filteredDatasources.map((ds) => (
            <DataSourceCard
              key={ds.id}
              datasource={ds}
              onSync={() => console.log("Sync:", ds.id)}
              onView={() => console.log("View:", ds.id)}
              onEdit={() => console.log("Edit:", ds.id)}
              onDelete={() => console.log("Delete:", ds.id)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default BIDataSourcePage;