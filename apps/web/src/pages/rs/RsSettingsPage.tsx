import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from "@mui/material";
import {
  GitBranch,
  Settings,
  Code2,
  Plug,
  Save,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Check,
  X,
  ArrowRight,
  Layers,
} from "lucide-react";

interface RepoConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  enabled: boolean;
}

interface PipelineConfig {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
}

interface QualityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected";
}

const RsSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("repo");
  const [repos, setRepos] = useState<RepoConfig[]>([
    {
      id: "1",
      name: "frontend-app",
      url: "git@example.com:frontend-app.git",
      type: "gitlab",
      enabled: true,
    },
    {
      id: "2",
      name: "backend-api",
      url: "git@example.com:backend-api.git",
      type: "gitlab",
      enabled: true,
    },
    {
      id: "3",
      name: "mobile-app",
      url: "git@example.com:mobile-app.git",
      type: "github",
      enabled: false,
    },
  ]);
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([
    { id: "1", name: "前端构建流水线", trigger: "push", enabled: true },
    { id: "2", name: "后端构建流水线", trigger: "push", enabled: true },
    { id: "3", name: "移动端构建流水线", trigger: "tag", enabled: true },
    { id: "4", name: "定时回归测试", trigger: "schedule", enabled: false },
  ]);
  const [qualityRules, setQualityRules] = useState<QualityRule[]>([
    {
      id: "1",
      name: "代码覆盖率门槛",
      description: "单元测试覆盖率不低于80%",
      enabled: true,
    },
    {
      id: "2",
      name: "禁止提交敏感信息",
      description: "检测密码、密钥等敏感信息",
      enabled: true,
    },
    {
      id: "3",
      name: "代码风格检查",
      description: "使用ESLint进行代码风格检查",
      enabled: true,
    },
    {
      id: "4",
      name: "安全漏洞扫描",
      description: "检测已知安全漏洞",
      enabled: false,
    },
  ]);
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "1", name: "GitLab", type: "code", status: "connected" },
    { id: "2", name: "Jenkins", type: "ci", status: "connected" },
    { id: "3", name: "SonarQube", type: "quality", status: "connected" },
    { id: "4", name: "Jira", type: "project", status: "disconnected" },
    { id: "5", name: "Slack", type: "notification", status: "disconnected" },
  ]);
  const [newRepoDialogOpen, setNewRepoDialogOpen] = useState(false);
  const [newPipelineDialogOpen, setNewPipelineDialogOpen] = useState(false);
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false);
  const [newIntegrationDialogOpen, setNewIntegrationDialogOpen] =
    useState(false);
  const [newRepoForm, setNewRepoForm] = useState({
    name: "",
    url: "",
    type: "gitlab",
  });
  const [newPipelineForm, setNewPipelineForm] = useState({
    name: "",
    trigger: "push",
  });
  const [newRuleForm, setNewRuleForm] = useState({ name: "", description: "" });

  const tabs = [
    { id: "repo", label: "仓库管理", icon: <GitBranch size={18} /> },
    { id: "cicd", label: "CI/CD配置", icon: <Layers size={18} /> },
    { id: "quality", label: "代码规范", icon: <Code2 size={18} /> },
    { id: "integration", label: "集成设置", icon: <Plug size={18} /> },
  ];

  const handleToggleRepo = (id: string) => {
    setRepos(
      repos.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const handleTogglePipeline = (id: string) => {
    setPipelines(
      pipelines.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  const handleToggleRule = (id: string) => {
    setQualityRules(
      qualityRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      ),
    );
  };

  const handleDeleteRepo = (id: string) => {
    setRepos(repos.filter((r) => r.id !== id));
  };

  const handleDeletePipeline = (id: string) => {
    setPipelines(pipelines.filter((p) => p.id !== id));
  };

  const handleDeleteRule = (id: string) => {
    setQualityRules(qualityRules.filter((r) => r.id !== id));
  };

  const handleAddRepo = () => {
    const newRepo: RepoConfig = {
      id: String(Date.now()),
      name: newRepoForm.name,
      url: newRepoForm.url,
      type: newRepoForm.type,
      enabled: true,
    };
    setRepos([...repos, newRepo]);
    setNewRepoDialogOpen(false);
    setNewRepoForm({ name: "", url: "", type: "gitlab" });
  };

  const handleAddPipeline = () => {
    const newPipeline: PipelineConfig = {
      id: String(Date.now()),
      name: newPipelineForm.name,
      trigger: newPipelineForm.trigger,
      enabled: true,
    };
    setPipelines([...pipelines, newPipeline]);
    setNewPipelineDialogOpen(false);
    setNewPipelineForm({ name: "", trigger: "push" });
  };

  const handleAddRule = () => {
    const newRule: QualityRule = {
      id: String(Date.now()),
      name: newRuleForm.name,
      description: newRuleForm.description,
      enabled: true,
    };
    setQualityRules([...qualityRules, newRule]);
    setNewRuleDialogOpen(false);
    setNewRuleForm({ name: "", description: "" });
  };

  const renderRepoSettings = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          仓库列表
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          size="small"
          onClick={() => setNewRepoDialogOpen(true)}
        >
          添加仓库
        </Button>
      </Box>
      <List>
        {repos.map((repo) => (
          <Paper key={repo.id} sx={{ mb: 1 }}>
            <ListItem>
              <ListItemIcon>
                <GitBranch size={20} color="#3b82f6" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {repo.name}
                    <Chip label={repo.type} size="small" variant="outlined" />
                  </Box>
                }
                secondary={repo.url}
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={repo.enabled}
                      onChange={() => handleToggleRepo(repo.id)}
                    />
                  }
                  label=""
                />
                <IconButton
                  size="small"
                  onClick={() => handleDeleteRepo(repo.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
    </Stack>
  );

  const renderCICDSettings = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          流水线配置
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          size="small"
          onClick={() => setNewPipelineDialogOpen(true)}
        >
          添加流水线
        </Button>
      </Box>
      <List>
        {pipelines.map((pipeline) => (
          <Paper key={pipeline.id} sx={{ mb: 1 }}>
            <ListItem>
              <ListItemIcon>
                <Layers size={20} color="#3b82f6" />
              </ListItemIcon>
              <ListItemText
                primary={pipeline.name}
                secondary={`触发方式: ${pipeline.trigger}`}
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={pipeline.enabled}
                      onChange={() => handleTogglePipeline(pipeline.id)}
                    />
                  }
                  label=""
                />
                <IconButton
                  size="small"
                  onClick={() => handleDeletePipeline(pipeline.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        CI/CD 全局设置
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="代码提交后自动触发构建"
          />
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="构建失败时发送通知"
          />
          <TextField
            label="构建超时时间(分钟)"
            type="number"
            size="small"
            defaultValue={30}
            sx={{ width: 200 }}
          />
        </Stack>
      </Paper>
    </Stack>
  );

  const renderQualitySettings = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          质量规则
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          size="small"
          onClick={() => setNewRuleDialogOpen(true)}
        >
          添加规则
        </Button>
      </Box>
      <List>
        {qualityRules.map((rule) => (
          <Paper key={rule.id} sx={{ mb: 1 }}>
            <ListItem>
              <ListItemIcon>
                <Code2 size={20} color="#3b82f6" />
              </ListItemIcon>
              <ListItemText primary={rule.name} secondary={rule.description} />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                    />
                  }
                  label=""
                />
                <IconButton
                  size="small"
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        代码规范配置
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="最小代码覆盖率"
            type="number"
            size="small"
            defaultValue={80}
            slotProps={{
              input: {
                endAdornment: <Typography variant="body2">%</Typography>,
              },
            }}
            sx={{ width: 200 }}
          />
          <TextField
            label="最大代码行数限制"
            type="number"
            size="small"
            defaultValue={500}
            slotProps={{
              input: {
                endAdornment: <Typography variant="body2">行</Typography>,
              },
            }}
            sx={{ width: 200 }}
          />
        </Stack>
      </Paper>
    </Stack>
  );

  const renderIntegrationSettings = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          第三方集成
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          size="small"
          onClick={() => setNewIntegrationDialogOpen(true)}
        >
          添加集成
        </Button>
      </Box>
      <List>
        {integrations.map((integration) => (
          <Paper key={integration.id} sx={{ mb: 1 }}>
            <ListItem>
              <ListItemIcon>
                <Plug
                  size={20}
                  color={
                    integration.status === "connected" ? "#3b82f6" : "#9e9e9e"
                  }
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {integration.name}
                    <Chip
                      label={
                        integration.status === "connected" ? "已连接" : "未连接"
                      }
                      size="small"
                      color={
                        integration.status === "connected"
                          ? "success"
                          : "default"
                      }
                    />
                  </Box>
                }
                secondary={`类型: ${integration.type}`}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    integration.status === "connected" ? (
                      <X size={14} />
                    ) : (
                      <ExternalLink size={14} />
                    )
                  }
                >
                  {integration.status === "connected" ? "断开" : "连接"}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{ ...{ color: "#3b82f6" }, fontWeight: "bold" }}
          >
            研发设置
          </Typography>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
          >
            保存设置
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 3 }}>
          <Paper sx={{ width: 240, p: 2 }}>
            <List>
              {tabs.map((tab) => (
                <ListItemButton
                  key={tab.id}
                  selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      bgcolor: "#3b82f6",
                      color: "white",
                      "& .MuiListItemIcon-root": {
                        color: "white",
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                  {activeTab === tab.id && <ArrowRight size={16} />}
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Paper sx={{ flex: 1, p: 3 }}>
            {activeTab === "repo" && renderRepoSettings()}
            {activeTab === "cicd" && renderCICDSettings()}
            {activeTab === "quality" && renderQualitySettings()}
            {activeTab === "integration" && renderIntegrationSettings()}
          </Paper>
        </Box>
      </Container>

      <Dialog
        open={newRepoDialogOpen}
        onClose={() => setNewRepoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加仓库</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="仓库名称"
              fullWidth
              value={newRepoForm.name}
              onChange={(e) =>
                setNewRepoForm({ ...newRepoForm, name: e.target.value })
              }
            />
            <TextField
              label="仓库地址"
              fullWidth
              value={newRepoForm.url}
              onChange={(e) =>
                setNewRepoForm({ ...newRepoForm, url: e.target.value })
              }
            />
            <TextField
              label="类型"
              fullWidth
              value={newRepoForm.type}
              onChange={(e) =>
                setNewRepoForm({ ...newRepoForm, type: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRepoDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleAddRepo}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newPipelineDialogOpen}
        onClose={() => setNewPipelineDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加流水线</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="流水线名称"
              fullWidth
              value={newPipelineForm.name}
              onChange={(e) =>
                setNewPipelineForm({ ...newPipelineForm, name: e.target.value })
              }
            />
            <TextField
              label="触发方式"
              fullWidth
              value={newPipelineForm.trigger}
              onChange={(e) =>
                setNewPipelineForm({
                  ...newPipelineForm,
                  trigger: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPipelineDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleAddPipeline}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newRuleDialogOpen}
        onClose={() => setNewRuleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加质量规则</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="规则名称"
              fullWidth
              value={newRuleForm.name}
              onChange={(e) =>
                setNewRuleForm({ ...newRuleForm, name: e.target.value })
              }
            />
            <TextField
              label="规则描述"
              fullWidth
              multiline
              rows={3}
              value={newRuleForm.description}
              onChange={(e) =>
                setNewRuleForm({ ...newRuleForm, description: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRuleDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleAddRule}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newIntegrationDialogOpen}
        onClose={() => setNewIntegrationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加集成</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            选择要集成的第三方服务并配置连接参数。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewIntegrationDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsSettingsPage;
