import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  RefreshCw,
  Play,
  Eye,
  FileSearch,
  RotateCcw,
} from "lucide-react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useToast } from "@/components/notification/ToastProvider";
import {
  migrationApi,
  type MigrationService,
  type MigrationStatus,
} from "@/api/migration";

interface ServiceStatusMap {
  [serviceName: string]: MigrationStatus;
}

const MigrationAdminPage: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<MigrationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingService, setApplyingService] = useState<string | null>(null);
  const [rollingBackService, setRollingBackService] = useState<string | null>(
    null,
  );
  const [batchApplying, setBatchApplying] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<ServiceStatusMap>({});
  const [activeService, setActiveService] = useState<MigrationService | null>(
    null,
  );
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await migrationApi.listServices();
      setServices(data);
      showToast("success", `加载成功，共 ${data.length} 个服务`);

      if (data.length > 0) {
        const results = await Promise.all(
          data.map((svc) =>
            migrationApi.getMigrationStatus(svc.name).catch(() => null),
          ),
        );
        const nextStatusMap: ServiceStatusMap = {};
        data.forEach((svc, idx) => {
          if (results[idx])
            nextStatusMap[svc.name] = results[idx] as MigrationStatus;
        });
        setStatusMap((prev) => ({ ...prev, ...nextStatusMap }));
      }
    } catch (err: any) {
      showToast("error", err.message || "加载服务列表失败");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleApply = async (service: MigrationService) => {
    setApplyingService(service.name);
    try {
      const result = await migrationApi.applyMigration(service.name, "schema");
      showToast(
        "success",
        `${service.name} 迁移执行成功，共 ${result.files.length} 个文件`,
      );
      await fetchStatusFor(service.name, true);
    } catch (err: any) {
      showToast("error", err.message || `${service.name} 迁移执行失败`);
    } finally {
      setApplyingService(null);
    }
  };

  const handleRollback = async (service: MigrationService) => {
    if (
      !window.confirm(`确认回滚 ${service.name} 最近一次迁移？该操作不可恢复。`)
    ) {
      return;
    }
    setRollingBackService(service.name);
    try {
      const result = await migrationApi.rollbackMigration(service.name);
      showToast(
        "success",
        `${service.name} 回滚完成：${result.record ? "已移除记录" : "无记录可回滚"}`,
      );
      await fetchStatusFor(service.name, true);
    } catch (err: any) {
      showToast("error", err.message || `${service.name} 回滚失败`);
    } finally {
      setRollingBackService(null);
    }
  };

  const fetchStatusFor = async (serviceName: string, silent = false) => {
    if (!silent) setStatusLoading(serviceName);
    try {
      const status = await migrationApi.getMigrationStatus(serviceName);
      setStatusMap((prev) => ({ ...prev, [serviceName]: status }));
      return status;
    } catch (err: any) {
      if (!silent) showToast("error", err.message || "获取迁移状态失败");
      return null;
    } finally {
      if (!silent) setStatusLoading(null);
    }
  };

  const handleShowStatus = async (service: MigrationService) => {
    setActiveService(service);
    setStatusDialogOpen(true);
    if (!statusMap[service.name]) {
      await fetchStatusFor(service.name);
    }
  };

  const handleBatchApply = async () => {
    if (services.length === 0) return;
    if (
      !window.confirm(
        `将对全部 ${services.length} 个服务执行 schema 迁移，确认继续？`,
      )
    ) {
      return;
    }
    setBatchApplying(true);
    let succeeded = 0;
    let failed = 0;
    for (const svc of services) {
      try {
        await migrationApi.applyMigration(svc.name, "schema");
        succeeded += 1;
      } catch (err: any) {
        failed += 1;
        showToast(
          "error",
          `${svc.name} 迁移失败：${err.message || "未知错误"}`,
        );
      }
    }
    try {
      const results = await Promise.all(
        services.map((svc) =>
          migrationApi.getMigrationStatus(svc.name).catch(() => null),
        ),
      );
      const nextStatusMap: ServiceStatusMap = {};
      services.forEach((svc, idx) => {
        if (results[idx])
          nextStatusMap[svc.name] = results[idx] as MigrationStatus;
      });
      setStatusMap((prev) => ({ ...prev, ...nextStatusMap }));
    } catch (err) {
      // ignore
    }
    showToast(
      failed === 0 ? "success" : "warning",
      `批量迁移完成：成功 ${succeeded} 个，失败 ${failed} 个`,
    );
    setBatchApplying(false);
  };

  const getPendingCount = (serviceName: string) =>
    statusMap[serviceName]?.pending?.length ?? 0;

  const getAppliedCount = (serviceName: string) =>
    statusMap[serviceName]?.applied?.length ?? 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Paper sx={{ boxShadow: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ maxWidth: "1200px", mx: "auto", px: 4, py: 6 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { sm: "center" },
              justifyContent: { sm: "space-between" },
              gap: 4,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 2 }}>
                <Database
                  sx={{ width: 24, height: 24, color: "primary.main" }}
                />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  数据库迁移管理
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 1 }}
                >
                  查看各服务迁移状态，生成并执行 schema / index / audit 迁移
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={fetchServices}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )
                }
              >
                刷新列表
              </Button>
              <Button
                variant="contained"
                onClick={handleBatchApply}
                disabled={batchApplying || loading || services.length === 0}
                startIcon={
                  batchApplying ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Play size={16} />
                  )
                }
              >
                批量生成全部服务迁移
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: "1200px", mx: "auto", px: 4, py: 6 }}>
        <Paper sx={{ borderRadius: 2 }}>
          {loading ? (
            <Box
              sx={{
                py: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={48} />
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 4 }}
              >
                加载服务列表中...
              </Typography>
            </Box>
          ) : services.length === 0 ? (
            <Box
              sx={{
                py: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              <FileSearch
                sx={{ width: 48, height: 48, color: "text.disabled", mb: 3 }}
              />
              <Typography variant="body1">暂无可管理的迁移服务</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 180, fontWeight: 600 }}>
                      服务名
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Schema</TableCell>
                    <TableCell sx={{ textAlign: "right", fontWeight: 600 }}>
                      端口
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", fontWeight: 600 }}>
                      表数
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>描述</TableCell>
                    <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", fontWeight: 600 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((svc) => {
                    const isApplying = applyingService === svc.name;
                    const isRolling = rollingBackService === svc.name;
                    const isLoadingStatus = statusLoading === svc.name;
                    const pending = getPendingCount(svc.name);
                    const applied = getAppliedCount(svc.name);
                    return (
                      <TableRow key={svc.name}>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {svc.name}
                        </TableCell>
                        <TableCell>{svc.schema}</TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {svc.port}
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {svc.tables}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {svc.description || "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {isLoadingStatus ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                color: "text.secondary",
                              }}
                            >
                              <CircularProgress size={14} />
                              <Typography variant="caption">加载中</Typography>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Chip
                                label={`待执行 ${pending}`}
                                size="small"
                                sx={{
                                  bgcolor: "warning.light",
                                  color: "warning.main",
                                  fontSize: 11,
                                }}
                              />
                              <Chip
                                label={`已执行 ${applied}`}
                                size="small"
                                sx={{
                                  bgcolor: "success.light",
                                  color: "success.main",
                                  fontSize: 11,
                                }}
                              />
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 1,
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleShowStatus(svc)}
                              disabled={isLoadingStatus}
                              startIcon={<Eye size={14} />}
                            >
                              查看状态
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleRollback(svc)}
                              disabled={
                                isRolling ||
                                isApplying ||
                                getAppliedCount(svc.name) === 0
                              }
                              sx={{ color: "warning.main" }}
                              title={
                                getAppliedCount(svc.name) === 0
                                  ? "暂无可回滚记录"
                                  : "回滚最近一次迁移"
                              }
                              startIcon={
                                isRolling ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <RotateCcw size={14} />
                                )
                              }
                            >
                              回滚
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleApply(svc)}
                              disabled={isApplying || isRolling}
                              startIcon={
                                isApplying ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <Play size={14} />
                                )
                              }
                            >
                              生成迁移
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogContent>
          <DialogTitle>
            {activeService ? `${activeService.name} · 迁移状态` : "迁移状态"}
          </DialogTitle>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
            {activeService
              ? `Schema: ${activeService.schema} ｜ 端口: ${activeService.port}`
              : ""}
          </Typography>

          {activeService && statusLoading === activeService.name ? (
            <Box
              sx={{
                py: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 3 }}>
                加载迁移状态中...
              </Typography>
            </Box>
          ) : activeService && statusMap[activeService.name] ? (
            <Box sx={{ spaceY: 6, maxHeight: "60vh", overflowY: "auto" }}>
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "warning.main",
                    }}
                  />
                  待执行迁移 ({statusMap[activeService.name].pending.length})
                </Typography>
                {statusMap[activeService.name].pending.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      暂无待执行的迁移文件
                    </Typography>
                  </Paper>
                ) : (
                  <Paper
                    sx={{
                      p: 3,
                      bgcolor: "grey.50",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {statusMap[activeService.name].pending.map((file) => (
                      <Typography key={file} variant="body2">
                        {file}
                      </Typography>
                    ))}
                  </Paper>
                )}
              </Box>

              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "success.main",
                    }}
                  />
                  已执行迁移 ({statusMap[activeService.name].applied.length})
                </Typography>
                {statusMap[activeService.name].applied.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      暂无已执行记录
                    </Typography>
                  </Paper>
                ) : (
                  <Paper sx={{ overflow: "hidden" }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 120, fontWeight: 600 }}>
                            版本
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                          <TableCell sx={{ width: 180, fontWeight: 600 }}>
                            执行时间
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 100,
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            耗时(ms)
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statusMap[activeService.name].applied.map((m) => (
                          <TableRow key={`${m.version}-${m.name}`}>
                            <TableCell
                              sx={{ fontFamily: "monospace", fontSize: 12 }}
                            >
                              {m.version}
                            </TableCell>
                            <TableCell>{m.name}</TableCell>
                            <TableCell
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              {m.applied_at
                                ? new Date(m.applied_at).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: "right",
                                fontSize: 12,
                                color: "text.secondary",
                              }}
                            >
                              {m.duration_ms ?? "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 10, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">未获取到状态信息</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MigrationAdminPage;
