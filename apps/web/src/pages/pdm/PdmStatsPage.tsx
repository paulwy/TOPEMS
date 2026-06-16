import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import {
  TrendingUp,
  Factory,
  ClipboardList,
  Package,
  Activity,
  CheckCircle,
} from "lucide-react";
import { MetricCard } from "../../components/MetricCard";
import { StatsChart } from "../../components/StatsChart";
import { pdmApi } from "../../api/pdm";
import type { ProductionProcess, ProductionStep, ProductionFormula, ProductionBatch } from "../../api/pdm";

const PdmStatsPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [processRes, stepRes, formulaRes, batchRes] = await Promise.all([
        pdmApi.listProcesses(),
        pdmApi.listSteps(),
        pdmApi.listFormulas(),
        pdmApi.listBatches(),
      ]);

      if (processRes.success && processRes.data) {
        const data = processRes.data as any;
        const items = Array.isArray(data) ? data : data.processes || [];
        setProcesses(items.map((item: any) => ({
          ...item,
          status: item.status === "active" ? "启用" : item.status === "inactive" ? "禁用" : item.status,
        })));
      }
      if (stepRes.success && stepRes.data) {
        const data = stepRes.data as any;
        const items = Array.isArray(data) ? data : data.steps || [];
        setSteps(items.map((item: any) => ({
          ...item,
          status: item.status === "active" ? "启用" : item.status === "inactive" ? "禁用" : item.status,
        })));
      }
      if (formulaRes.success && formulaRes.data) {
        const data = formulaRes.data as any;
        const items = Array.isArray(data) ? data : data.formulas || [];
        setFormulas(items.map((item: any) => ({
          ...item,
          status: item.status === "active" ? "启用" : item.status === "inactive" ? "禁用" : item.status,
        })));
      }
      if (batchRes.success && batchRes.data) {
        const data = batchRes.data as any;
        const items = Array.isArray(data) ? data : data.batches || [];
        setBatches(items.map((item: any) => ({
          ...item,
          status: item.status === "planning" ? "规划中" : 
                  item.status === "in_progress" ? "进行中" : 
                  item.status === "completed" ? "已完成" : 
                  item.status === "cancelled" ? "已取消" : item.status,
        })));
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalProcesses: processes.length,
    activeProcesses: processes.filter((p) => p.status === "启用").length,
    totalSteps: steps.length,
    totalFormulas: formulas.length,
    activeFormulas: formulas.filter((f) => f.status === "启用").length,
    totalBatches: batches.length,
    planningBatches: batches.filter((b) => b.status === "规划中").length,
    inProgressBatches: batches.filter((b) => b.status === "进行中").length,
    completedBatches: batches.filter((b) => b.status === "已完成").length,
    cancelledBatches: batches.filter((b) => b.status === "已取消").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#06b6d4",
              borderTopColor: "#0891b2",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "slate.900",
                    fontSize: "1.25rem",
                  }}
                >
                  生产统计
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Production Statistics
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 2, lg: 3, xl: 6 },
            gap: 2,
            mb: 4,
          }}
        >
          <MetricCard
            title="生产工艺"
            value={stats.totalProcesses}
            icon={<Factory sx={{ width: 24, height: 24 }} />}
            gradient={["#14B8A6", "#0D9488"]}
            subtitle={`启用 ${stats.activeProcesses}`}
            trend="neutral"
          />
          <MetricCard
            title="生产工序"
            value={stats.totalSteps}
            icon={<ClipboardList sx={{ width: 24, height: 24 }} />}
            gradient={["#8B5CF6", "#7C3AED"]}
            trend="neutral"
          />
          <MetricCard
            title="生产配方"
            value={stats.totalFormulas}
            icon={<Package sx={{ width: 24, height: 24 }} />}
            gradient={["#F59E0B", "#D97706"]}
            subtitle={`活跃 ${stats.activeFormulas}`}
            trend="neutral"
          />
          <MetricCard
            title="生产批次"
            value={stats.totalBatches}
            icon={<Activity sx={{ width: 24, height: 24 }} />}
            gradient={["#6366F1", "#4F46E5"]}
            subtitle={`进行中 ${stats.inProgressBatches}`}
            trend="neutral"
          />
          <MetricCard
            title="已完成批次"
            value={stats.completedBatches}
            icon={<CheckCircle sx={{ width: 24, height: 24 }} />}
            gradient={["#00C897", "#00A878"]}
            trend="up"
          />
          <MetricCard
            title="规划中批次"
            value={stats.planningBatches}
            icon={<TrendingUp sx={{ width: 24, height: 24 }} />}
            gradient={["#EC4899", "#DB2777"]}
            trend="neutral"
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: 2 },
            gap: 4,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <StatsChart
                title="批次状态分布"
                type="pie"
                data={[
                  { name: "规划中", value: stats.planningBatches, color: "#F59E0B" },
                  { name: "进行中", value: stats.inProgressBatches, color: "#6366F1" },
                  { name: "已完成", value: stats.completedBatches, color: "#00C897" },
                  { name: "已取消", value: stats.cancelledBatches, color: "#6B7280" },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <StatsChart
                title="工艺与配方状态"
                type="pie"
                data={[
                  { name: "活跃工艺", value: stats.activeProcesses, color: "#14B8A6" },
                  { name: "活跃配方", value: stats.activeFormulas, color: "#F59E0B" },
                  { name: "总工序", value: stats.totalSteps, color: "#8B5CF6" },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
              />
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 3, display: "flex", alignItems: "center", gap: 1 }}
            >
              <TrendingUp sx={{ width: 20, height: 20, color: "#06b6d4" }} />
              各模块详细统计
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, md: 2, lg: 4 },
                gap: 3,
              }}
            >
              <Box sx={{ backgroundColor: "white", borderRadius: 3, boxShadow: 1, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ color: "#4b5563", fontSize: "0.875rem", mb: 0.5 }}>工艺总数</Typography>
                    <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827" }}>{stats.totalProcesses}</Typography>
                  </Box>
                  <Box sx={{ width: 48, height: 48, backgroundColor: "#f0fdfa", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Factory sx={{ width: 24, height: 24, color: "#14B8A6" }} />
                  </Box>
                </Box>
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "#f3f4f6" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>已启用</Typography>
                    <Typography sx={{ fontWeight: 500, color: "#16a34a" }}>{stats.activeProcesses}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>已禁用</Typography>
                    <Typography sx={{ fontWeight: 500, color: "#dc2626" }}>{stats.totalProcesses - stats.activeProcesses}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: "white", borderRadius: 3, boxShadow: 1, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ color: "#4b5563", fontSize: "0.875rem", mb: 0.5 }}>工序总数</Typography>
                    <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827" }}>{stats.totalSteps}</Typography>
                  </Box>
                  <Box sx={{ width: 48, height: 48, backgroundColor: "#faf5ff", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardList sx={{ width: 24, height: 24, color: "#8B5CF6" }} />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: "white", borderRadius: 3, boxShadow: 1, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ color: "#4b5563", fontSize: "0.875rem", mb: 0.5 }}>配方总数</Typography>
                    <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827" }}>{stats.totalFormulas}</Typography>
                  </Box>
                  <Box sx={{ width: 48, height: 48, backgroundColor: "#fffbeb", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package sx={{ width: 24, height: 24, color: "#D97706" }} />
                  </Box>
                </Box>
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "#f3f4f6" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>活跃配方</Typography>
                    <Typography sx={{ fontWeight: 500, color: "#16a34a" }}>{stats.activeFormulas}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: "white", borderRadius: 3, boxShadow: 1, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ color: "#4b5563", fontSize: "0.875rem", mb: 0.5 }}>批次总数</Typography>
                    <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827" }}>{stats.totalBatches}</Typography>
                  </Box>
                  <Box sx={{ width: 48, height: 48, backgroundColor: "#eff6ff", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Activity sx={{ width: 24, height: 24, color: "#6366F1" }} />
                  </Box>
                </Box>
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "#f3f4f6" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    <Box>
                      <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>规划中</Typography>
                      <Typography sx={{ fontWeight: 500, color: "#D97706" }}>{stats.planningBatches}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>进行中</Typography>
                      <Typography sx={{ fontWeight: 500, color: "#6366F1" }}>{stats.inProgressBatches}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>已完成</Typography>
                      <Typography sx={{ fontWeight: 500, color: "#16a34a" }}>{stats.completedBatches}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>已取消</Typography>
                      <Typography sx={{ fontWeight: 500, color: "#6b7280" }}>{stats.cancelledBatches}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PdmStatsPage;