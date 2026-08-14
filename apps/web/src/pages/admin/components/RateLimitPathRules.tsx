import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { Plus, Trash2 } from 'lucide-react';
import type { PathRule } from '../hooks/useRateLimitConfig';
interface RateLimitPathRulesProps {
  path_rules: PathRule[];
  newPath: string;
  setNewPath: React.Dispatch<React.SetStateAction<string>>;
  newPathRequests: number;
  setNewPathRequests: React.Dispatch<React.SetStateAction<number>>;
  newPathWindow: number;
  setNewPathWindow: React.Dispatch<React.SetStateAction<number>>;
  onAddPath: () => void;
  onRemovePath: (path: string) => void;
}
export const RateLimitPathRules: React.FC<RateLimitPathRulesProps> = ({
  path_rules,
  newPath,
  setNewPath,
  newPathRequests,
  setNewPathRequests,
  newPathWindow,
  setNewPathWindow,
  onAddPath,
  onRemovePath,
}) => {
  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('admin.rate_limit_config_page.text_d6bf27')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label={i18n.t('admin.rate_limit_config.path_prefix')}
              size='small'
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder='/api/core/iam'
              sx={{ minWidth: 240 }}
            />
            <TextField
              label={i18n.t('admin.rate_limit_config.request_count')}
              type='number'
              size='small'
              value={newPathRequests}
              onChange={(e) => setNewPathRequests(Number(e.target.value) || 0)}
            />
            <TextField
              label={i18n.t('admin.rate_limit_config.window_seconds')}
              type='number'
              size='small'
              value={newPathWindow}
              onChange={(e) => setNewPathWindow(Number(e.target.value) || 1)}
            />
            <Button
              variant='contained'
              startIcon={<Plus size={16} />}
              onClick={onAddPath}
            >
              {i18n.t('admin.rate_limit_config_page.text_49818f')}
            </Button>
          </Box>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('admin.rate_limit_config.path_prefix')}</TableCell>
                  <TableCell>{i18n.t('admin.rate_limit_config.request_count')}</TableCell>
                  <TableCell>{i18n.t('admin.rate_limit_config.window_seconds')}</TableCell>
                  <TableCell align='right'>{i18n.t('admin.rate_limit_config.action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {path_rules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align='center'
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ py: 2 }}
                      >
                        {i18n.t('admin.rate_limit_config_page.text_4cb561')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  path_rules.map((rule) => (
                    <TableRow key={rule.path}>
                      <TableCell>
                        <Chip
                          label={rule.path}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>{rule.rule.requests}</TableCell>
                      <TableCell>{rule.rule.window_secs}</TableCell>
                      <TableCell align='right'>
                        <Tooltip title={i18n.t('admin.rate_limit_config.delete')}>
                          <IconButton
                            size='small'
                            onClick={() => onRemovePath(rule.path)}
                            aria-label={i18n.t('admin.rate_limit_path_rules.k0')}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Grid>
  );
};
export default RateLimitPathRules;