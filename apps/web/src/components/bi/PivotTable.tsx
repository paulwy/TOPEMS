import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react';

export interface PivotData {
  [key: string]: string | number | boolean;
}

export interface PivotConfig {
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
  sum: '求和',
  count: '计数',
  avg: '平均值',
  min: '最小值',
  max: '最大值',
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
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '24px',
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
              color: 'grey.900',
              marginBottom: '16px',
            }}
          >
            {title}
          </h3>
        )}
        <div style={{ color: '#94a3b8', textAlign: 'center' }}>
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
          <p style={{ marginTop: '8px' }}>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'grey.900',
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
                color: '#94a3b8',
              }}
            />
            <input
              type='text'
              placeholder='搜索...'
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{
                padding: '6px 12px 6px 32px',
                borderRadius: 6,
                border: '1px solid border.default',
                fontSize: 14,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'primary.light';
                e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
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
              backgroundColor: showFilters ? 'primary.light' : 'grey.50',
              color: showFilters ? 'primary.light' : 'grey.600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Filter style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12 }}>筛选</span>
          </button>
          <select
            value={activeAggregator}
            onChange={(e) => setActiveAggregator(e.target.value as typeof activeAggregator)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid border.default',
              backgroundColor: 'grey.50',
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
                backgroundColor: 'grey.50',
                color: 'grey.600',
                cursor: 'pointer',
              }}
              title='刷新'
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
                backgroundColor: 'grey.50',
                color: 'grey.600',
                cursor: 'pointer',
              }}
              title='导出'
            >
              <Download style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'grey.50',
            borderRadius: 8,
            border: '1px solid border.default',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#334155',
              marginBottom: 8,
            }}
          >
            筛选条件
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {rows.map((row) => (
              <div key={row}>
                <div style={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)', marginBottom: 4 }}>{row}</div>
                <select
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    border: '1px solid border.default',
                    fontSize: 12,
                  }}
                >
                  <option value=''>全部</option>
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
                <div style={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)', marginBottom: 4 }}>{col}</div>
                <select
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    border: '1px solid border.default',
                    fontSize: 12,
                  }}
                >
                  <option value=''>全部</option>
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
                  backgroundColor: 'grey.50',
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#334155',
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
                    backgroundColor: 'grey.50',
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#334155',
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
                  backgroundColor: 'grey.100',
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#1e293b',
                  borderBottom: '2px solid border.default',
                }}
              >
                总计
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
                      padding: '12px 16px',
                      fontWeight: 500,
                      color: '#1e293b',
                      borderRight: '1px solid border.default',
                    }}
                    onClick={() => {
                      handleSort(row as string);
                      toggleRow(row as string);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {expandedRows.has(row as string) ? (
                        <ChevronDown sx={{ width: 14, height: 14, color: 'text.secondary' }} />
                      ) : (
                        <ChevronUp sx={{ width: 14, height: 14, color: 'text.secondary' }} />
                      )}
                      {row}
                      {sortConfig?.key === row && (
                        <span
                          style={{
                            marginLeft: '8px',
                            color: 'primary.light',
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
                        padding: '12px 16px',
                        textAlign: 'right',
                        color: '#475569',
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
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#1e293b',
                      backgroundColor: 'grey.50',
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
                  padding: '12px 16px',
                  fontWeight: 600,
                  color: '#1e293b',
                  borderRight: '1px solid border.default',
                }}
              >
                总计
              </td>
              {pivotResult.cols.map((col) => (
                <td
                  key={String(col)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#1e293b',
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
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: 'primary.light',
                  backgroundColor: 'secondary.light',
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
          marginTop: '12px',
          fontSize: '13px',
          color: '#94a3b8',
          textAlign: 'right',
        }}
      >
        聚合方式: {aggregatorLabels[activeAggregator]} | 总计:{' '}
        {typeof grandTotal === 'number' ? grandTotal.toLocaleString() : grandTotal} | 数据行数:{' '}
        {filteredData.length}
      </div>
    </div>
  );
};

export default PivotTable;
