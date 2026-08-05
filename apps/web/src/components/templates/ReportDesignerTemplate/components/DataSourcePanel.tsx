import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { Database, Globe, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import type { DataSourceType, DataSourceConfig } from '../types';

interface DataSourcePanelProps {
  dataSource: DataSourceConfig;
  showDataSourcePanel: boolean;
  setShowDataSourcePanel: (show: boolean) => void;
  handleDataSourceTypeChange: (type: DataSourceType) => void;
  handleTableSelect: (tableName: string) => void;
  handleApiSelect: (apiName: string) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  availableTables: { name: string; label: string }[];
  availableApis: { name: string; label: string; url: string }[];
}

export const DataSourcePanel: React.FC<DataSourcePanelProps> = ({
  dataSource,
  showDataSourcePanel,
  setShowDataSourcePanel,
  handleDataSourceTypeChange,
  handleTableSelect,
  handleApiSelect,
  handleFileUpload,
  availableTables,
  availableApis,
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
        onClick={() => setShowDataSourcePanel(!showDataSourcePanel)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Database sx={{ width: 18, height: 18, color: 'primary.main' }} />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            数据源
          </Typography>
        </Box>
        <IconButton size='small'aria-label="展开" >
          {showDataSourcePanel ? (
            <ChevronUp sx={{ width: 18, height: 18 }} />
          ) : (
            <ChevronDown sx={{ width: 18, height: 18 }} />
          )}
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {showDataSourcePanel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <RadioGroup
            row
            value={dataSource.type}
            onChange={(e) => handleDataSourceTypeChange(e.target.value as DataSourceType)}
            sx={{ flexWrap: 'wrap', gap: 2 }}
          >
            <FormControlLabel
              value='database'
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Database sx={{ width: 16, height: 16 }} />
                  <span>数据库表</span>
                </Box>
              }
            />
            <FormControlLabel
              value='api'
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Globe sx={{ width: 16, height: 16 }} />
                  <span>API接口</span>
                </Box>
              }
            />
            <FormControlLabel
              value='excel'
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileSpreadsheet sx={{ width: 16, height: 16 }} />
                  <span>Excel上传</span>
                </Box>
              }
            />
          </RadioGroup>

          {dataSource.type === 'database' && (
            <FormControl fullWidth>
              <InputLabel>选择数据表</InputLabel>
              <Select
                value={dataSource.tableName || ''}
                label='选择数据表'
                onChange={(e) => handleTableSelect(e.target.value)}
              >
                {availableTables.map((table) => (
                  <MenuItem
                    key={table.name}
                    value={table.name}
                  >
                    {table.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {dataSource.type === 'api' && (
            <FormControl fullWidth>
              <InputLabel>选择API接口</InputLabel>
              <Select
                value={dataSource.apiUrl || ''}
                label='选择API接口'
                onChange={(e) =>
                  handleApiSelect(availableApis.find((a) => a.url === e.target.value)?.name || '')
                }
              >
                {availableApis.map((api) => (
                  <MenuItem
                    key={api.name}
                    value={api.url}
                  >
                    {api.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {dataSource.type === 'excel' && (
            <Box
              sx={{
                p: 3,
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'grey.300',
                borderRadius: 3,
                textAlign: 'center',
              }}
            >
              <input
                type='file'
                accept='.xlsx,.xls,.csv'
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id='excel-upload'
              />
              <label
                htmlFor='excel-upload'
                style={{ cursor: 'pointer' }}
              >
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                >
                  <FileSpreadsheet sx={{ width: 48, height: 48, color: 'grey.400' }} />
                  <Typography
                    variant='body1'
                    sx={{ color: 'grey.600' }}
                  >
                    点击上传Excel文件
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.400' }}
                  >
                    支持 .xlsx, .xls, .csv 格式
                  </Typography>
                </Box>
              </label>
            </Box>
          )}

          {dataSource.name && (
            <Chip
              label={`已选择: ${dataSource.name}`}
              color='success'
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};
