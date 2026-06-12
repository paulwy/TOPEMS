import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import {
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
} from "@mui/icons-material";

interface Material {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: number;
  unit: string;
  status: string;
  location: string;
}

const RsMaterialListPage: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const mockMaterials: Material[] = [
      {
        id: "1",
        name: "催化剂原料A",
        code: "MAT-001",
        category: "原料",
        stock: 500,
        unit: "kg",
        status: "充足",
        location: "仓库A-01",
      },
      {
        id: "2",
        name: "载体材料B",
        code: "MAT-002",
        category: "原料",
        stock: 200,
        unit: "kg",
        status: "正常",
        location: "仓库A-02",
      },
      {
        id: "3",
        name: "助剂C",
        code: "MAT-003",
        category: "助剂",
        stock: 50,
        unit: "kg",
        status: "偏低",
        location: "仓库B-01",
      },
      {
        id: "4",
        name: "标准试剂",
        code: "MAT-004",
        category: "试剂",
        stock: 100,
        unit: "瓶",
        status: "正常",
        location: "实验室C-01",
      },
      {
        id: "5",
        name: "粘结剂D",
        code: "MAT-005",
        category: "辅料",
        stock: 30,
        unit: "kg",
        status: "不足",
        location: "仓库B-02",
      },
    ];
    setMaterials(mockMaterials);
  }, []);

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (
    status: string,
  ): "success" | "warning" | "error" | "default" | "info" => {
    switch (status) {
      case "充足":
        return "success";
      case "正常":
        return "info";
      case "偏低":
        return "warning";
      case "不足":
        return "error";
      default:
        return "default";
    }
  };

  const stats = {
    total: materials.length,
    sufficient: materials.filter((m) => m.status === "充足").length,
    low: materials.filter((m) => m.status === "偏低" || m.status === "不足")
      .length,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <div style={{ marginBottom: 12 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <div>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              物料管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理研发物料、库存监控、物料申请
            </Typography>
          </div>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增物料
          </Button>
        </Stack>
      </div>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <div>
                  <Typography color="text.secondary" variant="body2">
                    物料总数
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                </div>
                <InventoryIcon color="primary" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <div>
                  <Typography color="text.secondary" variant="body2">
                    库存充足
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {stats.sufficient}
                  </Typography>
                </div>
                <InventoryIcon color="success" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <div>
                  <Typography color="text.secondary" variant="body2">
                    库存不足
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {stats.low}
                  </Typography>
                </div>
                <InventoryIcon color="error" fontSize="large" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          placeholder="搜索物料名称或编码..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>物料编码</TableCell>
              <TableCell>物料名称</TableCell>
              <TableCell>类别</TableCell>
              <TableCell>库存</TableCell>
              <TableCell>单位</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>存放位置</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMaterials
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((material) => (
                <TableRow key={material.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {material.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={material.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{material.stock}</TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell>
                    <Chip
                      label={material.status}
                      size="small"
                      color={getStatusColor(material.status)}
                    />
                  </TableCell>
                  <TableCell>{material.location}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined">
                      申请
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredMaterials.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>
    </Container>
  );
};

export default RsMaterialListPage;
