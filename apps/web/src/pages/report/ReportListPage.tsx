import { Grid } from "@/components/Grid";
import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  BarChart3 as AnalyticsIcon,
  FileText as FileTextIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
} from "lucide-react";

const ReportListPage: React.FC = () => {
  const reportData = {
    total: 45,
    today: 12,
    scheduled: 8,
    subscribed: 15,
    categories: [
      { name: "销售报表", count: 12, icon: "sales" },
      { name: "财务报表", count: 10, icon: "finance" },
      { name: "生产报表", count: 8, icon: "production" },
      { name: "质量报表", count: 6, icon: "quality" },
      { name: "库存报表", count: 5, icon: "inventory" },
      { name: "其他报表", count: 4, icon: "other" },
    ],
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <div style={{ marginBottom: 12 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
          报表中心
        </Typography>
        <Typography variant="body2" color="text.secondary">
          统一报表管理平台，支持多种报表类型和导出格式
        </Typography>
      </div>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
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
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    报表总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {reportData.total}
                  </Typography>
                </div>
                <FileTextIcon color="primary" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
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
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    今日生成
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {reportData.today}
                  </Typography>
                </div>
                <AnalyticsIcon color="success" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
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
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    定时任务
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {reportData.scheduled}
                  </Typography>
                </div>
                <ClockIcon color="warning" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
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
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                  >
                    订阅用户
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {reportData.subscribed}
                  </Typography>
                </div>
                <UsersIcon color="info" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            报表分类
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {reportData.categories.map((category, index) => (
              <Grid key={index} size={{ xs: 6, md: 4 }}>
                <Card>
                  <CardContent>
                    <Stack
                      sx={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body1">{category.name}</Typography>
                      <Chip
                        label={category.count}
                        size="small"
                        color="primary"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ReportListPage;
