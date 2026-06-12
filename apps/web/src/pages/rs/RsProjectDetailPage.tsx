import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Button,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Grid,
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
  Delete as DeleteIcon,
  Science as ScienceIcon,
  Description as DescriptionIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Folder as FolderIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";

interface ProjectDetail {
  id: string;
  name: string;
  code: string;
  description: string;
  project_type: string;
  status: string;
  leader: string;
  team_members: string[];
  progress: number;
  start_date: string;
  end_date: string | null;
  budget: number;
  risk_level: string;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  progress: number;
  start_date: string;
  end_date: string | null;
}

interface Milestone {
  id: string;
  name: string;
  status: string;
  target_date: string;
  actual_date: string | null;
}

interface Experiment {
  id: string;
  name: string;
  phase: string;
  status: string;
  experimenter: string;
}

const RsProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // 模拟项目详情数据
  const [project] = useState<ProjectDetail>({
    id: id || "1",
    name: "新型催化剂研发项目",
    code: "RS-2024-001",
    description:
      "开发一种新型高效催化剂，用于石油化工领域的催化裂化工艺，目标是提高转化率15%以上，降低能耗10%。",
    project_type: "新产品研发",
    status: "进行中",
    leader: "张三",
    team_members: ["李四", "王五", "赵六"],
    progress: 65,
    start_date: "2024-01-15",
    end_date: "2024-12-31",
    budget: 500000,
    risk_level: "中",
  });

  const [phases] = useState<Phase[]>([
    {
      id: "1",
      name: "立项调研",
      status: "已完成",
      progress: 100,
      start_date: "2024-01-15",
      end_date: "2024-02-28",
    },
    {
      id: "2",
      name: "方案设计",
      status: "已完成",
      progress: 100,
      start_date: "2024-03-01",
      end_date: "2024-04-15",
    },
    {
      id: "3",
      name: "小试阶段",
      status: "已完成",
      progress: 100,
      start_date: "2024-04-16",
      end_date: "2024-06-30",
    },
    {
      id: "4",
      name: "中试阶段",
      status: "进行中",
      progress: 60,
      start_date: "2024-07-01",
      end_date: "2024-09-30",
    },
    {
      id: "5",
      name: "放大试验",
      status: "待开始",
      progress: 0,
      start_date: "2024-10-01",
      end_date: "2024-11-30",
    },
    {
      id: "6",
      name: "成果验收",
      status: "待开始",
      progress: 0,
      start_date: "2024-12-01",
      end_date: "2024-12-31",
    },
  ]);

  const [milestones] = useState<Milestone[]>([
    {
      id: "1",
      name: "完成调研报告",
      status: "已完成",
      target_date: "2024-02-15",
      actual_date: "2024-02-10",
    },
    {
      id: "2",
      name: "确定技术路线",
      status: "已完成",
      target_date: "2024-04-01",
      actual_date: "2024-03-28",
    },
    {
      id: "3",
      name: "小试成功",
      status: "已完成",
      target_date: "2024-06-15",
      actual_date: "2024-06-20",
    },
    {
      id: "4",
      name: "中试验收",
      status: "进行中",
      target_date: "2024-09-15",
      actual_date: null,
    },
    {
      id: "5",
      name: "产品定型",
      status: "待开始",
      target_date: "2024-11-15",
      actual_date: null,
    },
  ]);

  const [experiments] = useState<Experiment[]>([
    {
      id: "1",
      name: "催化剂活性测试-第1轮",
      phase: "小试",
      status: "已完成",
      experimenter: "李四",
    },
    {
      id: "2",
      name: "催化剂活性测试-第2轮",
      phase: "小试",
      status: "已完成",
      experimenter: "李四",
    },
    {
      id: "3",
      name: "催化剂活性测试-第3轮",
      phase: "中试",
      status: "进行中",
      experimenter: "王五",
    },
    {
      id: "4",
      name: "热稳定性评估",
      phase: "小试",
      status: "已完成",
      experimenter: "赵六",
    },
    {
      id: "5",
      name: "配方优化实验",
      phase: "中试",
      status: "进行中",
      experimenter: "李四",
    },
  ]);

  const getStatusColor = (
    status: string,
  ): "primary" | "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "已完成":
        return "success";
      case "进行中":
        return "primary";
      case "待开始":
        return "default";
      case "暂停":
        return "warning";
      case "取消":
        return "error";
      default:
        return "default";
    }
  };

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

  const getRiskColor = (risk: string): "success" | "warning" | "error" => {
    switch (risk) {
      case "低":
        return "success";
      case "中":
        return "warning";
      case "高":
        return "error";
      default:
        return "warning";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 12 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <div>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h4" fontWeight="bold">
                {project.name}
              </Typography>
              <Chip
                label={project.status}
                color={getStatusColor(project.status)}
              />
              <Chip
                label={`风险: ${project.risk_level}`}
                color={getRiskColor(project.risk_level)}
                size="small"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              编码: {project.code} | 类型: {project.project_type} | 负责人:{" "}
              {project.leader}
            </Typography>
          </div>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/rs/projects/${id}/edit`)}
            >
              编辑
            </Button>
            <Button
              variant="contained"
              startIcon={<ScienceIcon />}
              component={Link}
              to="/rs/experiments/create"
            >
              新建试验
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* 项目概览卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                项目描述
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {project.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ScheduleIcon color="action" />
                    <Typography variant="body2">
                      开始日期: {project.start_date}
                    </Typography>
                  </div>
                </Grid>
                <Grid item xs={6}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ScheduleIcon color="action" />
                    <Typography variant="body2">
                      结束日期: {project.end_date || "未设定"}
                    </Typography>
                  </div>
                </Grid>
                <Grid item xs={6}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MoneyIcon color="action" />
                    <Typography variant="body2">
                      预算: {(project.budget / 10000).toFixed(1)} 万元
                    </Typography>
                  </div>
                </Grid>
                <Grid item xs={6}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <PeopleIcon color="action" />
                    <Typography variant="body2">
                      团队成员: {project.team_members.length} 人
                    </Typography>
                  </div>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                项目进度
              </Typography>
              <div
                style={{ textAlign: "center", paddingTop: 8, paddingBottom: 8 }}
              >
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {project.progress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={project.progress}
                  sx={{ mt: 2, height: 10, borderRadius: 5 }}
                />
              </div>
              <Divider sx={{ my: 2 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">已完成阶段</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {phases.filter((p) => p.status === "已完成").length}/
                    {phases.length}
                  </Typography>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">已完成里程碑</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {milestones.filter((m) => m.status === "已完成").length}/
                    {milestones.length}
                  </Typography>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">试验记录</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {experiments.length}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 详细信息标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="项目阶段" icon={<ScheduleIcon />} iconPosition="start" />
          <Tab label="里程碑" icon={<CheckCircleIcon />} iconPosition="start" />
          <Tab label="试验记录" icon={<ScienceIcon />} iconPosition="start" />
          <Tab label="团队成员" icon={<PeopleIcon />} iconPosition="start" />
          <Tab
            label="文档资料"
            icon={<DescriptionIcon />}
            iconPosition="start"
          />
        </Tabs>

        <div style={{ padding: 12 }}>
          {/* 项目阶段 */}
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>阶段名称</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>进度</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>结束日期</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phases.map((phase) => (
                    <TableRow key={phase.id} hover>
                      <TableCell>{phase.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={phase.status}
                          size="small"
                          color={getStatusColor(phase.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={phase.progress}
                            sx={{ width: 80 }}
                          />
                          <Typography variant="body2">
                            {phase.progress}%
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell>{phase.start_date}</TableCell>
                      <TableCell>{phase.end_date || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 里程碑 */}
          {activeTab === 1 && (
            <Timeline position="alternate">
              {milestones.map((milestone) => (
                <TimelineItem key={milestone.id}>
                  <TimelineSeparator>
                    <TimelineDot
                      color={
                        milestone.status === "已完成" ? "success" : "primary"
                      }
                    >
                      {milestone.status === "已完成" ? (
                        <CheckCircleIcon />
                      ) : (
                        <WarningIcon />
                      )}
                    </TimelineDot>
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {milestone.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        目标日期: {milestone.target_date}
                      </Typography>
                      {milestone.actual_date && (
                        <Typography variant="body2" color="success.main">
                          完成日期: {milestone.actual_date}
                        </Typography>
                      )}
                      <Chip
                        label={milestone.status}
                        size="small"
                        color={getStatusColor(milestone.status)}
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}

          {/* 试验记录 */}
          {activeTab === 2 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>试验名称</TableCell>
                    <TableCell>阶段</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>实验员</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {experiments.map((exp) => (
                    <TableRow key={exp.id} hover>
                      <TableCell>{exp.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={exp.phase}
                          size="small"
                          color={getPhaseColor(exp.phase)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={exp.status}
                          size="small"
                          color={getStatusColor(exp.status)}
                        />
                      </TableCell>
                      <TableCell>{exp.experimenter}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          to={`/rs/experiments/${exp.id}`}
                        >
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 团队成员 */}
          {activeTab === 3 && (
            <List>
              <ListItem>
                <ListItemIcon>
                  <Avatar>{project.leader[0]}</Avatar>
                </ListItemIcon>
                <ListItemText primary={project.leader} secondary="项目负责人" />
                <Chip label="负责人" color="primary" size="small" />
              </ListItem>
              {project.team_members.map((member, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Avatar>{member[0]}</Avatar>
                  </ListItemIcon>
                  <ListItemText primary={member} secondary="团队成员" />
                  <Chip label="成员" variant="outlined" size="small" />
                </ListItem>
              ))}
            </List>
          )}

          {/* 文档资料 */}
          {activeTab === 4 && (
            <List>
              <ListItem button>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText primary="项目立项报告" secondary="2024-01-20" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText primary="技术方案设计书" secondary="2024-03-15" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary="小试阶段总结报告"
                  secondary="2024-06-30"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary="中试阶段进度报告"
                  secondary="2024-08-15"
                />
              </ListItem>
            </List>
          )}
        </div>
      </Paper>
    </Container>
  );
};

export default RsProjectDetailPage;
