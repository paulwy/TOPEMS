import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Autocomplete,
  Alert,
  Divider,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import { Save, X, Plus } from "lucide-react";

const RsProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    project_type: "新产品研发",
    leader: "",
    team_members: [] as string[],
    start_date: "",
    end_date: "",
    budget: "",
    risk_level: "中",
    priority: "普通",
    tags: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const projectTypes = [
    "新产品研发",
    "工艺改进",
    "配方优化",
    "技术攻关",
    "设备改造",
    "其他",
  ];

  const riskLevels = ["低", "中", "高", "极高"];
  const priorities = ["普通", "重要", "紧急", "战略级"];

  const availableMembers = [
    "张三",
    "李四",
    "王五",
    "赵六",
    "孙七",
    "周八",
    "吴九",
    "郑十",
  ];

  const availableTags = [
    "催化剂",
    "聚合物",
    "纳米材料",
    "环保",
    "新能源",
    "生物医药",
    "电子材料",
  ];

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "项目名称不能为空";
    }
    if (!formData.code.trim()) {
      newErrors.code = "项目编码不能为空";
    }
    if (!formData.leader.trim()) {
      newErrors.leader = "项目负责人不能为空";
    }
    if (!formData.start_date) {
      newErrors.start_date = "开始日期不能为空";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    // 提交表单数据
    console.log("提交数据:", formData);
    navigate("/rs/projects");
  };

  const handleCancel = () => {
    navigate("/rs/projects");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 12 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
          {isEdit ? "编辑研发项目" : "新建研发项目"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit
            ? "修改项目基本信息和配置"
            : "创建新的研发项目，设置基本信息和团队"}
        </Typography>
      </div>

      {/* 表单 */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* 基本信息 */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="项目名称"
              required
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
              placeholder="请输入项目名称"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="项目编码"
              required
              value={formData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              error={Boolean(errors.code)}
              helperText={errors.code || "例如: RS-2024-001"}
              placeholder="请输入项目编码"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="项目描述"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="请输入项目描述，包括目标、背景、预期成果等"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>项目类型</InputLabel>
              <Select
                value={formData.project_type}
                label="项目类型"
                onChange={(e) =>
                  handleInputChange("project_type", e.target.value)
                }
              >
                {projectTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="项目负责人"
              required
              value={formData.leader}
              onChange={(e) => handleInputChange("leader", e.target.value)}
              error={Boolean(errors.leader)}
              helperText={errors.leader}
              placeholder="请输入负责人姓名"
            />
          </Grid>

          {/* 时间和预算 */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              时间和预算
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="开始日期"
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => handleInputChange("start_date", e.target.value)}
              error={Boolean(errors.start_date)}
              helperText={errors.start_date}
              LabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="结束日期"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange("end_date", e.target.value)}
              LabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="预算金额"
              type="number"
              value={formData.budget}
              onChange={(e) => handleInputChange("budget", e.target.value)}
              placeholder="请输入预算金额"
              InputProps={{
                endAdornment: <Typography variant="body2">元</Typography>,
               }}
            />
          </Grid>

          {/* 风险和优先级 */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              风险评估
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>风险等级</InputLabel>
              <Select
                value={formData.risk_level}
                label="风险等级"
                onChange={(e) =>
                  handleInputChange("risk_level", e.target.value)
                }
              >
                {riskLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={formData.priority}
                label="优先级"
                onChange={(e) => handleInputChange("priority", e.target.value)}
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 团队成员 */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              团队成员
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              multiple
              options={availableMembers}
              value={formData.team_members}
              onChange={(_, newValue) =>
                handleInputChange("team_members", newValue)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="团队成员"
                  placeholder="选择团队成员"
                />
              )}
            />
          </Grid>

          {/* 标签 */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              项目标签
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={formData.tags}
              onChange={(_, newValue) => handleInputChange("tags", newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="项目标签"
                  placeholder="添加标签"
                />
              )}
            />
          </Grid>

          {/* 操作按钮 */}
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<X />}
                onClick={handleCancel}
              >
                取消
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
              >
                {isEdit ? "保存修改" : "创建项目"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RsProjectCreatePage;
