import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  X as XIcon,
} from "lucide-react";
import {
  reportApi,
  type ReportSubscription,
  type ReportTemplate,
  type CreateSubscriptionRequest,
  type UpdateSubscriptionRequest,
  type SubscriptionFrequency,
} from "@/api/report";

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "quarterly", label: "每季度" },
];

const ReportSubscriptionPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<ReportSubscription[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSubscription, setCurrentSubscription] =
    useState<ReportSubscription | null>(null);

  const [formData, setFormData] = useState<
    CreateSubscriptionRequest | UpdateSubscriptionRequest
  >({
    template_id: "",
    user_id: "",
    email: "",
    frequency: "weekly",
    enabled: true,
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchTemplates();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await reportApi.listSubscriptions();
      if (response.success && response.data) {
        setSubscriptions(response.data);
      } else {
        setError(response.message || "获取订阅列表失败");
      }
    } catch (err) {
      setError("获取订阅列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await reportApi.listTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err) {
      console.error("获取报表模板失败", err);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditMode(false);
    setCurrentSubscription(null);
    setFormData({
      template_id: "",
      user_id: "",
      email: "",
      frequency: "weekly",
      enabled: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (subscription: ReportSubscription) => {
    setEditMode(true);
    setCurrentSubscription(subscription);
    setFormData({
      template_id: subscription.template_id,
      user_id: subscription.user_id,
      email: subscription.email,
      frequency: subscription.frequency,
      enabled: subscription.enabled,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      template_id: "",
      user_id: "",
      email: "",
      frequency: "weekly",
      enabled: true,
    });
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    try {
      if (editMode && currentSubscription) {
        const response = await reportApi.updateSubscription(
          currentSubscription.id,
          formData as UpdateSubscriptionRequest,
        );
        if (response.success) {
          setDialogOpen(false);
          fetchSubscriptions();
        } else {
          setError(response.message || "更新订阅失败");
        }
      } else {
        const response = await reportApi.createSubscription(
          formData as CreateSubscriptionRequest,
        );
        if (response.success) {
          setDialogOpen(false);
          fetchSubscriptions();
        } else {
          setError(response.message || "创建订阅失败");
        }
      }
    } catch (err) {
      setError(editMode ? "更新订阅失败" : "创建订阅失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个订阅吗？")) return;
    setError("");
    try {
      const response = await reportApi.deleteSubscription(id);
      if (response.success) {
        fetchSubscriptions();
      } else {
        setError(response.message || "删除订阅失败");
      }
    } catch (err) {
      setError("删除订阅失败");
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setError("");
    try {
      const response = await reportApi.updateSubscription(id, {
        enabled: !currentEnabled,
      });
      if (response.success) {
        fetchSubscriptions();
      } else {
        setError(response.message || "切换订阅状态失败");
      }
    } catch (err) {
      setError("切换订阅状态失败");
    }
  };

  const getFrequencyLabel = (frequency: SubscriptionFrequency) => {
    return (
      FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
            报表订阅管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理报表订阅，设置订阅者、订阅方式和订阅频率
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<PlusIcon />}
          onClick={handleOpenCreateDialog}
        >
          新建订阅
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>报表模板</TableCell>
                  <TableCell>用户ID</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>订阅频率</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1">加载中...</Typography>
                    </TableCell>
                  </TableRow>
                ) : subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1">暂无订阅</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        {subscription.template_name || subscription.template_id}
                      </TableCell>
                      <TableCell>{subscription.user_id}</TableCell>
                      <TableCell>{subscription.email || "-"}</TableCell>
                      <TableCell>
                        {getFrequencyLabel(subscription.frequency)}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={subscription.enabled}
                              onChange={() =>
                                handleToggle(
                                  subscription.id,
                                  subscription.enabled,
                                )
                              }
                              color={
                                subscription.enabled ? "success" : "default"
                              }
                            />
                          }
                          label={subscription.enabled ? "已启用" : "已禁用"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(subscription.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="编辑">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleOpenEditDialog(subscription)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(subscription.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editMode ? "编辑订阅" : "新建订阅"}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>报表模板</InputLabel>
              <Select
                value={
                  (formData as CreateSubscriptionRequest).template_id as string
                }
                onChange={(e) =>
                  handleFormChange("template_id", e.target.value)
                }
                label="报表模板"
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="用户ID"
              value={(formData as CreateSubscriptionRequest).user_id as string}
              onChange={(e) => handleFormChange("user_id", e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="邮箱"
              value={formData.email as string}
              onChange={(e) => handleFormChange("email", e.target.value)}
              fullWidth
              type="email"
              placeholder="接收报表的邮箱地址"
            />
            <FormControl fullWidth required>
              <InputLabel>订阅频率</InputLabel>
              <Select
                value={formData.frequency as SubscriptionFrequency}
                onChange={(e) => handleFormChange("frequency", e.target.value)}
                label="订阅频率"
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={
                    ((formData as CreateSubscriptionRequest)
                      .enabled as boolean) || false
                  }
                  onChange={(e) =>
                    handleFormChange("enabled", e.target.checked)
                  }
                />
              }
              label="启用订阅"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? "保存" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReportSubscriptionPage;
