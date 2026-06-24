import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const HR = () => {
  const employees = [
    { id: 1, name: '张三', department: '技术部', position: '高级工程师', status: '在职' },
    { id: 2, name: '李四', department: '销售部', position: '销售经理', status: '在职' },
    { id: 3, name: '王五', department: '人事部', position: 'HR主管', status: '在职' },
    { id: 4, name: '赵六', department: '财务部', position: '会计', status: '在职' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        人力资源管理
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>部门</TableCell>
              <TableCell>职位</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.position}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HR;