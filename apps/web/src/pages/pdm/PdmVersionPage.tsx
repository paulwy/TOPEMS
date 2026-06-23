import React, { useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  GitBranch,
  Plus,
  Check,
  Clock,
  User,
  Tag,
  Archive,
  ArrowRight,
  Save,
  X,
} from "lucide-react";

interface Version {
  id: string;
  versionNumber: string;
  title: string;
  description: string;
  status: "draft" | "published" | "deprecated";
  type: "major" | "minor" | "patch";
  createdAt: string;
  createdBy: string;
  changes: string[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  currentVersion: string;
  versions: number;
  status: "active" | "archived";
}

export const PdmVersionPage: React.FC = () => {
  const [selectedDocument, setSelectedDocument] = useState("DOC001");
  const [openDialog, setOpenDialog] = useState(false);

  const documents: Document[] = [
    {
      id: "DOC001",
      name: "产品设计文档",
      type: "设计文档",
      currentVersion: "V2.1",
      versions: 5,
      status: "active",
    },
    {
      id: "DOC002",
      name: "工艺流程图",
      type: "流程图",
      currentVersion: "V1.3",
      versions: 3,
      status: "active",
    },
    {
      id: "DOC003",
      name: "质量标准文档",
      type: "标准文档",
      currentVersion: "V1.0",
      versions: 1,
      status: "active",
    },
    {
      id: "DOC004",
      name: "旧版设计文档",
      type: "设计文档",
      currentVersion: "V1.0",
      versions: 2,
      status: "archived",
    },
  ];

  const versions: Version[] = [
    {
      id: "1",
      versionNumber: "V2.1",
      title: "性能优化",
      description: "优化产品性能参数，提升生产效率",
      status: "published",
      type: "minor",
      createdAt: "2024-01-15 10:00:00",
      createdBy: "张三",
      changes: ["优化材料配比", "改进生产工艺", "更新质量标准"],
    },
    {
      id: "2",
      versionNumber: "V2.0",
      title: "重大升级",
      description: "产品全面升级，新增多项功能",
      status: "published",
      type: "major",
      createdAt: "2024-01-10 09:00:00",
      createdBy: "李四",
      changes: ["新增材料选项", "优化配方设计", "改进包装设计"],
    },
    {
      id: "3",
      versionNumber: "V1.3",
      title: "Bug修复",
      description: "修复已知问题",
      status: "deprecated",
      type: "patch",
      createdAt: "2024-01-05 14:00:00",
      createdBy: "王五",
      changes: ["修复计算错误", "更新文档"],
    },
    {
      id: "4",
      versionNumber: "V1.2",
      title: "功能增强",
      description: "增强现有功能",
      status: "deprecated",
      type: "minor",
      createdAt: "2024-01-01 10:00:00",
      createdBy: "赵六",
      changes: ["增加材料规格", "优化界面"],
    },
    {
      id: "5",
      versionNumber: "V1.1",
      title: "初始版本",
      description: "产品初始版本",
      status: "deprecated",
      type: "major",
      createdAt: "2023-12-25 09:00:00",
      createdBy: "张三",
      changes: ["初始版本发布"],
    },
  ];

  const getVersionTypeColor = (type: string) => {
    switch (type) {
      case "major":
        return "error";
      case "minor":
        return "warning";
      case "patch":
        return "success";
      default:
        return "default";
    }
  };

  const getVersionTypeLabel = (type: string) => {
    switch (type) {
      case "major":
        return "重大版本";
      case "minor":
        return "次要版本";
      case "patch":
        return "补丁版本";
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "deprecated":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <div>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            版本管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理文档和产品的版本历史与变更记录
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => setOpenDialog(true)}
        >
          创建新版本
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="选择文档" />
            <CardContent>
              <FormControl fullWidth>
                <Select
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  sx={{ minHeight: 48 }}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Tag size={16} />
                        <div>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {doc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.type} - 当前版本: {doc.currentVersion}
                          </Typography>
                        </div>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                版本总数
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {versions.length} 个
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                当前版本
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                {versions[0]?.versionNumber}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader title="版本历史" />
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {versions.map((version, index) => (
              <Box
                key={version.id}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  backgroundColor:
                    version.status === "published" ? "success.50" : "grey.50",
                  borderLeft:
                    version.status === "published"
                      ? "3px solid"
                      : "3px solid transparent",
                  borderColor:
                    version.status === "published" ? "success.main" : undefined,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <GitBranch size={20} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {version.versionNumber}
                    </Typography>
                    <Chip
                      size="small"
                      label={getVersionTypeLabel(version.type)}
                      color={getVersionTypeColor(version.type)}
                    />
                    {version.status === "published" && (
                      <Chip
                        size="small"
                        label="当前版本"
                        color="success"
                        icon={<Check size={14} />}
                      />
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={
                      version.status === "published"
                        ? "已发布"
                        : version.status === "draft"
                          ? "草稿"
                          : "已废弃"
                    }
                    color={getStatusColor(version.status)}
                  />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                  {version.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {version.description}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  {version.changes.map((change, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={change}
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Clock size={14} />
                    <Typography variant="caption">
                      {version.createdAt}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <User size={14} />
                    <Typography variant="caption">
                      {version.createdBy}
                    </Typography>
                  </Box>
                </Box>
                {version.status !== "published" && (
                  <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                    <Button size="small">查看详情</Button>
                    <Button size="small">对比差异</Button>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>创建新版本</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
            <TextField label="版本标题" placeholder="输入版本标题" fullWidth />
            <TextField
              label="版本描述"
              placeholder="输入版本描述"
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>版本类型</InputLabel>
              <Select defaultValue="minor" label="版本类型">
                <MenuItem value="major">重大版本 (Major)</MenuItem>
                <MenuItem value="minor">次要版本 (Minor)</MenuItem>
                <MenuItem value="patch">补丁版本 (Patch)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="变更内容"
              placeholder="输入变更内容，每行一项"
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained">创建版本</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmVersionPage;
