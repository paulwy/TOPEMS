/**
 * 数据导出组件
 * 支持导出 Excel、CSV、PDF 格式，支持选择导出字段和自定义文件名
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Download, FileSpreadsheet, FileText, File, ChevronDown, Settings, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============

/**
 * 导出格式类型
 */
export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

/**
 * 导出字段配置
 */
export interface ExportField {
  /** 字段键名，对应数据对象的属性名 */
  key: string;
  /** 显示标题，导出时作为列标题 */
  title: string;
  /** 是否选中（默认选中） */
  selected?: boolean;
  /** 字段宽度（仅 Excel 有效），单位为字符数 */
  width?: number;
}

/**
 * 数据导出组件属性
 */
export interface DataExportProps {
  /** 数据源，数组形式，每个元素为一个对象 */
  data: Record<string, unknown>[];
  /** 可导出的字段配置 */
  fields: ExportField[];
  /** 默认文件名（不含扩展名），默认为 'export' */
  defaultFileName?: string;
  /** 组件触发器按钮文本，默认为 '导出' */
  buttonText?: string;
  /** 是否显示字段选择功能，默认为 true */
  showFieldSelection?: boolean;
  /** 是否显示格式选择菜单，默认为 true */
  showFormatSelection?: boolean;
  /** 是否在点击后打开设置弹窗，默认为 true */
  showSettingsDialog?: boolean;
  /** 是否禁用导出功能，默认为 false */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 导出前回调，可用于数据处理和转换 */
  beforeExport?: (data: Record<string, unknown>[]) => Record<string, unknown>[];
}

/**
 * 数据导出组件
 * 支持导出 Excel、CSV、PDF 格式，支持选择导出字段和自定义文件名
 *
 * @example
 * ```tsx
 * // 基础用法
 * <DataExport
 *   data={employeeData}
 *   fields={[
 *     { key: 'name', title: '姓名' },
 *     { key: 'department', title: '部门' },
 *     { key: 'position', title: '职位' },
 *     { key: 'hireDate', title: '入职日期' },
 *   ]}
 * />
 *
 * // 自定义文件名和按钮文本
 * <DataExport
 *   data={customerData}
 *   fields={customerFields}
 *   defaultFileName="客户列表"
 *   buttonText="导出数据"
 * />
 *
 * // 仅导出 Excel（不显示格式选择）
 * <DataExport
 *   data={reportData}
 *   fields={reportFields}
 *   showFormatSelection={false}
 * />
 *
 * // 导出前数据处理
 * <DataExport
 *   data={rawData}
 *   fields={fields}
 *   beforeExport={(data) =>
 *     data.map((row) => ({
 *       ...row,
 *       amount: `¥${row.amount}`,
 *       date: formatDate(row.date),
 *     }))
 *   }
 * />
 * ```
 */
const DataExport: React.FC<DataExportProps> = ({
  data,
  fields,
  defaultFileName = 'export',
  buttonText = '导出',
  showFieldSelection = true,
  showFormatSelection = true,
  showSettingsDialog = true,
  disabled = false,
  className,
  beforeExport,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(
    fields.map((f) => ({ ...f, selected: f.selected ?? true }))
  );
  const [fileName, setFileName] = useState(defaultFileName);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');

  const open = Boolean(anchorEl);

  /**
   * 处理菜单打开
   */
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  /**
   * 处理菜单关闭
   */
  const handleClose = () => {
    setAnchorEl(null);
  };

  /**
   * 处理设置弹窗打开
   */
  const handleOpenSettings = () => {
    setSettingsOpen(true);
    setAnchorEl(null);
  };

  /**
   * 处理设置弹窗关闭
   */
  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  /**
   * 切换字段选择
   */
  const handleFieldToggle = (key: string) => {
    setSelectedFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    );
  };

  /**
   * 全选/取消全选
   */
  const handleSelectAll = (selected: boolean) => {
    setSelectedFields((prev) => prev.map((f) => ({ ...f, selected })));
  };

  /**
   * 导出为 Excel
   */
  const exportToExcel = useCallback(
    (exportData: Record<string, unknown>[], name: string) => {
      const selectedKeys = selectedFields.filter((f) => f.selected).map((f) => f.key);
      const filteredData = exportData.map((row) => {
        const newRow: Record<string, unknown> = {};
        selectedKeys.forEach((key) => {
          newRow[key] = row[key];
        });
        return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // 设置列宽
      const colWidths = selectedFields
        .filter((f) => f.selected)
        .map((f) => ({ wch: f.width || 20 }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `${name}.xlsx`);
    },
    [selectedFields]
  );

  /**
   * 导出为 CSV
   */
  const exportToCsv = useCallback(
    (exportData: Record<string, unknown>[], name: string) => {
      const selectedKeys = selectedFields.filter((f) => f.selected).map((f) => f.key);
      const filteredData = exportData.map((row) => {
        const newRow: Record<string, unknown> = {};
        selectedKeys.forEach((key) => {
          newRow[key] = row[key];
        });
        return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${name}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    },
    [selectedFields]
  );

  /**
   * 导出为 PDF（使用表格方式）
   */
  const exportToPdf = useCallback(
    (exportData: Record<string, unknown>[], name: string) => {
      const selectedFieldsFiltered = selectedFields.filter((f) => f.selected);

      // 创建临时表格用于打印
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const tableHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: grey.100; }
              h1 { font-size: 18px; margin-bottom: 20px; }
              .export-time { color: #666; font-size: 12px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>${name}</h1>
            <div class="export-time">导出时间: ${new Date().toLocaleString()}</div>
            <table>
              <thead>
                <tr>
                  ${selectedFieldsFiltered.map((f) => `<th>${f.title}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${exportData
                  .map(
                    (row) =>
                      `<tr>${selectedFieldsFiltered
                        .map((f) => `<td>${row[f.key] ?? ''}</td>`)
                        .join('')}</tr>`
                  )
                  .join('')}
              </tbody>
            </table>
            <script>
              window.print();
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(tableHtml);
      printWindow.document.close();
    },
    [selectedFields]
  );

  /**
   * 执行导出
   */
  const handleExport = (format: ExportFormat) => {
    const exportData = beforeExport ? beforeExport(data) : data;

    switch (format) {
      case 'xlsx':
        exportToExcel(exportData, fileName);
        break;
      case 'csv':
        exportToCsv(exportData, fileName);
        break;
      case 'pdf':
        exportToPdf(exportData, fileName);
        break;
    }

    handleClose();
  };

  /**
   * 确认导出（从设置弹窗）
   */
  const handleConfirmExport = () => {
    handleExport(selectedFormat);
    handleCloseSettings();
  };

  /**
   * 获取格式图标
   */
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'xlsx':
        return <FileSpreadsheet size={18} />;
      case 'csv':
        return <File size={18} />;
      case 'pdf':
        return <FileText size={18} />;
    }
  };

  /**
   * 获取格式名称
   */
  const getFormatName = (format: ExportFormat) => {
    switch (format) {
      case 'xlsx':
        return 'Excel (.xlsx)';
      case 'csv':
        return 'CSV (.csv)';
      case 'pdf':
        return 'PDF (.pdf)';
    }
  };

  return (
    <Box className={className}>
      <Button
        variant='contained'
        startIcon={<Download size={18} />}
        endIcon={showFormatSelection ? <ChevronDown size={16} /> : null}
        onClick={showFormatSelection ? handleClick : () => handleExport('xlsx')}
        disabled={disabled || data.length === 0}
      >
        {buttonText}
      </Button>

      {/* 格式选择菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {showFormatSelection && (
          <>
            <MenuItem onClick={() => handleExport('xlsx')}>
              <ListItemIcon>
                <FileSpreadsheet size={18} />
              </ListItemIcon>
              <ListItemText>导出 Excel</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('csv')}>
              <ListItemIcon>
                <File size={18} />
              </ListItemIcon>
              <ListItemText>导出 CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <FileText size={18} />
              </ListItemIcon>
              <ListItemText>导出 PDF</ListItemText>
            </MenuItem>
            <Divider />
          </>
        )}
        {showFieldSelection && (
          <MenuItem onClick={handleOpenSettings}>
            <ListItemIcon>
              <Settings size={18} />
            </ListItemIcon>
            <ListItemText>导出设置</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* 设置弹窗 */}
      <Dialog
        open={settingsOpen}
        onClose={handleCloseSettings}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            导出设置
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={handleCloseSettings}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              <X size={20} />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* 文件名设置 */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1 }}
            >
              文件名
            </Typography>
            <TextField
              fullWidth
              size='small'
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder='请输入文件名'
            />
          </Box>

          {/* 格式选择 */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1 }}
            >
              导出格式
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['xlsx', 'csv', 'pdf'] as ExportFormat[]).map((format) => (
                <Button
                  key={format}
                  variant={selectedFormat === format ? 'contained' : 'outlined'}
                  onClick={() => setSelectedFormat(format)}
                  startIcon={getFormatIcon(format)}
                  size='small'
                >
                  {getFormatName(format)}
                </Button>
              ))}
            </Box>
          </Box>

          {/* 字段选择 */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography variant='subtitle2'>选择导出字段</Typography>
              <Box>
                <Button
                  size='small'
                  onClick={() => handleSelectAll(true)}
                >
                  全选
                </Button>
                <Button
                  size='small'
                  onClick={() => handleSelectAll(false)}
                >
                  取消全选
                </Button>
              </Box>
            </Box>
            <FieldList>
              {selectedFields.map((field) => (
                <ListItem
                  key={field.key}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge='start'
                      checked={field.selected}
                      onChange={() => handleFieldToggle(field.key)}
                      size='small'
                    />
                  </ListItemIcon>
                  <ListItemText primary={field.title} />
                </ListItem>
              ))}
            </FieldList>
          </Box>

          {/* 数据预览 */}
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              共 {data.length} 条数据，已选择 {selectedFields.filter((f) => f.selected).length}{' '}
              个字段
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>取消</Button>
          <Button
            onClick={handleConfirmExport}
            variant='contained'
            startIcon={<Download size={16} />}
          >
            确认导出
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 样式化组件
const FieldList = styled(List)({
  maxHeight: 250,
  overflow: 'auto',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 8,
  '& .MuiListItem-root': {
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export default DataExport;
