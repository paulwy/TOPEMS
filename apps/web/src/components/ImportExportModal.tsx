import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Upload, FileText, CheckCircle } from 'lucide-react';
import type { ExportColumn, ImportResult } from '@/utils/importExport';
import { exportToExcel, exportToCSV, importFromExcel, downloadTemplate } from '@/utils/importExport';

interface ImportExportModalProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: T[];
  columns: ExportColumn<T>[];
  fileName: string;
  onImportSuccess?: (data: T[]) => void;
  transform?: (raw: Record<string, any>) => T;
}

export const ImportExportModal = <T extends Record<string, any>>({
  open,
  onOpenChange,
  data,
  columns,
  fileName,
  onImportSuccess,
  transform,
}: ImportExportModalProps<T>) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    exportToExcel(data, columns, fileName);
  };

  const handleExportCSV = () => {
    exportToCSV(data, columns, fileName);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(columns, fileName);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const result = await importFromExcel(file, columns, transform);
    setImportResult(result);

    if (result.success && onImportSuccess) {
      onImportSuccess(result.data);
    }

    setImporting(false);
  };

  const handleRetry = () => {
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>数据导入导出</DialogTitle>
          <DialogDescription>选择导出格式或上传文件进行导入</DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className='py-4'>
            {importResult.success ? (
              <div className='text-center'>
                <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <CheckCircle className='w-8 h-8 text-green-600' />
                </div>
                <h3 className='text-lg font-semibold text-green-600 mb-2'>导入成功</h3>
                <p className='text-muted-foreground'>成功导入 {importResult.data.length} 条记录</p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex items-center gap-3 p-3 bg-red-50 rounded-lg'>
                  <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0' />
                  <div>
                    <p className='font-medium text-red-600'>导入失败</p>
                    <p className='text-sm text-red-500'>共 {importResult.errors.length} 条错误</p>
                  </div>
                </div>
                <div className='max-h-48 overflow-y-auto space-y-2'>
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className='text-sm text-red-500'>
                      <span className='font-medium'>第 {error.row} 行:</span> {error.message}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className='text-sm text-muted-foreground'>
                      ... 还有 {importResult.errors.length - 10} 条错误
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='py-4 space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>导出数据</p>
              <div className='grid grid-cols-2 gap-2'>
                <Button variant='outline' onClick={handleExportExcel} className='gap-2'>
                  <Download className='w-4 h-4' />
                  导出 Excel
                </Button>
                <Button variant='outline' onClick={handleExportCSV} className='gap-2'>
                  <FileText className='w-4 h-4' />
                  导出 CSV
                </Button>
              </div>
            </div>

            <div className='h-px bg-muted' />

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>导入数据</p>
              <input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xls,.csv'
                onChange={handleFileChange}
                className='hidden'
                id='import-file'
              />
              <label htmlFor='import-file'>
                <Button variant='outline' className='w-full gap-2' disabled={importing}>
                  <Upload className='w-4 h-4' />
                  {importing ? '导入中...' : '上传文件'}
                </Button>
              </label>
              <Button variant='ghost' size='sm' onClick={handleDownloadTemplate} className='w-full'>
                <Download className='w-4 h-4 mr-2' />
                下载导入模板
              </Button>
              <p className='text-xs text-muted-foreground'>支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {importResult ? (
            <>
              {!importResult.success && (
                <Button variant='outline' onClick={handleRetry}>
                  重新导入
                </Button>
              )}
              <Button onClick={handleClose}>确定</Button>
            </>
          ) : (
            <Button onClick={handleClose}>关闭</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExportModal;
