import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Paper,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from "@mui/lab";
import {
  Edit as EditIcon,
  Science as ScienceIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";

const RsExperimentDetailPage: React.FC = () => {
  // 模拟试验详情数据
  const experiment = {
    id: "1",
    name: "催化剂活性测试-第3轮",
    code: "EXP-2024-003",
    project_name: "新型催化剂研发项目",
    phase: "中试",
    status: "进行中",
    experimenter: "王五",
    objective: "验证催化剂在中试条件下的活性表现，评估其稳定性和重复性",
    method: "采用标准测试方法，在反应温度350-400°C范围内进行活性测试",
    started_at: "2024-07-15",
    completed_at: null,
    batch_number: "B-2024-003",
    scale: 50,
    scale_unit: "kg",
  };

  const records = [
    {
      id: "1",
      type: "实验记录",
      content: "第一组样品测试完成，转化率达到预期目标",
      recorded_by: "王五",
      recorded_at: "2024-07-16",
    },
    {
      id: "2",
      type: "数据记录",
      content: "温度曲线数据已记录，峰值温度385°C",
      recorded_by: "王五",
      recorded_at: "2024-07-17",
    },
    {
      id: "3",
      type: "观察记录",
      content: "催化剂颗粒状态良好，无明显磨损",
      recorded_by: "李四",
      recorded_at: "2024-07-18",
    },
  ];

  const materials = [
    {
      name: "催化剂样品A",
      batch: "CAT-001",
      amount: "10kg",
      supplier: "实验室自制",
    },
    {
      name: "反应原料",
      batch: "RAW-001",
      amount: "100kg",
      supplier: "供应商A",
    },
    { name: "标准试剂", batch: "STD-001", amount: "5kg", supplier: "试剂公司" },
  ];

  const getPhaseColor = (
    phase: string,
  ): "info" | "warning" | "error" | "default" => {
    switch (phase) {
      case "小试":
        return "info";
      case "中试":
        return "warning";
      case "放大":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusColor = (
    status: string,
  ): "primary" | "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "进行中":
        return "primary";
      case "已完成":
        return "success";
      case "暂停":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 12 }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {experiment.name}
              </Typography>
              <Chip
                label={experiment.status}
                color={getStatusColor(experiment.status)}
              />
              <Chip
                label={experiment.phase}
                color={getPhaseColor(experiment.phase)}
                size="small"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              编码: {experiment.code} | 项目: {experiment.project_name} |
              实验员: {experiment.experimenter}
            </Typography>
          </div>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<EditIcon />}>
              编辑
            </Button>
            <Button variant="contained" startIcon={<TrendingUpIcon />}>
              推进阶段
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* 试验概览 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                试验目标
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {experiment.objective}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                实验方法
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {experiment.method}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    开始日期: {experiment.started_at}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    完成日期: {experiment.completed_at || "进行中"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    批次号: {experiment.batch_number}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    试验规模: {experiment.scale} {experiment.scale_unit}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                试验物料
              </Typography>
              <Stack spacing={2}>
                {materials.map((material, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2">{material.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      批次: {material.batch} | 数量: {material.amount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      来源: {material.supplier}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 详细信息标签页 */}
      <Paper>
        <Tabs defaultValue={0}>
          <Tab label="实验记录" icon={<ScienceIcon />} iconPosition="start" />
          <Tab
            label="数据结果"
            icon={<DescriptionIcon />}
            iconPosition="start"
          />
          <Tab
            label="批次追溯"
            icon={<CheckCircleIcon />}
            iconPosition="start"
          />
        </Tabs>

        <div style={{ padding: 12 }}>
          {/* 实验记录 */}
          <Timeline>
            {records.map((record) => (
              <TimelineItem key={record.id}>
                <TimelineSeparator>
                  <TimelineDot color="primary">
                    <ScienceIcon />
                  </TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <Chip label={record.type} size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2">
                          {record.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          记录人: {record.recorded_by} | 时间:{" "}
                          {record.recorded_at}
                        </Typography>
                      </div>
                    </Stack>
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      </Paper>
    </Container>
  );
};

export default RsExperimentDetailPage;
