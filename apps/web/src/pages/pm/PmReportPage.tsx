import React, { useState, useEffect } from "react";
import { Calendar, Filter } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardContent, TextField, MenuItem } from "@mui/material";
import ProjectReport from "@/components/pm/ProjectReport";
import { pmApi } from "@/api/pm";
import type { PmStatistics, ProjectBenefit } from "@/api/pm";
import { apiLogger } from "@/utils/logger";

const PmReportPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [stats, setStats] = useState<PmStatistics>({
    total_projects: 0,
    draft_projects: 0,
    pending_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_contracts: 0,
    pending_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_budget: 0,
    spent_budget: 0,
    budget_usage_rate: 0,
    on_time_projects: 0,
    delayed_projects: 0,
    average_progress: 0,
    high_risk_projects: 0,
    medium_risk_projects: 0,
    low_risk_projects: 0,
  });
  const [benefits, setBenefits] = useState<ProjectBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.projectId, selectedPeriod, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [statsResponse, benefitsResponse] = await Promise.all([
        pmApi.getStatistics(),
        params.projectId
          ? pmApi.benefits.list(params.projectId)
          : Promise.resolve({ success: true, data: { benefits: [] } }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (benefitsResponse.success && benefitsResponse.data) {
        setBenefits(benefitsResponse.data.benefits || []);
      }
    } catch (error) {
      apiLogger.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReportData();
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      <div
        style={{
          flex: 1,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}
            >
              项目报表
            </h1>
            <p style={{ color: "#6b7280", marginTop: 4 }}>
              {params.projectId ? "项目详情报表" : "全局项目统计报表"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button onClick={handleRefresh} variant="outlined">
              刷新数据
            </Button>
          </div>
        </div>

        <Card>
          <CardContent sx={{ p: 2 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Filter sx={{ width: 16, height: 16, color: "#6b7280" }} />
                  <span style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                    时间范围:
                  </span>
                </div>
                <TextField
                  select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  sx={{ width: 144 }}
                  placeholder="选择周期"
                >
                  <MenuItem value="all">全部时间</MenuItem>
                  <MenuItem value="week">本周</MenuItem>
                  <MenuItem value="month">本月</MenuItem>
                  <MenuItem value="quarter">本季度</MenuItem>
                  <MenuItem value="year">本年</MenuItem>
                  <MenuItem value="custom">自定义</MenuItem>
                </TextField>
                {selectedPeriod === "custom" && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div style={{ position: "relative" }}>
                      <Calendar
                        sx={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 16,
                          height: 16,
                          color: "#9ca3af",
                        }}
                      />
                      <TextField
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        sx={{ width: 144 }}
                      />
                    </div>
                    <span style={{ color: "#9ca3af" }}>至</span>
                    <div style={{ position: "relative" }}>
                      <Calendar
                        sx={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 16,
                          height: 16,
                          color: "#9ca3af",
                        }}
                      />
                      <TextField
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        sx={{ width: 144 }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {params.projectId && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/pm/reports")}
                >
                  返回全局报表
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent sx={{ p: 6, textAlign: "center" }}>
              <div
                style={{
                  animation: "spin 1s linear infinite",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  border: "2px solid #2563eb",
                  borderBottom: "2px solid transparent",
                  margin: "0 auto",
                }}
              ></div>
              <p style={{ marginTop: 16, color: "#6b7280" }}>加载中...</p>
            </CardContent>
          </Card>
        ) : (
          <ProjectReport stats={stats} benefits={benefits} />
        )}
      </div>
    </div>
  );
};

export default PmReportPage;
