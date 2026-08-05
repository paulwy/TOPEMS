import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { BarChart3, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { GroupByConfig, DataSourceField } from '../types';
import { AGGREGATE_OPTIONS } from '../types';

interface GroupPanelProps {
  groupBy: GroupByConfig[];
  availableFields: DataSourceField[];
  showGroupPanel: boolean;
  setShowGroupPanel: (show: boolean) => void;
  handleAddGroupBy: () => void;
  handleUpdateGroupBy: (index: number, updates: Partial<GroupByConfig>) => void;
  handleRemoveGroupBy: (index: number) => void;
}

export const GroupPanel: React.FC<GroupPanelProps> = ({
  groupBy,
  availableFields,
  showGroupPanel,
  setShowGroupPanel,
  handleAddGroupBy,
  handleUpdateGroupBy,
  handleRemoveGroupBy,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setShowGroupPanel(!showGroupPanel)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart3 sx={{ width: 18, height: 18, color: 'success.main' }} />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            分组设置
          </Typography>
          {groupBy.length > 0 && (
            <Chip
              size='small'
              label={groupBy.length}
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <IconButton size='small'aria-label="展开" >
          {showGroupPanel ? (
            <ChevronUp sx={{ width: 18, height: 18 }} />
          ) : (
            <ChevronDown sx={{ width: 18, height: 18 }} />
          )}
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {showGroupPanel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groupBy.map((group, index) => (
            <Box
              key={index}
              sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel size='small'>分组字段</InputLabel>
                <Select
                  size='small'
                  value={group.fieldId}
                  label='分组字段'
                  onChange={(e) => {
                    const field = availableFields.find((f) => f.id === e.target.value);
                    handleUpdateGroupBy(index, {
                      fieldId: e.target.value,
                      fieldName: field?.name || '',
                    });
                  }}
                >
                  {availableFields.map((f) => (
                    <MenuItem
                      key={f.id}
                      value={f.id}
                    >
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel size='small'>聚合方式</InputLabel>
                <Select
                  size='small'
                  value={group.aggregate || ''}
                  label='聚合方式'
                  onChange={(e) =>
                    handleUpdateGroupBy(index, {
                      aggregate: e.target.value as GroupByConfig['aggregate'],
                    })
                  }
                >
                  <MenuItem value=''>无</MenuItem>
                  {AGGREGATE_OPTIONS.map((op) => (
                    <MenuItem
                      key={op.value}
                      value={op.value}
                    >
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                size='small'
                onClick={() => handleRemoveGroupBy(index)}
              aria-label="删除"
              >
                <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
              </IconButton>
            </Box>
          ))}
          <Button
            size='small'
            startIcon={<Plus sx={{ width: 14, height: 14 }} />}
            onClick={handleAddGroupBy}
            disabled={availableFields.length === 0}
          >
            添加分组
          </Button>
        </Box>
      )}
    </Box>
  );
};
