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
import i18n from '@/i18n';

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
          placeholder={i18n.t('pages.toolbar.k0')}
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ width: 250 }}
        />
        <FormControl
          size='small'
          sx={{ width: 150 }}
        >
          <InputLabel>{i18n.t('pages.toolbar.k0')}</InputLabel>
          <Select
            value={statusFilter}
            label={i18n.t('pages.toolbar.k1')}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <MenuItem value=''>{i18n.t('pages.toolbar.k2')}</MenuItem>
            <MenuItem value='pending'>{i18n.t('pages.toolbar.k3')}</MenuItem>
            <MenuItem value='success'>{i18n.t('pages.toolbar.k4')}</MenuItem>
            <MenuItem value='failed'>{i18n.t('pages.toolbar.k5')}</MenuItem>
            <MenuItem value='running'>{i18n.t('pages.toolbar.k6')}</MenuItem>
            <MenuItem value='stopped'>{i18n.t('pages.toolbar.k7')}</MenuItem>
            <MenuItem value='active'>{i18n.t('pages.toolbar.k8')}</MenuItem>
            <MenuItem value='inactive'>{i18n.t('pages.toolbar.k9')}</MenuItem>
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
              {i18n.t('pages.toolbar.k1')}
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateData}
            >
              {i18n.t('pages.toolbar.k2')}
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
              {i18n.t('pages.toolbar.k3')}
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateTask}
            >
              {i18n.t('pages.toolbar.k4')}
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
              {i18n.t('pages.toolbar.k5')}
            </Button>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={18} />}
              onClick={onRefetchRules}
            >
              {i18n.t('pages.toolbar.k6')}
            </Button>
            <Button
              variant='contained'
              startIcon={<Plus size={18} />}
              onClick={onCreateRule}
            >
              {i18n.t('pages.toolbar.k7')}
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default Toolbar;
