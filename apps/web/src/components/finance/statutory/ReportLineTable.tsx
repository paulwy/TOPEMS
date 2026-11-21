import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ReportLineItem } from '@/types/finance';
import { formatMoney, lineIndent } from './reportFormat';

export interface ReportSection {
  key: string;
  title: string;
  rows: ReportLineItem[];
  totalLabel: string;
  total: string;
}

interface ReportLineTableProps {
  sections: ReportSection[];
  ariaLabel: string;
  summary?: { label: string; value: string };
}

/** 按 line_code / line_name / line_level / sort_no / amount 渲染，level 决定缩进。 */
export function ReportLineTable({ sections, ariaLabel, summary }: ReportLineTableProps) {
  const { t } = useTranslation();
  return (
    <Paper variant='outlined'>
      <TableContainer sx={{ maxHeight: 720 }}>
        <Table
          size='small'
          stickyHeader
          aria-label={ariaLabel}
        >
          <TableHead>
            <TableRow>
              <TableCell>{t('finance.statutory.lineTable.project')}</TableCell>
              <TableCell align='right'>{t('finance.statutory.lineTable.amount')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sections.map((section) => (
              <SectionRows
                key={section.key}
                section={section}
              />
            ))}
            {summary && (
              <TableRow sx={{ bgcolor: 'action.selected' }}>
                <TableCell sx={{ fontWeight: 700 }}>{summary.label}</TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 700 }}
                >
                  {formatMoney(summary.value)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function SectionRows({ section }: { section: ReportSection }) {
  const { t } = useTranslation();
  return (
    <>
      <TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell colSpan={2}>
          <Typography variant='subtitle2'>{section.title}</Typography>
        </TableCell>
      </TableRow>

      {section.rows.length === 0 && (
        <TableRow>
          <TableCell>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ pl: 2 }}
            >
              {t('finance.statutory.lineTable.noMovement')}
            </Typography>
          </TableCell>
          <TableCell align='right'>{formatMoney(section.total)}</TableCell>
        </TableRow>
      )}

      {section.rows.map((row) => (
        <TableRow key={row.line_code}>
          <TableCell>
            <Box sx={{ pl: lineIndent(row.line_level) }}>
              <Typography variant={row.line_level === 1 ? 'body2' : 'caption'}>
                {row.line_name}
              </Typography>
            </Box>
          </TableCell>
          <TableCell align='right'>{formatMoney(row.amount)}</TableCell>
        </TableRow>
      ))}

      <TableRow sx={{ '& td': { fontWeight: 600, borderTop: 1, borderColor: 'divider' } }}>
        <TableCell>{section.totalLabel}</TableCell>
        <TableCell align='right'>{formatMoney(section.total)}</TableCell>
      </TableRow>
    </>
  );
}
