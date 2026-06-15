/**
 * PmReportPage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用统一的数据展示组件
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  useTheme,
} from "@mui/material";
import { Calendar, RefreshCw } from "lucide-react";
import ProjectReport from "../components/pm/ProjectReport";
import { pmApi } from "../api/pm";
import type { PmStatistics, ProjectBenefit } from "../api/pm";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "period",
    label: "时间范围",
    type: "select",
    options: [
      { value: "all", label: "全部时间" },
      { value: "week", label: "本周" },
      { value: "month", label: "本月" },
      { value: "quarter", label: "本季度" },
      { value: "year", label: "本年" },
      { value: "custom", label: "自定义" },
    ],
  },
];

// ============ 组件 ============
const PmReportPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const theme = useTheme();
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

  const loadReportData = useCallback(async () => {
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
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData, selectedPeriod, startDate, endDate]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    if (filterId === "period") {
      setSelectedPeriod(value);
    }
  }, []);

  const handleRefresh = () => {
    loadReportData();
  };

  return (
    <>
      <PageHeader
        title="项目报表"
        subtitle={params.projectId ? "项目详情报表" : "全局项目统计报表"}
        actions={
          params.projectId ? (
            <Button
              variant="outlined"
              onClick={() => navigate("/pm/reports")}
            >
              返回全局报表
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ p: 3 }}>
        {/* 筛选器 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "stretch", md: "center" }, gap: 2 }}>
              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
              />
              {selectedPeriod === "custom" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    sx={{ width: 150 }}
                    size="small"
                  />
                  <Box component="span" sx={{ color: "grey.400" }}>至</Box>
                  <TextField
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    sx={{ width: 150 }}
                    size="small"
                  />
                </Box>
              )}
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
                onClick={handleRefresh}
              >
                刷新数据
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 报表内容 */}
        {loading ? (
          <Card>
            <CardContent sx={{ p: 12, textAlign: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid",
                  borderColor: theme.palette.primary.main,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  mx: "auto",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
              <Box sx={{ mt: 2, color: "grey.500" }}>
                加载中...
              </Box>
            </CardContent>
          </Card>
        ) : (
          <ProjectReport stats={stats} benefits={benefits} />
        )}
      </Box>
    </>
  );
};

export default PmReportPage;
