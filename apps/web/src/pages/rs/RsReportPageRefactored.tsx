/**
 * RsReportPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 保持统计报表布局
 * 3. RS 主题色使用蓝色 (#3b82f6)
 */

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  BarChart3,
  TrendingUp,
  Flask,
  Folder,
} from "lucide-react";
import { PageHeader } from "../../components/layout";
import { Grid } from "../../components/Grid";

interface ReportData {
  projects: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  experiments: {
    total: number;
    lab: number;
    pilot: number;
    scaleup: number;
    successRate: number;
  };
  formulas: {
    total: number;
    published: number;
    testing: number;
    draft: number;
  };
  monthlyProgress: Array<{
    month: string;
    projects: number;
    experiments: number;
  }>;
}

const reportData: ReportData = {
  projects: {
    total: 24,
    active: 12,
    completed: 8,
    cancelled: 4,
  },
  experiments: {
    total: 156,
    lab: 80,
    pilot: 50,
    scaleup: 26,
    successRate: 87.5,
  },
  formulas: {
    total: 45,
    published: 30,
    testing: 10,
    draft: 5,
  },
  monthlyProgress: [
    { month: "2024-01", projects: 2, experiments: 15 },
    { month: "2024-02", projects: 3, experiments: 20 },
    { month: "2024-03", projects: 4, experiments: 25 },
    { month: "2024-04", projects: 5, experiments: 30 },
    { month: "2024-05", projects: 4, experiments: 28 },
    { month: "2024-06", projects: 6, experiments: 38 },
  ],
};

const RsReportPageRefactored: React.FC = () => {
  return (
    <>
      <PageHeader
        title="研发报表分析"
        subtitle="研发项目统计分析、试验数据汇总、成果评估"
      />

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Stack
                sx={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    项目统计
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
                    {reportData.projects.total}
                  </Typography>
                  <Stack sx={{ mt: 1, flexDirection: "row" }} spacing={1}>
                    <Chip
                      label={`进行中 ${reportData.projects.active}`}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`已完成 ${reportData.projects.completed}`}
                      size="small"
                      color="success"
                    />
                  </Stack>
                </div>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "primary.light",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Folder size={24} style={{ color: "#3b82f6" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Stack
                sx={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    试验统计
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold", color: "warning.main" }}>
                    {reportData.experiments.total}
                  </Typography>
                  <Stack sx={{ mt: 1, flexDirection: "row", alignItems: "center" }} spacing={0.5}>
                    <TrendingUp size={16} color="#16a34a" />
                    <Typography variant="body2" color="success.main">
                      成功率 {reportData.experiments.successRate}%
                    </Typography>
                  </Stack>
                </div>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "warning.light",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Flask size={24} style={{ color: "#f59e0b" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Stack
                sx={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    配方统计
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold", color: "secondary.main" }}>
                    {reportData.formulas.total}
                  </Typography>
                  <Stack sx={{ mt: 1, flexDirection: "row" }} spacing={1}>
                    <Chip
                      label={`已发布 ${reportData.formulas.published}`}
                      size="small"
                      color="success"
                    />
                    <Chip
                      label={`测试中 ${reportData.formulas.testing}`}
                      size="small"
                      color="warning"
                    />
                  </Stack>
                </div>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "secondary.light",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BarChart3 size={24} style={{ color: "#8b5cf6" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 图表区域 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                试验阶段分布
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Stack
                  sx={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2">小试阶段</Typography>
                  <Stack sx={{ flexDirection: "row", alignItems: "center" }} spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {reportData.experiments.lab}
                    </Typography>
                    <Chip
                      label={`${((reportData.experiments.lab / reportData.experiments.total) * 100).toFixed(1)}%`}
                      size="small"
                    />
                  </Stack>
                </Stack>
                <Stack
                  sx={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2">中试阶段</Typography>
                  <Stack sx={{ flexDirection: "row", alignItems: "center" }} spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {reportData.experiments.pilot}
                    </Typography>
                    <Chip
                      label={`${((reportData.experiments.pilot / reportData.experiments.total) * 100).toFixed(1)}%`}
                      size="small"
                      color="warning"
                    />
                  </Stack>
                </Stack>
                <Stack
                  sx={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2">放大试验</Typography>
                  <Stack sx={{ flexDirection: "row", alignItems: "center" }} spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {reportData.experiments.scaleup}
                    </Typography>
                    <Chip
                      label={`${((reportData.experiments.scaleup / reportData.experiments.total) * 100).toFixed(1)}%`}
                      size="small"
                      color="error"
                    />
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                月度进展趋势
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {reportData.monthlyProgress.map((item, index) => (
                  <Stack
                    key={index}
                    sx={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2">{item.month}</Typography>
                    <Stack sx={{ flexDirection: "row" }} spacing={2}>
                      <Chip
                        label={`项目 ${item.projects}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`试验 ${item.experiments}`}
                        size="small"
                        color="primary"
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default RsReportPageRefactored;
