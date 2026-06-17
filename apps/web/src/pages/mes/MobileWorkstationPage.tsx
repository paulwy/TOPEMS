import { Grid } from "@/components/Grid";
import React, { useState, useEffect } from "react";
import { mobileApi } from "@/api/mobile";
import MobileHeader from "@/components/MobileHeader";
import MobileNav from "@/components/MobileNav";
import {
  MapPin,
  QrCode,
  Image,
  Mic,
  Video,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Box,
  Paper,
  Stack,
  Chip,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";

type TabKey = "home" | "patrol" | "task" | "scan" | "media";

const MobileWorkstationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [stats, setStats] = useState({
    today_patrols: 0,
    today_scans: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
  });
  const [patrols, setPatrols] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsRes = await mobileApi.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      const patrolRes = await mobileApi.listPatrolRecords();
      if (patrolRes.success && patrolRes.data) {
        setPatrols(
          Array.isArray(patrolRes.data)
            ? patrolRes.data
            : patrolRes.data.items || [],
        );
      }

      const taskRes = await mobileApi.listMobileTasks();
      if (taskRes.success && taskRes.data) {
        setTasks(
          Array.isArray(taskRes.data) ? taskRes.data : taskRes.data.items || [],
        );
      }

      const scanRes = await mobileApi.listScanRecords();
      if (scanRes.success && scanRes.data) {
        setScans(
          Array.isArray(scanRes.data) ? scanRes.data : scanRes.data.items || [],
        );
      }

      const photoRes = await mobileApi.listPhotoEvidences();
      if (photoRes.success && photoRes.data) {
        const photos = Array.isArray(photoRes.data)
          ? photoRes.data
          : photoRes.data.items || [];
        setMedia((prev) => [...prev, ...photos]);
      }

      const audioRes = await mobileApi.listAudioRecordings();
      if (audioRes.success && audioRes.data) {
        const audios = Array.isArray(audioRes.data)
          ? audioRes.data
          : audioRes.data.items || [];
        setMedia((prev) => [...prev, ...audios]);
      }

      const videoRes = await mobileApi.listVideoRecordings();
      if (videoRes.success && videoRes.data) {
        const videos = Array.isArray(videoRes.data)
          ? videoRes.data
          : videoRes.data.items || [];
        setMedia((prev) => [...prev, ...videos]);
      }
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatrol = async () => {
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        },
      );

      await mobileApi.createPatrolRecord({
        title: "巡检打卡",
        description: "例行巡检",
        location_lat: position.coords.latitude,
        location_lng: position.coords.longitude,
        patrol_type: "routine",
        checked_by: "current_user",
      });
      alert("打卡成功！");
      loadData();
    } catch (error) {
      console.error("打卡失败:", error);
      alert("打卡失败，请检查位置权限");
    }
  };

  const handleScan = async () => {
    try {
      const code = prompt("请输入扫码内容：");
      if (!code) return;

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        },
      );

      await mobileApi.createScanRecord({
        barcode: code,
        location_lat: position.coords.latitude,
        location_lng: position.coords.longitude,
        item_type: "equipment",
        operator: "current_user",
      });
      alert("扫码成功！");
      loadData();
    } catch (error) {
      console.error("扫码失败:", error);
      alert("扫码失败");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return { bgcolor: "#dcfce7", color: "#15803d" };
      case "in_progress":
        return { bgcolor: "#dbeafe", color: "#1d4ed8" };
      case "pending":
        return { bgcolor: "#fef3c7", color: "#b45309" };
      default:
        return { bgcolor: "#f1f5f9", color: "#475569" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "in_progress":
        return "进行中";
      case "pending":
        return "待处理";
      default:
        return status;
    }
  };

  const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const style = getStatusStyle(status);
    return (
      <Chip
        label={getStatusText(status)}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">加载中...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <MobileHeader title="移动工作台" />

      <Box sx={{ pb: 10 }}>
        {activeTab === "home" && (
          <Box sx={{ p: 2 }}>
            <Paper
              sx={{
                background: "linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)",
                color: "white",
                p: 3,
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Typography variant="h5" fontWeight={700} mb={1}>
                今日工作概览
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(219, 234, 254, 1)", mb: 2 }}
              >
                实时统计
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      borderRadius: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <MapPin size={16} />
                      <Typography variant="body2">巡检</Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.today_patrols}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      borderRadius: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <QrCode size={16} />
                      <Typography variant="body2">扫码</Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.today_scans}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      borderRadius: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <Clock size={16} />
                      <Typography variant="body2">待处理</Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.pending_tasks}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      borderRadius: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <CheckCircle size={16} />
                      <Typography variant="body2">已完成</Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.completed_tasks}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={1.5}>
                快捷操作
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    onClick={handleCreatePatrol}
                    sx={{
                      bgcolor: "#eff6ff",
                      "&:hover": { bgcolor: "#dbeafe" },
                      borderRadius: 1.5,
                      p: 2,
                      flexDirection: "column",
                      gap: 1,
                      textTransform: "none",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#3b82f6",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MapPin color="white" size={24} />
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      巡检打卡
                    </Typography>
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    onClick={handleScan}
                    sx={{
                      bgcolor: "#faf5ff",
                      "&:hover": { bgcolor: "#f3e8ff" },
                      borderRadius: 1.5,
                      p: 2,
                      flexDirection: "column",
                      gap: 1,
                      textTransform: "none",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#a855f7",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <QrCode color="white" size={24} />
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      扫码入库
                    </Typography>
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    onClick={() => setActiveTab("media")}
                    sx={{
                      bgcolor: "#f0fdf4",
                      "&:hover": { bgcolor: "#dcfce7" },
                      borderRadius: 1.5,
                      p: 2,
                      flexDirection: "column",
                      gap: 1,
                      textTransform: "none",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#22c55e",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Image color="white" size={24} />
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      拍照记录
                    </Typography>
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    onClick={() => setActiveTab("task")}
                    sx={{
                      bgcolor: "#fff7ed",
                      "&:hover": { bgcolor: "#ffedd5" },
                      borderRadius: 1.5,
                      p: 2,
                      flexDirection: "column",
                      gap: 1,
                      textTransform: "none",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#f97316",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle color="white" size={24} />
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      处理任务
                    </Typography>
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={600} mb={1.5}>
                最近巡检
              </Typography>
              {patrols.length === 0 ? (
                <Paper sx={{ p: 3, borderRadius: 2, textAlign: "center" }}>
                  <MapPin
                    size={48}
                    color="#cbd5e1"
                    style={{ margin: "0 auto 8px" }}
                  />
                  <Typography color="text.secondary">暂无巡检记录</Typography>
                </Paper>
              ) : (
                <Stack spacing={1.5}>
                  {patrols.slice(0, 3).map((patrol) => (
                    <Paper key={patrol.id} sx={{ p: 2, borderRadius: 1.5 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Typography fontWeight={500}>{patrol.title}</Typography>
                        <StatusChip status={patrol.status} />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <MapPin size={16} color="#94a3b8" />
                        <Typography variant="body2" color="text.secondary">
                          {patrol.address || "未知位置"}
                        </Typography>
                      </Stack>
                      {patrol.checked_at && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          mt={0.5}
                        >
                          {new Date(patrol.checked_at).toLocaleString("zh-CN")}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        )}

        {activeTab === "patrol" && (
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h5" fontWeight={700}>
                巡检记录
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Plus size={16} />}
                onClick={handleCreatePatrol}
              >
                打卡
              </Button>
            </Stack>

            {patrols.length === 0 ? (
              <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                <MapPin
                  size={64}
                  color="#cbd5e1"
                  style={{ margin: "0 auto 12px" }}
                />
                <Typography color="text.secondary" mb={2}>
                  暂无巡检记录
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreatePatrol}
                >
                  立即巡检
                </Button>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {patrols.map((patrol) => (
                  <Paper key={patrol.id} sx={{ p: 2, borderRadius: 1.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Box>
                        <Typography fontWeight={500}>{patrol.title}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                        >
                          {patrol.description}
                        </Typography>
                      </Box>
                      <StatusChip status={patrol.status} />
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <MapPin size={16} color="#94a3b8" />
                        <Typography variant="body2" color="text.secondary">
                          {patrol.address || "未知"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Clock size={16} color="#94a3b8" />
                        <Typography variant="body2" color="text.secondary">
                          {patrol.checked_at
                            ? new Date(patrol.checked_at).toLocaleDateString(
                                "zh-CN",
                              )
                            : "-"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {activeTab === "task" && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={700} mb={2}>
              任务中心
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2, overflowX: "auto", pb: 1 }}
            >
              {["全部", "待处理", "进行中", "已完成"].map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  sx={{
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                />
              ))}
            </Stack>

            {tasks.length === 0 ? (
              <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                <CheckCircle
                  size={64}
                  color="#cbd5e1"
                  style={{ margin: "0 auto 12px" }}
                />
                <Typography color="text.secondary">暂无任务</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {tasks.map((task) => (
                  <Paper key={task.id} sx={{ p: 2, borderRadius: 1.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Box flex={1}>
                        <Typography fontWeight={500}>{task.title}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                        >
                          {task.description}
                        </Typography>
                      </Box>
                      <Box ml={1.5}>
                        <StatusChip status={task.status} />
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <AlertCircle size={16} color="#94a3b8" />
                        <Typography variant="body2" color="text.secondary">
                          优先级: {task.priority || "中"}
                        </Typography>
                      </Stack>
                      <Button size="small" color="primary">
                        查看详情
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {activeTab === "scan" && (
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h5" fontWeight={700}>
                扫码记录
              </Typography>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#a855f7",
                  "&:hover": { bgcolor: "#9333ea" },
                }}
                startIcon={<QrCode size={16} />}
                onClick={handleScan}
              >
                扫码
              </Button>
            </Stack>

            {scans.length === 0 ? (
              <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                <QrCode
                  size={64}
                  color="#cbd5e1"
                  style={{ margin: "0 auto 12px" }}
                />
                <Typography color="text.secondary" mb={2}>
                  暂无扫码记录
                </Typography>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#a855f7",
                    "&:hover": { bgcolor: "#9333ea" },
                  }}
                  onClick={handleScan}
                >
                  立即扫码
                </Button>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {scans.map((scan) => (
                  <Paper key={scan.id} sx={{ p: 2, borderRadius: 1.5 }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: "#f3e8ff",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <QrCode size={20} color="#a855f7" />
                      </Box>
                      <Box flex={1}>
                        <Typography fontWeight={500}>{scan.barcode}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                        >
                          类型: {scan.item_type}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          mt={0.5}
                        >
                          {scan.scanned_at
                            ? new Date(scan.scanned_at).toLocaleString("zh-CN")
                            : "-"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {activeTab === "media" && (
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h5" fontWeight={700}>
                媒体记录
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#22c55e",
                    "&:hover": { bgcolor: "#16a34a" },
                  }}
                  startIcon={<Image size={16} />}
                >
                  拍照
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Video size={16} />}
                >
                  录像
                </Button>
              </Stack>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2, overflowX: "auto", pb: 1 }}
            >
              {["全部", "照片", "视频", "音频"].map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  sx={{
                    bgcolor: "#f0fdf4",
                    color: "#16a34a",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                />
              ))}
            </Stack>

            {media.length === 0 ? (
              <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                <Image
                  size={64}
                  color="#cbd5e1"
                  style={{ margin: "0 auto 12px" }}
                />
                <Typography color="text.secondary" mb={2}>
                  暂无媒体记录
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={1.5}>
                {media.map((item) => (
                  <Grid item xs={6} key={item.id}>
                    <Paper sx={{ borderRadius: 1.5, overflow: "hidden" }}>
                      <Box
                        sx={{
                          aspectRatio: "1/1",
                          bgcolor: "grey.100",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.media_type === "photo" && (
                          <Image size={48} color="#9ca3af" />
                        )}
                        {item.media_type === "video" && (
                          <Video size={48} color="#9ca3af" />
                        )}
                        {item.media_type === "audio" && (
                          <Mic size={48} color="#9ca3af" />
                        )}
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {item.description || "无描述"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          mt={0.5}
                        >
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                "zh-CN",
                              )
                            : "-"}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>

      <MobileNav currentPage="mobile-workstation" onNavigate={() => {}} />
    </Box>
  );
};

export default MobileWorkstationPage;
