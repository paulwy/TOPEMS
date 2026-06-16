import { Grid } from "@/components/Grid";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack,
} from "@mui/material";
import { Save, X, Plus, Trash2 } from "lucide-react";

interface Component {
  name: string;
  percentage: number;
  unit: string;
  notes: string;
}

const RsFormulaCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    project_id: "",
    description: "",
    status: "草稿",
  });

  const [components, setComponents] = useState<Component[]>([
    { name: "", percentage: 0, unit: "%", notes: "" },
  ]);

  const projects = [
    { id: "1", name: "新型催化剂研发项目" },
    { id: "2", name: "聚合物改性研究" },
    { id: "3", name: "环保材料开发" },
  ];

  const statuses = ["草稿", "测试中", "已发布", "已废弃"];

  const handleAddComponent = () => {
    setComponents([
      ...components,
      { name: "", percentage: 0, unit: "%", notes: "" },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleComponentChange = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newComponents = [...components];
    (newComponents[index] as unknown as Record<string, string | number>)[
      field
    ] = value;
    setComponents(newComponents);
  };

  const handleSubmit = () => {
    console.log("提交数据:", { ...formData, components });
    navigate("/rs/formulas");
  };

  const handleCancel = () => {
    navigate("/rs/formulas");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <div style={{ marginBottom: 12 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
          {isEdit ? "编辑配方" : "新增配方"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? "修改配方信息" : "创建新的研发配方"}
        </Typography>
      </div>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="配方名称"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="配方编码"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="例如: FM-2024-001"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>所属项目</InputLabel>
              <Select
                value={formData.project_id}
                label="所属项目"
                onChange={(e) =>
                  setFormData({ ...formData, project_id: e.target.value })
                }
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label="状态"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="配方描述"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              配方组成
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>组分名称</TableCell>
                    <TableCell>占比</TableCell>
                    <TableCell>单位</TableCell>
                    <TableCell>备注</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {components.map((comp, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={comp.name}
                          onChange={(e) =>
                            handleComponentChange(index, "name", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={comp.percentage}
                          onChange={(e) =>
                            handleComponentChange(
                              index,
                              "percentage",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={comp.unit}
                          onChange={(e) =>
                            handleComponentChange(index, "unit", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={comp.notes}
                          onChange={(e) =>
                            handleComponentChange(
                              index,
                              "notes",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveComponent(index)}
                        >
                          <Trash2 />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              startIcon={<Plus />}
              onClick={handleAddComponent}
              sx={{ mt: 2 }}
            >
              添加组分
            </Button>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ mb: 2 }} />
            <Stack
              direction="row"
              spacing={2}
              sx={{ justifyContent: "flex-end" }}
            >
              <Button
                variant="outlined"
                startIcon={<X />}
                onClick={handleCancel}
              >
                取消
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSubmit}
              >
                {isEdit ? "保存修改" : "创建配方"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RsFormulaCreatePage;
