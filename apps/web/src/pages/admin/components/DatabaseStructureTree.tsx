/**
 * @done V79 Phase 2 split
 * Database structure tree view component - displays database table list
 */
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
import { Table, Search } from 'lucide-react';
import type { TableInfo, TableDetail } from '@/api/system';
interface DatabaseStructureTreeProps {
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredTables: TableInfo[];
  selectedTable: TableDetail | null;
  onTableSelect: (table: TableDetail) => void;
}
export const DatabaseStructureTree: React.FC<DatabaseStructureTreeProps> = ({
  loading,
  searchQuery,
  onSearchChange,
  filteredTables,
  selectedTable,
  onTableSelect,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        position: { md: 'sticky' },
        top: { md: 16 },
      }}
    >
      <TextField
        fullWidth
        size='small'
        placeholder={i18n.t('admin.database_structure_page.attr_f5f091')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search
                  size={16}
                  color='grey.400'
                />
              </InputAdornment>
            ),
          },
        }}
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: 600,
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.400',
              borderRadius: 3,
            },
          }}
        >
          <Stack spacing={0.5}>
            {filteredTables.map((table) => {
              const isSelected = selectedTable?.table_name === table.table_name;
              return (
                <Box
                  key={table.table_name}
                  onClick={() => {
                    onTableSelect({
                      table_name: table.table_name,
                      schema_name: 'public',
                      columns: [],
                    });
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.dark' : 'transparent',
                    bgcolor: isSelected ? 'primary.light' : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.light' : 'grey.100',
                    },
                  }}
                >
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Table
                      size={16}
                      color={isSelected ? 'primary.dark' : 'grey.400'}
                    />
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'primary.dark' : 'text.primary',
                        wordBreak: 'break-all',
                      }}
                    >
                      {table.table_name}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};