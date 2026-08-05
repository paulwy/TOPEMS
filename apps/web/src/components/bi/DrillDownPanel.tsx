import { useState } from 'react';
import { X, ChevronRight, Search, Filter, RefreshCw } from 'lucide-react';
import {
  CardHeader,
  CardContent,
  TextField,
  Typography,
  Chip,
  Paper,
  Button,
  useTheme,
} from '@mui/material';

interface DrillDownData extends Record<string, any> {
  id: string;
}

interface DrillDownColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

interface DrillDownPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: DrillDownData[];
  columns: DrillDownColumn[];
  onRowClick?: (row: DrillDownData) => void;
}

export function DrillDownPanel({
  isOpen,
  onClose,
  title,
  data,
  columns,
  onRowClick,
}: DrillDownPanelProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredData = data.filter((row) => {
    return Object.values(row).some((value) => {
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      })
    : filteredData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'action.selected',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      <Paper
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 800,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        elevation={3}
      >
        <CardHeader
          sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
          action={
            <Button
              variant='text'
              size='small'
              onClick={onClose}
            >
              <X style={{ width: 20, height: 20 }} />
            </Button>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ChevronRight style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 'semibold' }}
            >
              {title}
            </Typography>
            <Chip
              variant='outlined'
              size='small'
              label={`${data.length} 条记录`}
            />
          </div>
        </CardHeader>

        <div
          style={{
            padding: 16,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: theme.palette.text.secondary,
              }}
            />
            <TextField
              placeholder='搜索...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              sx={{ width: '100%', input: { paddingLeft: 40 } }}
            />
          </div>
          <Button
            variant='outlined'
            size='small'
            sx={{ textTransform: 'none' }}
          >
            <Filter style={{ width: 16, height: 16, marginRight: 4 }} />
            筛选
          </Button>
          <Button
            variant='outlined'
            size='small'
            sx={{ textTransform: 'none' }}
          >
            <RefreshCw style={{ width: 16, height: 16, marginRight: 4 }} />
            刷新
          </Button>
        </div>

        <CardContent sx={{ flex: 1, overflow: 'auto' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: theme.palette.grey[50],
                    position: 'sticky',
                    top: 0,
                  }}
                >
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => handleSort(column.key)}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'text.secondary',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {column.label}
                        {sortKey === column.key && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (onRowClick) {
                        e.currentTarget.style.backgroundColor = 'grey.50';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={{ padding: '12px 16px', color: 'grey.700' }}
                      >
                        {column.format ? column.format(row[column.key]) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Paper>
    </div>
  );
}
