/**
 * @done V80 split
 * Row-level BI permission table: list, toggle, test, edit, delete.
 */
import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
import { CheckCircle2, Edit2, Trash2, Shield } from 'lucide-react';
import type { RowLevelPermission } from '@/api/bi';

interface BiPermissionRowLevelTableProps {
  permissions: RowLevelPermission[];
  loading: boolean;
  onToggle: (item: RowLevelPermission) => void;
  onTest: (item: RowLevelPermission) => void;
  onEdit: (item: RowLevelPermission) => void;
  onDelete: (id: string) => void;
}
const BiPermissionRowLevelTable: React.FC<BiPermissionRowLevelTableProps> = ({
  permissions,
  loading,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (permissions.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 12,
          color: 'text.secondary',
        }}
      >
        <Shield sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
        <Typography variant='h6'>{i18n.t('bi.bi_permission_page.text_33c90a')}</Typography>
        <Typography variant='body2'>{i18n.t('bi.bi_permission_page.text_02f836')}</Typography>
      </Box>
    );
  }
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_870802')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_e92734')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_3ca9ce')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_97d956')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_ee8ecb')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_3fea7c')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_2b6bc0')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {permissions.map((perm) => (
            <TableRow
              key={perm.id}
              hover
            >
              <TableCell>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {perm.name}
                  </Typography>
                  {perm.description && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {perm.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={perm.table_name}
                  size='small'
                  variant='outlined'
                />
              </TableCell>
              <TableCell>
                <Paper
                  variant='outlined'
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    bgcolor: 'grey.50',
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {perm.condition}
                </Paper>
              </TableCell>
              <TableCell>
                {perm.roles.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {perm.roles.slice(0, 2).map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    ))}
                    {perm.roles.length > 2 && (
                      <Chip
                        label={`+${perm.roles.length - 2}`}
                        size='small'
                        variant='outlined'
                      />
                    )}
                  </Box>
                ) : (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    -
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={`P${perm.priority}`}
                  size='small'
                  color='warning'
                />
              </TableCell>
              <TableCell>
                <FormControlLabel
                  control={
                    <Switch
                      size='small'
                      checked={perm.isEnabled}
                      onChange={() => onToggle(perm)}
                    />
                  }
                  label={
                    perm.isEnabled
                      ? ` + ${i18n.t('bi.bi_permission_page.active')} + `
                      : i18n.t('bi.bi_permission_page.inactive')
                  }
                  sx={{ m: 0 }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title={i18n.t('bi.bi_permission_page.test')}>
                  <IconButton
                    size='small'
                    onClick={() => onTest(perm)}
                    aria-label={i18n.t('bi.bi_permission_page.test')}
                  >
                    <CheckCircle2 size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('bi.bi_permission_page.edit')}>
                  <IconButton
                    size='small'
                    onClick={() => onEdit(perm)}
                    aria-label={i18n.t('bi.bi_permission_page.edit_1')}
                  >
                    <Edit2 size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('bi.bi_permission_page.delete')}>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => onDelete(perm.id)}
                    aria-label={i18n.t('bi.bi_permission_page.delete_1')}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default BiPermissionRowLevelTable;
