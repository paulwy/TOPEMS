import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Clock,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Grid,
  Chip,
} from "@mui/material";
import { LoadingSpinner } from "../components/LoadingSpinner";
import ExportButton from "../components/ExportButton";

const moduleConfig: Record<string, { name: string; icon: string; color: string }> = {
  rs: { name: "研发管理", icon: "🔬", color: "#3B82F6" },
  lims: { name: "实验室管理", icon: "🧪", color: "#10B981" },
  qms: { name: "质量管理", icon: "✅", color: "#F59E0B" },
  ehs: { name: "安全环保", icon: "🛡️", color: "#EF4444" },
  srm: { name: "供应链管理", icon: "📦", color: "#8B5CF6" },
  pdm: { name: "生产数据", icon: "🏭", color: "#06B6D4" },
};

interface ModuleData {
  summary: Record<string, number | string>;
  timeline: Array<{ month: string; count: number }>;
  distribution: Array<{ name: string; value: number }>;
  detailTable: Array<Record<string, string | number>>;
}

const getMockData = (moduleId: string): ModuleData => {
  const mockData: Record<string, ModuleData> = {
    rs: {
      summary: {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_duration: 45.5,
      },
      timeline: [
        { month: "1月", count: 25 },
        { month: "2月", count: 30 },
        { month: "3月", count: 28 },
        { month: "4月", count: 35 },
        { month: "5月", count: 42 },
        { month: "6月", count: 38 },
      ],
      distribution: [
        { name: "研发", value: 60 },
        { name: "改进", value: 30 },
        { name: "创新", value: 10 },
      ],
      detailTable: [
        { id: "RS001", project: "产品A研发", status: "进行中", progress: 75, owner: "张三" },
        { id: "RS002", project: "产品B改进", status: "已完成", progress: 100, owner: "李四" },
        { id: "RS003", project: "技术预研", status: "进行中", progress: 45, owner: "王五" },
        { id: "RS004", project: "平台升级", status: "已暂停", progress: 30, owner: "赵六" },
      ],
    },
    lims: {
      summary: {
        total_samples: 2450,
        completed_tests: 2150,
        pending_tests: 180,
        avg_turnaround: 48,
      },
      timeline: [
        { month: "1月", count: 420 },
        { month: "2月", count: 380 },
        { month: "3月", count: 450 },
        { month: "4月", count: 520 },
        { month: "5月", count: 480 },
        { month: "6月", count: 550 },
      ],
      distribution: [
        { name: "化学检验", value: 40 },
        { name: "物理检验", value: 30 },
        { name: "微生物检验", value: 20 },
        { name: "其他", value: 10 },
      ],
      detailTable: [
        { id: "LM001", sample: "原材料A", type: "化学检验", status: "已完成", result: "合格" },
        { id: "LM002", sample: "半成品B", type: "物理检验", status: "进行中", result: "-" },
        { id: "LM003", sample: "成品C", type: "微生物检验", status: "已完成", result: "合格" },
        { id: "LM004", sample: "原材料D", type: "化学检验", status: "已完成", result: "不合格" },
      ],
    },
    qms: {
      summary: {
        total_inspections: 3250,
        passed: 3180,
        failed: 70,
        pass_rate: 97.8,
      },
      timeline: [
        { month: "1月", count: 520 },
        { month: "2月", count: 480 },
        { month: "3月", count: 550 },
        { month: "4月", count: 620 },
        { month: "5月", count: 580 },
        { month: "6月", count: 650 },
      ],
      distribution: [
        { name: "合格", value: 97.8 },
        { name: "不合格", value: 2.2 },
      ],
      detailTable: [
        { id: "QM001", inspection: "来料检验", batch: "LOT2024001", status: "通过", quality: "A" },
        { id: "QM002", inspection: "过程检验", batch: "LOT2024002", status: "通过", quality: "A" },
        { id: "QM003", inspection: "成品检验", batch: "LOT2024003", status: "不通过", quality: "C" },
        { id: "QM004", inspection: "出货检验", batch: "LOT2024004", status: "通过", quality: "B" },
      ],
    },
    ehs: {
      summary: {
        total_risks: 125,
        high_risks: 15,
        incidents: 18,
        resolved: 110,
      },
      timeline: [
        { month: "1月", count: 15 },
        { month: "2月", count: 12 },
        { month: "3月", count: 18 },
        { month: "4月", count: 8 },
        { month: "5月", count: 10 },
        { month: "6月", count: 15 },
      ],
      distribution: [
        { name: "高风险", value: 15 },
        { name: "中风险", value: 45 },
        { name: "低风险", value: 65 },
      ],
      detailTable: [
        { id: "EH001", risk: "化学品泄漏", level: "高", status: "已解决", date: "2024-03-15" },
        { id: "EH002", risk: "设备故障", level: "中", status: "处理中", date: "2024-04-20" },
        { id: "EH003", risk: "高处作业", level: "高", status: "已解决", date: "2024-05-10" },
        { id: "EH004", risk: "用电安全", level: "低", status: "已解决", date: "2024-06-01" },
      ],
    },
    srm: {
      summary: {
        total_suppliers: 280,
        qualified: 220,
        avg_rating: 4.5,
        pending_orders: 35,
      },
      timeline: [
        { month: "1月", count: 220 },
        { month: "2月", count: 235 },
        { month: "3月", count: 240 },
        { month: "4月", count: 245 },
        { month: "5月", count: 250 },
        { month: "6月", count: 280 },
      ],
      distribution: [
        { name: "合格", value: 220 },
        { name: "待审核", value: 45 },
        { name: "不合格", value: 15 },
      ],
      detailTable: [
        { id: "SR001", supplier: "供应商A", type: "原材料", rating: 4.8, status: "合格" },
        { id: "SR002", supplier: "供应商B", type: "辅料", rating: 4.2, status: "合格" },
        { id: "SR003", supplier: "供应商C", type: "包装", rating: 3.8, status: "待审核" },
        { id: "SR004", supplier: "供应商D", type: "原材料", rating: 4.5, status: "合格" },
      ],
    },
    pdm: {
      summary: {
        total_batches: 450,
        completed: 415,
        in_progress: 28,
        efficiency: 92.5,
      },
      timeline: [
        { month: "1月", count: 1850 },
        { month: "2月", count: 2100 },
        { month: "3月", count: 1980 },
        { month: "4月", count: 2350 },
        { month: "5月", count: 2200 },
        { month: "6月", count: 2420 },
      ],
      distribution: [
        { name: "已完成", value: 415 },
        { name: "进行中", value: 28 },
        { name: "已取消", value: 7 },
      ],
      detailTable: [
        { id: "PD001", batch: "批次2024001", product: "产品A", status: "已完成", output: 1000 },
        { id: "PD002", batch: "批次2024002", product: "产品B", status: "进行中", output: 650 },
        { id: "PD003", batch: "批次2024003", product: "产品C", status: "已完成", output: 820 },
        { id: "PD004", batch: "批次2024004", product: "产品A", status: "已取消", output: 0 },
      ],
    },
  };
  return mockData[moduleId] || mockData.rs;
};

const summaryLabels: Record<string, string> = {
  total_projects: "项目总数",
  active_projects: "进行中",
  completed_projects: "已完成",
  avg_duration: "平均周期(天)",
  total_samples: "样品总数",
  completed_tests: "完成检验",
  pending_tests: "待检验",
  avg_turnaround: "平均周期(小时)",
  total_inspections: "检验总数",
  passed: "合格数",
  failed: "不合格数",
  pass_rate: "合格率(%)",
  total_risks: "风险总数",
  high_risks: "高风险",
  incidents: "安全事件",
  resolved: "已解决",
  total_suppliers: "供应商总数",
  qualified: "合格供应商",
  avg_rating: "平均评分",
  pending_orders: "待处理订单",
  total_batches: "批次总数",
  completed: "已完成",
  in_progress: "进行中",
  efficiency: "效率(%)",
};

const BIModuleDetailPage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const config = moduleConfig[moduleId || "rs"] || {
    name: "未知模块",
    icon: "📊",
    color: "#6B7280",
  };

  useEffect(() => {
    loadModuleData();
  }, [moduleId]);

  const loadModuleData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);
    try {
      setTimeout(() => {
        setModuleData(getMockData(moduleId || "rs"));
        setLoading(false);
        setIsRefreshing(false);
      }, 500);
    } catch (error) {
      console.error("Failed to load module data:", error);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadModuleData(true);
  };

  const exportData = moduleData?.detailTable || [];

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
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Link to="/bi/analytics">
            <Button variant="text" size="small">
              <ArrowLeft sx={{ width: 20, height: 20 }} />
            </Button>
          </Link>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontSize: "1.5rem" }}>
              {config.icon}
            </Typography>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {config.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                模块详细数据分析
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <Clock size={14} /> 最后更新: {new Date().toLocaleString("zh-CN")}
          </Typography>
          <ExportButton
            data={exportData}
            columns={
              moduleId === "rs"
                ? ["id", "project", "status", "progress", "owner"]
                : moduleId === "lims"
                  ? ["id", "sample", "type", "status", "result"]
                  : moduleId === "qms"
                    ? ["id", "inspection", "batch", "status", "quality"]
                    : moduleId === "ehs"
                      ? ["id", "risk", "level", "status", "date"]
                      : moduleId === "srm"
                        ? ["id", "supplier", "type", "rating", "status"]
                        : ["id", "batch", "product", "status", "output"]
            }
            filename={`bi-${moduleId}-detail`}
          />
          <Button variant="outlined" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw
              size={16}
              sx={{ mr: 1, animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
            />
            {isRefreshing ? "刷新中..." : "刷新"}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={12}>
          <Card>
            <CardHeader title="模块基本信息" />
            <CardContent>
              <Grid container spacing={2}>
                {moduleData?.summary &&
                  Object.entries(moduleData.summary).map(([key, value]) => (
                    <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "grey.50",
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {summaryLabels[key] || key}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {typeof value === "number" ? value.toLocaleString() : value}
                            {key.includes("rate") || key.includes("efficiency") ? "%" : ""}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: `${config.color}20`,
                            color: config.color,
                          }}
                        >
                          <BarChart3 size={20} />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="月度趋势"
              subheader="数据变化走势"
              avatar={<LineChart size={20} />}
            />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {moduleData?.timeline.map((item, index) => (
                  <Box
                    key={item.month}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ width: 40, color: "text.secondary" }}>
                      {item.month}
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        height: 24,
                        bgcolor: "grey.100",
                        borderRadius: 1,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${(item.count / Math.max(...moduleData.timeline.map((t) => t.count))) * 100}%`,
                          bgcolor: config.color,
                          borderRadius: 1,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 50, textAlign: "right" }}>
                      {item.count.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="分布占比"
              subheader="数据构成分析"
              avatar={<PieChart size={20} />}
            />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {moduleData?.distribution.map((item, index) => (
                  <Box key={item.name} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: [
                          "#3B82F6",
                          "#10B981",
                          "#F59E0B",
                          "#EF4444",
                          "#8B5CF6",
                          "#06B6D4",
                        ][index % 6],
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Chip
                      label={
                        typeof item.value === "number" && item.value < 100
                          ? `${item.value}%`
                          : item.value.toLocaleString()
                      }
                      size="small"
                      sx={{ bgcolor: "grey.100" }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader
              title="数据明细表"
              subheader="详细业务数据"
              avatar={<TableIcon size={20} />}
            />
            <CardContent>
              <Box sx={{ overflow: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {moduleId === "rs" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>项目编号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>项目名称</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>进度</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
                        </>
                      )}
                      {moduleId === "lims" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>样品编号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>样品名称</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>检验类型</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>结果</TableCell>
                        </>
                      )}
                      {moduleId === "qms" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>检验单号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>检验项目</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>批次</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>质量等级</TableCell>
                        </>
                      )}
                      {moduleId === "ehs" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>风险编号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>风险描述</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>风险等级</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>处理状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                        </>
                      )}
                      {moduleId === "srm" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>供应商编号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>供应商名称</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>评分</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        </>
                      )}
                      {moduleId === "pdm" && (
                        <>
                          <TableCell sx={{ fontWeight: 600 }}>批次编号</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>产品</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>产量</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {moduleData?.detailTable.map((row, index) => (
                      <TableRow key={index} hover>
                        {Object.values(row).map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {typeof cell === "number" ? cell.toLocaleString() : cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BIModuleDetailPage;
