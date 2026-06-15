import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
} from "lucide-react";

interface Formula {
  id: string;
  name: string;
  code: string;
  version: string;
  project_name: string;
  status: string;
  created_by: string;
  created_at: string;
}

const RsFormulaListPage: React.FC = () => {
  const navigate = useNavigate();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const mockFormulas: Formula[] = [
      {
        id: "1",
        name: "配方A-001",
        code: "FM-2024-001",
        version: "v1.0",
        project_name: "新型催化剂研发项目",
        status: "已发布",
        created_by: "张三",
        created_at: "2024-03-15",
      },
      {
        id: "2",
        name: "配方A-002",
        code: "FM-2024-002",
        version: "v2.0",
        project_name: "新型催化剂研发项目",
        status: "测试中",
        created_by: "李四",
        created_at: "2024-05-20",
      },
      {
        id: "3",
        name: "配方B-001",
        code: "FM-2024-003",
        version: "v1.0",
        project_name: "聚合物改性研究",
        status: "已发布",
        created_by: "王五",
        created_at: "2024-04-10",
      },
      {
        id: "4",
        name: "配方C-001",
        code: "FM-2024-004",
        version: "v1.5",
        project_name: "环保材料开发",
        status: "已发布",
        created_by: "赵六",
        created_at: "2024-06-01",
      },
      {
        id: "5",
        name: "配方D-001",
        code: "FM-2024-005",
        version: "v0.1",
        project_name: "纳米材料合成工艺",
        status: "草稿",
        created_by: "孙七",
        created_at: "2024-07-15",
      },
    ];
    setFormulas(mockFormulas);
  }, []);

  const filteredFormulas = formulas.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (
    status: string,
  ): "success" | "warning" | "primary" | "default" => {
    switch (status) {
      case "已发布":
        return "success";
      case "测试中":
        return "warning";
      case "草稿":
        return "default";
      default:
        return "primary";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <div style={{ marginBottom: 12 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
              配方管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理研发配方、版本控制、配方发布
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            to="/rs/formulas/create"
          >
            新增配方
          </Button>
        </Stack>
      </div>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          placeholder="搜索配方名称或编码..."
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
              <TableCell>配方编码</TableCell>
              <TableCell>配方名称</TableCell>
              <TableCell>版本</TableCell>
              <TableCell>所属项目</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建人</TableCell>
              <TableCell>创建日期</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFormulas
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((formula) => (
                <TableRow key={formula.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {formula.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{formula.name}</TableCell>
                  <TableCell>
                    <Chip label={formula.version} size="small" />
                  </TableCell>
                  <TableCell>{formula.project_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={formula.status}
                      size="small"
                      color={getStatusColor(formula.status)}
                    />
                  </TableCell>
                  <TableCell>{formula.created_by}</TableCell>
                  <TableCell>{formula.created_at}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
                      <Tooltip title="查看">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/rs/formulas/${formula.id}`)}
                        >
                          <Eye />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/rs/formulas/${formula.id}/edit`)
                          }
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error">
                          <Trash2 />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredFormulas.length}
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

export default RsFormulaListPage;
