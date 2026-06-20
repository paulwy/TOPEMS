import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  FileText,
  Calendar,
  User,
  Clock,
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
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.creator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || report.type === filterType;
    const matchesStatus =
      filterStatus === "all" || report.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
              报表管理
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
              创建、管理和生成业务报表
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Link to="/bi/dashboard">
              <Button variant="outlined">返回数据大屏</Button>
            </Link>
            <Button variant="contained">
              <Plus size={16} sx={{ mr: 1 }} />
              新建报表
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TextField
                placeholder="搜索报表名称或创建人..."
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
                  <InputLabel>报表类型</InputLabel>
                  <Select
                    value={filterType}
                    label="报表类型"
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <MenuItem value="all">全部类型</MenuItem>
                    <MenuItem value="daily">日报</MenuItem>
                    <MenuItem value="weekly">周报</MenuItem>
                    <MenuItem value="monthly">月报</MenuItem>
                    <MenuItem value="quarterly">季报</MenuItem>
                    <MenuItem value="annual">年报</MenuItem>
                    <MenuItem value="custom">自定义</MenuItem>
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
                    <MenuItem value="active">启用</MenuItem>
                    <MenuItem value="draft">草稿</MenuItem>
                    <MenuItem value="archived">归档</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {filteredReports.length === 0 ? (
          <EmptyState
            icon="file"
            title="暂无报表数据"
            description="还没有创建任何报表，点击下方按钮创建第一个报表"
            action={{
              label: "创建报表",
              onClick: () => logger.info("Create report"),
            }}
          />
        ) : (
          <Card>
            <Box sx={{ overflow: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>报表名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>创建人</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((report) => {
                      const typeConfig = getTypeConfig(report.type);
                      const statusConfig = getStatusConfig(report.status);
                      return (
                        <TableRow key={report.id} hover>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <FileText size={18} color="#64748b" />
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500 }}
                                >
                                  {report.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {report.description || "暂无描述"}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={typeConfig.label}
                              size="small"
                              color={typeConfig.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <User size={14} color="#64748b" />
                              <Typography variant="body2">
                                {report.creator}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Calendar size={14} color="#64748b" />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {new Date(report.created_at).toLocaleDateString(
                                  "zh-CN",
                                )}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusConfig.label}
                              size="small"
                              color={statusConfig.color}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              <Tooltip title="预览">
                                <IconButton size="small">
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="下载">
                                <IconButton size="small">
                                  <Download size={16} />
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
              count={filteredReports.length}
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

export default BIReportPage;
