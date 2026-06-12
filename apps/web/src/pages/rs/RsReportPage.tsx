import React from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Science as ScienceIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

const RsReportPage: React.FC = () => {
  const reportData = {
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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          研发报表分析
        </Typography>
        <Typography variant="body2" color="text.secondary">
          研发项目统计分析、试验数据汇总、成果评估
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    项目统计
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {reportData.projects.total}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
                </Box>
                <FolderIcon color="primary" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    试验统计
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {reportData.experiments.total}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ mt: 1 }}
                  >
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      成功率 {reportData.experiments.successRate}%
                    </Typography>
                  </Stack>
                </Box>
                <ScienceIcon color="warning" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    配方统计
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {reportData.formulas.total}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
                </Box>
                <AnalyticsIcon color="info" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                试验阶段分布
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">小试阶段</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight="bold">
                      {reportData.experiments.lab}
                    </Typography>
                    <Chip
                      label={`${((reportData.experiments.lab / reportData.experiments.total) * 100).toFixed(1)}%`}
                      size="small"
                    />
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">中试阶段</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight="bold">
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
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">放大试验</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight="bold">
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

        <Grid item xs={12} md={6}>
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
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2">{item.month}</Typography>
                    <Stack direction="row" spacing={2}>
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
    </Container>
  );
};

export default RsReportPage;
