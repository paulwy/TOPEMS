import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Search,
  Filter,
} from "lucide-react";
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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Chip,
  Tooltip,
} from "@mui/material";
import { EmptyState } from "@/components/EmptyState";

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
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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
      console.error("Failed to load datasources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasources = datasources.filter((ds) => {
    const matchesSearch =
      ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.database.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || ds.type === filterType;
    const matchesStatus = filterStatus === "all" || ds.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSync = (ds: DataSource) => {
    console.log("Sync:", ds.id);
  };

  const handleTestConnection = (ds: DataSource) => {
    console.log("Test connection:", ds.id);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.50",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Skeleton variant="text" width={128} height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={96} height={16} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="rounded" width={96} height={40} />
            <Skeleton variant="rounded" width={112} height={40} />
          </Box>
        </Box>
        <Skeleton variant="rounded" width="100%" height={80} />
        <Skeleton variant="rounded" width="100%" height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "grey.900" }}
            >
              数据源管理
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
              配置和管理BI数据源连接
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Link to="/bi/dashboard">
              <Button variant="outlined">返回数据大屏</Button>
            </Link>
            <Button variant="contained">
              <Plus size={16} sx={{ mr: 1 }} />
              新增数据源
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TextField
                placeholder="搜索数据源名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search size={16} color="#94a3b8" sx={{ mr: 1 }} />
                    ),
                  },
                }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Filter size={16} color="#94a3b8" />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>数据源类型</InputLabel>
                  <Select
                    value={filterType}
                    label="数据源类型"
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <MenuItem value="all">全部类型</MenuItem>
                    <MenuItem value="postgresql">PostgreSQL</MenuItem>
                    <MenuItem value="mysql">MySQL</MenuItem>
                    <MenuItem value="mongodb">MongoDB</MenuItem>
                    <MenuItem value="redis">Redis</MenuItem>
                    <MenuItem value="elasticsearch">Elasticsearch</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="file">文件</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={filterStatus}
                    label="状态"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="active">已连接</MenuItem>
                    <MenuItem value="inactive">未激活</MenuItem>
                    <MenuItem value="error">异常</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

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
          <Card>
            <Box sx={{ overflow: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>数据源名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>连接状态</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>最后同步时间</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>数据量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDatasources
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((ds) => {
                      const statusConfig = getStatusConfig(ds.status);
                      const typeConfig = getTypeConfig(ds.type);
                      return (
                        <TableRow key={ds.id} hover>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Database size={18} color="#64748b" />
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500 }}
                                >
                                  {ds.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  <Server size={12} /> {ds.host}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={
                                <Typography component="span">
                                  {typeConfig.icon}
                                </Typography>
                              }
                              label={typeConfig.label}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={statusConfig.icon}
                              label={statusConfig.label}
                              size="small"
                              color={statusConfig.color}
                            />
                          </TableCell>
                          <TableCell>
                            {ds.last_sync ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <Clock size={12} />{" "}
                                {new Date(ds.last_sync).toLocaleString("zh-CN")}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                未同步
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ds.dataVolume
                                ? `${(ds.dataVolume / 1000).toFixed(1)}K`
                                : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              <Tooltip title="同步">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSync(ds)}
                                >
                                  <RefreshCw size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="测试连接">
                                <IconButton
                                  size="small"
                                  onClick={() => handleTestConnection(ds)}
                                >
                                  <TestTube size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="查看">
                                <IconButton size="small">
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="编辑">
                                <IconButton size="small">
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="删除">
                                <IconButton
                                  size="small"
                                  sx={{ color: "error.main" }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50]}
              component="div"
              count={filteredDatasources.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="每页行数"
            />
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default BIDataSourcePage;
