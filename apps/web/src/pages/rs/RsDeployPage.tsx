import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Search,
  Rocket,
  RotateCcw,
  Eye,
  Play,
  Filter,
  Server,
} from "lucide-react";

interface Deploy {
  id: string;
  deploy_no: string;
  environment: string;
  app_name: string;
  version: string;
  status: string;
  deploy_time: string;
  operator: string;
}

const RsDeployPage: React.FC = () => {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [envFilter, setEnvFilter] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<Deploy | null>(null);

  useEffect(() => {
    const mockDeploys: Deploy[] = [
      {
        id: "1",
        deploy_no: "DEPLOY-20240615-001",
        environment: "production",
        app_name: "frontend-app",
        version: "v2.3.1",
        status: "success",
        deploy_time: "2024-06-15 14:30:00",
        operator: "张三",
      },
      {
        id: "2",
        deploy_no: "DEPLOY-20240615-002",
        environment: "staging",
        app_name: "backend-api",
        version: "v1.5.0",
        status: "running",
        deploy_time: "2024-06-15 14:25:00",
        operator: "李四",
      },
      {
        id: "3",
        deploy_no: "DEPLOY-20240614-003",
        environment: "production",
        app_name: "mobile-app",
        version: "v3.0.0",
        status: "failed",
        deploy_time: "2024-06-14 16:20:00",
        operator: "王五",
      },
      {
        id: "4",
        deploy_no: "DEPLOY-20240614-002",
        environment: "development",
        app_name: "data-service",
        version: "v0.9.5",
        status: "success",
        deploy_time: "2024-06-14 10:15:00",
        operator: "赵六",
      },
      {
        id: "5",
        deploy_no: "DEPLOY-20240614-001",
        environment: "staging",
        app_name: "shared-utils",
        version: "v1.2.0",
        status: "success",
        deploy_time: "2024-06-14 02:00:00",
        operator: "孙七",
      },
    ];
    setDeploys(mockDeploys);
    setLoading(false);
  }, []);

  const getEnvColor = (env: string): "error" | "warning" | "success" | "default" => {
    switch (env) {
      case "production":
        return "error";
      case "staging":
        return "warning";
      case "development":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "primary" | "default" => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "running":
        return "primary";
      default:
        return "default";
    }
  };

  const getEnvLabel = (env: string): string => {
    switch (env) {
      case "production":
        return "生产环境";
      case "staging":
        return "预发布环境";
      case "development":
        return "开发环境";
      default:
        return env;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "success":
        return "成功";
      case "failed":
        return "失败";
      case "running":
        return "部署中";
      case "pending":
        return "等待中";
      default:
        return status;
    }
  };

  const filteredDeploys = deploys.filter((deploy) => {
    const matchesSearch =
      deploy.deploy_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deploy.app_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnv = !envFilter || deploy.environment === envFilter;
    const matchesApp = !appFilter || deploy.app_name === appFilter;
    const matchesStatus = !statusFilter || deploy.status === statusFilter;
    return matchesSearch && matchesEnv && matchesApp && matchesStatus;
  });

  const uniqueApps = [...new Set(deploys.map((d) => d.app_name))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (deploy: Deploy) => {
    setSelectedDeploy(deploy);
    setDetailDialogOpen(true);
  };

  const handleRollback = (deployId: string) => {
    const deploy = deploys.find((d) => d.id === deployId);
    if (deploy) {
      const rollbackDeploy: Deploy = {
        id: String(Date.now()),
        deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(deploys.length + 1).padStart(3, "0")}`,
        environment: deploy.environment,
        app_name: deploy.app_name,
        version: "上一版本",
        status: "running",
        deploy_time: new Date().toLocaleString(),
        operator: "当前用户",
      };
      setDeploys([rollbackDeploy, ...deploys]);
    }
  };

  const handleNewDeploy = () => {
    const newDeploy: Deploy = {
      id: String(Date.now()),
      deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(deploys.length + 1).padStart(3, "0")}`,
      environment: "staging",
      app_name: "new-app",
      version: "v1.0.0",
      status: "running",
      deploy_time: new Date().toLocaleString(),
      operator: "当前用户",
    };
    setDeploys([newDeploy, ...deploys]);
  };

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#3b82f6" }}>
            部署管理
          </Typography>
          <Button variant="contained" startIcon={<Play size={18} />} sx={{ bgcolor: "#3b82f6" }} onClick={handleNewDeploy}>
            发起部署
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="搜索部署编号、应用..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>环境</InputLabel>
              <Select
                value={envFilter || ""}
                label="环境"
                onChange={(e) => setEnvFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="production">生产环境</MenuItem>
                <MenuItem value="staging">预发布环境</MenuItem>
                <MenuItem value="development">开发环境</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>应用</InputLabel>
              <Select
                value={appFilter || ""}
                label="应用"
                onChange={(e) => setAppFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                {uniqueApps.map((app) => (
                  <MenuItem key={app} value={app}>
                    {app}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="success">成功</MenuItem>
                <MenuItem value="failed">失败</MenuItem>
                <MenuItem value="running">部署中</MenuItem>
                <MenuItem value="pending">等待中</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>部署编号</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>环境</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>应用名称</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>版本</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>状态</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>部署时间</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>操作人</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDeploys
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((deploy) => (
                    <TableRow key={deploy.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Rocket size={16} color="#3b82f6" />
                          {deploy.deploy_no}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={getEnvLabel(deploy.environment)} size="small" color={getEnvColor(deploy.environment)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Server size={14} />
                          {deploy.app_name}
                        </Box>
                      </TableCell>
                      <TableCell>{deploy.version}</TableCell>
                      <TableCell>
                        <Chip label={getStatusLabel(deploy.status)} size="small" color={getStatusColor(deploy.status)} />
                      </TableCell>
                      <TableCell>{deploy.deploy_time}</TableCell>
                      <TableCell>{deploy.operator}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看详情">
                            <IconButton size="small" onClick={() => handleViewDetail(deploy)}>
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="回滚">
                            <IconButton size="small" onClick={() => handleRollback(deploy.id)}>
                              <RotateCcw size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredDeploys.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>部署详情</DialogTitle>
        <DialogContent>
          {selectedDeploy && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedDeploy.deploy_no}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip label={getEnvLabel(selectedDeploy.environment)} color={getEnvColor(selectedDeploy.environment)} />
                <Chip label={getStatusLabel(selectedDeploy.status)} color={getStatusColor(selectedDeploy.status)} />
              </Stack>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    应用名称
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.app_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    版本
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.version}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    操作人
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.operator}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsDeployPage;
