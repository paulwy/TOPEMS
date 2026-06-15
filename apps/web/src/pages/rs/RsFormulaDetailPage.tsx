import React from "react";
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
  Stack,
} from "@mui/material";
import { Edit, History } from "lucide-react";

const RsFormulaDetailPage: React.FC = () => {
  const formula = {
    id: "1",
    name: "配方A-001",
    code: "FM-2024-001",
    version: "v2.0",
    project_name: "新型催化剂研发项目",
    status: "测试中",
    description: "新型催化剂配方，包含主要活性成分和载体材料",
    created_by: "张三",
    created_at: "2024-03-15",
    updated_at: "2024-05-20",
  };

  const components = [
    { name: "活性成分A", percentage: 15, unit: "%", notes: "主要催化成分" },
    { name: "载体材料B", percentage: 60, unit: "%", notes: "提供结构支撑" },
    { name: "助剂C", percentage: 5, unit: "%", notes: "提高稳定性" },
    { name: "粘结剂D", percentage: 10, unit: "%", notes: "成型粘结" },
    { name: "其他", percentage: 10, unit: "%", notes: "其他添加剂" },
  ];

  const versions = [
    {
      version: "v2.0",
      date: "2024-05-20",
      changes: "优化活性成分比例，提高催化效率",
    },
    { version: "v1.5", date: "2024-04-15", changes: "调整载体材料配比" },
    { version: "v1.0", date: "2024-03-15", changes: "初始配方版本" },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <div style={{ marginBottom: 12 }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {formula.name}
              </Typography>
              <Chip label={formula.version} color="primary" />
              <Chip label={formula.status} color="warning" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              编码: {formula.code} | 项目: {formula.project_name}
            </Typography>
          </div>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<History />}>
              版本历史
            </Button>
            <Button variant="contained" startIcon={<Edit />}>
              编辑
            </Button>
          </Stack>
        </Stack>
      </div>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                配方描述
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formula.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                配方组成
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>组分名称</TableCell>
                      <TableCell>占比</TableCell>
                      <TableCell>备注</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {components.map((comp, index) => (
                      <TableRow key={index}>
                        <TableCell>{comp.name}</TableCell>
                        <TableCell>
                          {comp.percentage}
                          {comp.unit}
                        </TableCell>
                        <TableCell>{comp.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                版本历史
              </Typography>
              <Stack spacing={2}>
                {versions.map((v, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Chip label={v.version} size="small" />
                      <Typography variant="caption">{v.date}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {v.changes}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RsFormulaDetailPage;
