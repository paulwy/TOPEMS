import React from 'react';
import { RefreshCw, Plus, FileJson } from 'lucide-react';
import {
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
} from '@mui/material';

interface ToolbarProps {
  activeTab: number;
  searchKeyword: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onRefetchData: () => void;
  onRefetchTasks: () => void;
  onRefetchRules: () => void;
  onCreateData: () => void;
  onCreateTask: () => void;
  onCreateRule: () => void;
  onShowParseTest: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTab,
  searchKeyword,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onRefetchData,
  onRefetchTasks,
  onRefetchRules,
  onCreateData,
  onCreateTask,
  onCreateRule,
  onShowParseTest,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          size='small'
          placeholder='搜索...'
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ width: 250 }}
        />
        <FormControl
          size='small'
          sx={{ width: 150 }}
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={statusFilter}
            label='状态'
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <MenuItem value=''>全部</MenuItem>
            <MenuItem value='pending'>待解析</MenuItem>
            <MenuItem value='success'>成功</MenuItem>
            <MenuItem value='failed'>失败</MenuItem>
            <MenuItem value='running'>运行中</MenuItem>
            <MenuItem value='stopped'>已停止</MenuItem>
            <MenuItem value='active'>启用</MenuItem>
            <MenuItem value='inactive'>禁用</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        {activeTab === 0 && (
          <>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={18} />}
              onClick={onRefetchData}
            >
              刷新
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateData}
            >
              新增数据
            </Button>
          </>
        )}
        {activeTab === 1 && (
          <>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={18} />}
              onClick={onRefetchTasks}
            >
              刷新
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateTask}
            >
              新建任务
            </Button>
          </>
        )}
        {activeTab === 2 && (
          <>
            <Button
              variant='outlined'
              startIcon={<FileJson size={18} />}
              onClick={onShowParseTest}
            >
              解析测试
            </Button>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={18} />}
              onClick={onRefetchRules}
            >
              刷新
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateRule}
            >
              新建规则
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default Toolbar;
