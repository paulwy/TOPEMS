/**
 * @done V80 split
 * Data-level BI permission table (read-only list with edit/delete placeholders).
 */
import React from 'react';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import { Edit2, Trash2, Database } from 'lucide-react';
import type { DataPermissionRule } from '@/api/bi';

export interface BiPermissionDataTableProps {
  permissions: DataPermissionRule[];
  getResourceTypeLabel: (type: string) => string;
  getPermissionTypeLabel: (type: string) => string;
  getPermissionTypeColor: (type: string) => 'primary' | 'success' | 'warning' | 'error';
}
const BiPermissionDataTable: React.FC<BiPermissionDataTableProps> = ({
  permissions,
  getResourceTypeLabel,
  getPermissionTypeLabel,
  getPermissionTypeColor,
}) => {
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
        <Database sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
        <Typography variant='h6'>{i18n.t('bi.bi_permission_page.text_10510a')}</Typography>
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
              {i18n.t('bi.bi_permission_page.text_14871a')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_1463e1')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_464f3d')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_1fd02a')}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {i18n.t('bi.bi_permission_page.text_eca37c')}
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
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {perm.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={getResourceTypeLabel(perm.resource_type)}
                  size='small'
                  variant='outlined'
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={getPermissionTypeLabel(perm.permission_type)}
                  size='small'
                  color={getPermissionTypeColor(perm.permission_type)}
                />
              </TableCell>
              <TableCell>
                {perm.role_ids.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {perm.role_ids.slice(0, 2).map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    ))}
                    {perm.role_ids.length > 2 && (
                      <Chip
                        label={`+${perm.role_ids.length - 2}`}
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
                {perm.user_ids.length > 0 ? (
                  i18n.t('bi.bi_permission_page.text_54dd4b', { count: perm.user_ids.length })
                ) : (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    -
                  </Typography>
                )}
              </TableCell>
              <TableCell>{new Date(perm.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Tooltip title={i18n.t('bi.bi_permission_page.edit')}>
                  <IconButton
                    size='small'
                    aria-label={i18n.t('bi.bi_permission_page.edit_2')}
                  >
                    <Edit2 size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('bi.bi_permission_page.delete')}>
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={i18n.t('bi.bi_permission_page.delete_2')}
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
export default BiPermissionDataTable;
