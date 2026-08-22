import React, { useState, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { Search, Filter, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { alpha } from '@mui/material/styles';

interface PivotData {
  [key: string]: string | number | boolean;
}

interface PivotConfig {
  data: PivotData[];
  rows: string[];
  cols: string[];
  values: string[];
  aggregator?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  title?: string;
  onExport?: () => void;
  onRefresh?: () => void;
}

const _aggregators = {
  sum: (values: number[]) => values.reduce((a, b) => a + b, 0),
  count: (values: number[]) => values.length,
  avg: (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length,
  min: (values: number[]) => Math.min(...values),
  max: (values: number[]) => Math.max(...values),
};

const aggregatorLabels: Record<string, string> = {
  sum: i18n.t('components.pivot_table.k0'),
  count: i18n.t('components.pivot_table.k1'),
  avg: i18n.t('components.pivot_table.k2'),
  min: i18n.t('components.pivot_table.k3'),
  max: i18n.t('components.pivot_table.k4'),
};

export const PivotTable: React.FC<PivotConfig> = ({
  data,
  rows,
  cols,
  values,
  aggregator = 'sum',
  title,
  onExport,
  onRefresh,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const theme = useTheme();
  const [filterText, setFilterText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeAggregator, setActiveAggregator] = useState(aggregator);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    const lowerText = filterText.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) => String(val).toLowerCase().includes(lowerText))
    );
  }, [data, filterText]);

  const pivotResult = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return { rows: [], cols: [], cells: {} };

    const rowValues = [...new Set(filteredData.map((d) => d[rows[0]])).values()];
    const colValues = [...new Set(filteredData.map((d) => d[cols[0]])).values()];

    const cells: Record<string, Record<string, number>> = {};

    rowValues.forEach((row) => {
      cells[row as string] = {};
      colValues.forEach((col) => {
        cells[row as string][col as string] = 0;
      });
    });

    filteredData.forEach((item) => {
      const rowKey = item[rows[0]] as string;
      const colKey = item[cols[0]] as string;
      const value = values[0] ? (item[values[0]] as number) : 1;

      if (cells[rowKey] && cells[rowKey][colKey] !== undefined) {
        cells[rowKey][colKey] += value;
      }
    });

    return { rows: rowValues, cols: colValues, cells };
  }, [filteredData, rows, cols, values]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return pivotResult.rows;

    return [...pivotResult.rows].sort((a, b) => {
      const aVal = pivotResult.cells[a as string]?.[pivotResult.cols[0] as string] || 0;
      const bVal = pivotResult.cells[b as string]?.[pivotResult.cols[0] as string] || 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [pivotResult, sortConfig]);

  const rowTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sortedRows.forEach((row) => {
      const rowKey = String(row);
      let sum = 0;
      pivotResult.cols.forEach((col) => {
        const colKey = String(col);
        const val = pivotResult.cells[rowKey]?.[colKey];
        if (typeof val === 'number') {
          sum += val;
        }
      });
      totals[rowKey] = sum;
    });
    return totals;
  }, [sortedRows, pivotResult]);

  const colTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pivotResult.cols.forEach((col) => {
      const colKey = String(col);
      let sum = 0;
      sortedRows.forEach((row) => {
        const rowKey = String(row);
        const val = pivotResult.cells[rowKey]?.[colKey];
        if (typeof val === 'number') {
          sum += val;
        }
      });
      totals[colKey] = sum;
    });
    return totals;
  }, [sortedRows, pivotResult]);

  const grandTotal = useMemo(() => {
    return Object.values(rowTotals).reduce((sum, val) => sum + val, 0);
  }, [rowTotals]);

  const toggleRow = (row: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(row)) {
        next.delete(row);
      } else {
        next.add(row);
      }
      return next;
    });
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 'lg',
          boxShadow: designTokens.shadows.sm,
          padding: 6,
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: theme.palette.grey[900],
              marginBottom: 4,
            }}
          >
            {title}
          </h3>
        )}
        <div style={{ color: 'text.muted', textAlign: 'center' }}>
          <svg
            width='48'
            height='48'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle
              cx='12'
              cy='12'
              r='10'
            />
            <line
              x1='12'
              y1='8'
              x2='12'
              y2='12'
            />
            <line
              x1='12'
              y1='16'
              x2='12.01'
              y2='16'
            />
          </svg>
          <p style={{ marginTop: 2 }}>{i18n.t('components.pivot_table.k5')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'common.white',
        borderRadius: 'lg',
        boxShadow: designTokens.shadows.sm,
        padding: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: theme.palette.grey[900],
            margin: 0,
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'grey.400',
              }}
            />
            <input
              type='text'
              placeholder={i18n.t('components.pivot_table.k0')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{
                padding: `6px 12px 6px ${designTokens.spacing.xl}px`,
                borderRadius: 6,
                border: '1px solid border.default',
                fontSize: 14,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'primary.light';
                e.target.style.boxShadow = `0 0 0 2px ${alpha(theme.palette.secondary.main, 0.2)}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'border.default';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: 6,
              borderRadius: 6,
              border: '1px solid border.default',
              backgroundColor: showFilters ? theme.palette.primary.light : theme.palette.grey[50],
              color: showFilters ? theme.palette.primary.light : theme.palette.grey[600],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Filter style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12 }}>{i18n.t('components.pivot_table.k6')}</span>
          </button>
          <select
            value={activeAggregator}
            onChange={(e) => setActiveAggregator(e.target.value as typeof activeAggregator)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid border.default',
              backgroundColor: theme.palette.grey[50],
              fontSize: 12,
              cursor: 'pointer',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'primary.light';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'border.default';
            }}
          >
            {Object.entries(aggregatorLabels).map(([key, label]) => (
              <option
                key={key}
                value={key}
              >
                {label}
              </option>
            ))}
          </select>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: 6,
                borderRadius: 6,
                border: '1px solid border.default',
                backgroundColor: theme.palette.grey[50],
                color: theme.palette.grey[600],
                cursor: 'pointer',
              }}
              title={i18n.t('components.pivot_table.k7')}
            >
              <RefreshCw style={{ width: 16, height: 16 }} />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              style={{
                padding: 6,
                borderRadius: 6,
                border: '1px solid border.default',
                backgroundColor: theme.palette.grey[50],
                color: theme.palette.grey[600],
                cursor: 'pointer',
              }}
              title={i18n.t('components.pivot_table.k8')}
            >
              <Download style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div
          style={{
            marginBottom: 4,
            padding: 3,
            backgroundColor: theme.palette.grey[50],
            borderRadius: 8,
            border: '1px solid border.default',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'grey.700',
              marginBottom: 8,
            }}
          >
            {i18n.t('components.pivot_table.k1')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {rows.map((row) => (
              <div key={row}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--mui-palette-text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {row}
                </div>
                <select
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    border: '1px solid border.default',
                    fontSize: 12,
                  }}
                >
                  <option value=''>{i18n.t('components.pivot_table.k9')}</option>
                  {[...new Set(data.map((d) => d[row]))].map((val) => (
                    <option
                      key={String(val)}
                      value={String(val)}
                    >
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {cols.map((col) => (
              <div key={col}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--mui-palette-text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {col}
                </div>
                <select
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    border: '1px solid border.default',
                    fontSize: 12,
                  }}
                >
                  <option value=''>{i18n.t('components.pivot_table.k10')}</option>
                  {[...new Set(data.map((d) => d[col]))].map((val) => (
                    <option
                      key={String(val)}
                      value={String(val)}
                    >
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '500px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: theme.palette.grey[50],
                  padding: `12px ${designTokens.spacing.md}px`,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'grey.700',
                  borderBottom: '2px solid border.default',
                  borderRight: '1px solid border.default',
                }}
              >
                {rows[0]}
              </th>
              {pivotResult.cols.map((col) => (
                <th
                  key={String(col)}
                  style={{
                    backgroundColor: theme.palette.grey[50],
                    padding: `12px ${designTokens.spacing.md}px`,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'grey.700',
                    borderBottom: '2px solid border.default',
                    borderRight:
                      col !== pivotResult.cols[pivotResult.cols.length - 1]
                        ? '1px solid border.default'
                        : 'none',
                  }}
                >
                  {col}
                </th>
              ))}
              <th
                style={{
                  backgroundColor: theme.palette.grey[100],
                  padding: `12px ${designTokens.spacing.md}px`,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: 'text.primary',
                  borderBottom: '2px solid border.default',
                }}
              >
                {i18n.t('components.pivot_table.k2')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <React.Fragment key={String(row)}>
                <tr style={{ borderBottom: '1px solid border.default' }}>
                  <td
                    style={{
                      cursor: 'pointer',
                      padding: `12px ${designTokens.spacing.md}px`,
                      fontWeight: 500,
                      color: 'text.primary',
                      borderRight: '1px solid border.default',
                    }}
                    onClick={() => {
                      handleSort(row as string);
                      toggleRow(row as string);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {expandedRows.has(row as string) ? (
                        <ChevronDown
                          sx={{ width: 14, height: 14, color: theme.palette.text.secondary }}
                        />
                      ) : (
                        <ChevronUp
                          sx={{ width: 14, height: 14, color: theme.palette.text.secondary }}
                        />
                      )}
                      {row}
                      {sortConfig?.key === row && (
                        <span
                          style={{
                            marginLeft: 2,
                            color: theme.palette.primary.light,
                            fontSize: 12,
                          }}
                        >
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </td>
                  {pivotResult.cols.map((col) => (
                    <td
                      key={String(col)}
                      style={{
                        padding: `12px ${designTokens.spacing.md}px`,
                        textAlign: 'right',
                        color: 'grey.600',
                        borderRight:
                          col !== pivotResult.cols[pivotResult.cols.length - 1]
                            ? '1px solid border.default'
                            : 'none',
                      }}
                    >
                      {typeof pivotResult.cells[row as string]?.[col as string] === 'number'
                        ? activeAggregator === 'avg'
                          ? pivotResult.cells[row as string]?.[col as string]?.toFixed(2)
                          : pivotResult.cells[row as string]?.[col as string]?.toLocaleString()
                        : pivotResult.cells[row as string]?.[col as string]}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: `12px ${designTokens.spacing.md}px`,
                      textAlign: 'right',
                      fontWeight: 600,
                      color: 'text.primary',
                      backgroundColor: theme.palette.grey[50],
                    }}
                  >
                    {typeof rowTotals[row as string] === 'number'
                      ? activeAggregator === 'avg'
                        ? rowTotals[row as string]?.toFixed(2)
                        : rowTotals[row as string]?.toLocaleString()
                      : rowTotals[row as string]}
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr style={{ backgroundColor: 'var(--mui-palette-grey-100)' }}>
              <td
                style={{
                  padding: `12px ${designTokens.spacing.md}px`,
                  fontWeight: 600,
                  color: 'text.primary',
                  borderRight: '1px solid border.default',
                }}
              >
                {i18n.t('components.pivot_table.k3')}
              </td>
              {pivotResult.cols.map((col) => (
                <td
                  key={String(col)}
                  style={{
                    padding: `12px ${designTokens.spacing.md}px`,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'text.primary',
                    borderRight:
                      col !== pivotResult.cols[pivotResult.cols.length - 1]
                        ? '1px solid border.default'
                        : 'none',
                  }}
                >
                  {typeof colTotals[col as string] === 'number'
                    ? activeAggregator === 'avg'
                      ? colTotals[col as string]?.toFixed(2)
                      : colTotals[col as string]?.toLocaleString()
                    : colTotals[col as string]}
                </td>
              ))}
              <td
                style={{
                  padding: `12px ${designTokens.spacing.md}px`,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: theme.palette.primary.light,
                  backgroundColor: theme.palette.secondary.light,
                }}
              >
                {typeof grandTotal === 'number'
                  ? activeAggregator === 'avg'
                    ? grandTotal.toFixed(2)
                    : grandTotal.toLocaleString()
                  : grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: '13px',
          color: 'grey.400',
          textAlign: 'right',
        }}
      >
        {i18n.t('components.pivot_table.k4')}: {aggregatorLabels[activeAggregator]} |{' '}
        {i18n.t('components.pivot_table.k5')}:{' '}
        {typeof grandTotal === 'number' ? grandTotal.toLocaleString() : grandTotal} |{' '}
        {i18n.t('components.pivot_table.k6')}: {filteredData.length}
      </div>
    </div>
  );
};

export default PivotTable;
