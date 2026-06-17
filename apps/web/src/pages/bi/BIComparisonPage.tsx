import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
} from "@mui/material";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ExportButton from "@/components/ExportButton";

interface ComparisonRow {
  id: string;
  comparisonItem: string;
  indicatorA: number;
  indicatorB: number;
  difference: number;
  changeRate: number;
}

const mockComparisonData: ComparisonRow[] = [
  {
    id: "1",
    comparisonItem: "研发项目数",
    indicatorA: 120,
    indicatorB: 145,
    difference: 25,
    changeRate: 20.83,
  },
  {
    id: "2",
    comparisonItem: "实验室样品数",
    indicatorA: 2450,
    indicatorB: 2800,
    difference: 350,
    changeRate: 14.29,
  },
  {
    id: "3",
    comparisonItem: "质量合格率(%)",
    indicatorA: 97.8,
    indicatorB: 98.5,
    difference: 0.7,
    changeRate: 0.72,
  },
  {
    id: "4",
    comparisonItem: "安全风险数",
    indicatorA: 125,
    indicatorB: 98,
    difference: -27,
    changeRate: -21.6,
  },
  {
    id: "5",
    comparisonItem: "供应商数量",
    indicatorA: 280,
    indicatorB: 310,
    difference: 30,
    changeRate: 10.71,
  },
  {
    id: "6",
    comparisonItem: "生产批次",
    indicatorA: 450,
    indicatorB: 520,
    difference: 70,
    changeRate: 15.56,
  },
  {
    id: "7",
    comparisonItem: "检验完成率(%)",
    indicatorA: 92.5,
    indicatorB: 95.8,
    difference: 3.3,
    changeRate: 3.57,
  },
  {
    id: "8",
    comparisonItem: "成本支出(万元)",
    indicatorA: 850,
    indicatorB: 780,
    difference: -70,
    changeRate: -8.24,
  },
];

const BIComparisonPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonRow[]>([]);
  const [filteredData, setFilteredData] = useState<ComparisonRow[]>([]);
  const [timeRange, setTimeRange] = useState<string>("2024H1");
  const [comparisonDimension, setComparisonDimension] =
    useState<string>("halfYear");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setTimeout(() => {
      setData(mockComparisonData);
      setFilteredData(mockComparisonData);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    let filtered = [...data];
    if (timeRange !== "all") {
      filtered = filtered;
    }
    setFilteredData(filtered);
    setPage(0);
  }, [timeRange, comparisonDimension, data]);

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportData = filteredData.map((item) => ({
    对比项: item.comparisonItem,
    指标A: item.indicatorA,
    指标B: item.indicatorB,
    差异: item.difference,
    变化率: `${item.changeRate.toFixed(2)}%`,
  }));

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="text" size="small" onClick={() => navigate(-1)}>
            <ArrowLeft sx={{ width: 20, height: 20 }} />
          </Button>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "grey.800" }}
            >
              数据对比分析
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
              对比不同时间或维度的业务指标
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ExportButton
            data={exportData}
            columns={["对比项", "指标A", "指标B", "差异", "变化率"]}
            filename="bi-comparison-data"
          />
          <Button variant="outlined" onClick={() => navigate("/bi/dashboard")}>
            返回数据大屏
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Filter sx={{ color: "grey.500" }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "grey.700" }}
            >
              筛选条件
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>时间范围</InputLabel>
              <Select
                value={timeRange}
                label="时间范围"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="all">全部时间</MenuItem>
                <MenuItem value="2024H1">2024上半年</MenuItem>
                <MenuItem value="2024H2">2024下半年</MenuItem>
                <MenuItem value="2023">2023年</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>对比维度</InputLabel>
              <Select
                value={comparisonDimension}
                label="对比维度"
                onChange={(e) => setComparisonDimension(e.target.value)}
              >
                <MenuItem value="halfYear">半年度对比</MenuItem>
                <MenuItem value="quarterly">季度对比</MenuItem>
                <MenuItem value="monthly">月度对比</MenuItem>
                <MenuItem value="yearly">年度对比</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="对比数据表" subheader="指标A与指标B对比分析" />
        <CardContent>
          <Paper sx={{ overflow: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                    对比项
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                    指标A
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                    指标B
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                    差异
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                    变化率
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {row.comparisonItem}
                      </TableCell>
                      <TableCell>{row.indicatorA.toLocaleString()}</TableCell>
                      <TableCell>{row.indicatorB.toLocaleString()}</TableCell>
                      <TableCell
                        sx={{
                          color:
                            row.difference > 0
                              ? "error.main"
                              : row.difference < 0
                                ? "success.main"
                                : "grey.600",
                          fontWeight: 500,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {row.difference > 0 ? (
                            <TrendingUp size={14} />
                          ) : row.difference < 0 ? (
                            <TrendingDown size={14} />
                          ) : (
                            <Minus size={14} />
                          )}
                          {row.difference > 0 ? "+" : ""}
                          {row.difference.toLocaleString()}
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          color:
                            row.changeRate > 0
                              ? "error.main"
                              : row.changeRate < 0
                                ? "success.main"
                                : "grey.600",
                          fontWeight: 500,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {row.changeRate > 0 ? (
                            <TrendingUp size={14} />
                          ) : row.changeRate < 0 ? (
                            <TrendingDown size={14} />
                          ) : (
                            <Minus size={14} />
                          )}
                          {row.changeRate > 0 ? "+" : ""}
                          {row.changeRate.toFixed(2)}%
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50]}
              component="div"
              count={filteredData.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="每页行数"
            />
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BIComparisonPage;
