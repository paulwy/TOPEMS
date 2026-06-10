import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export interface ImportProgressProps {
  progress: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  status: string;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({
  progress,
  totalRows,
  processedRows,
  successRows,
  failedRows,
  status,
}) => {
  const getStatusIcon = () => {
    if (status === 'completed') {
      return <CheckCircle className='w-5 h-5 text-green-600' />;
    } else if (status === 'failed') {
      return <XCircle className='w-5 h-5 text-red-600' />;
    } else {
      return <Loader2 className='w-5 h-5 text-blue-600 animate-spin' />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return '处理中...';
      case 'completed':
        return '导入完成';
      case 'failed':
        return '导入失败';
      default:
        return '准备中...';
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-slate-900'>导入进度</h3>
        {getStatusIcon()}
      </div>

      <div className='mb-4'>
        <div className='flex justify-between text-sm text-slate-600 mb-1'>
          <span>{getStatusText()}</span>
          <span>{progress}%</span>
        </div>
        <div className='w-full bg-slate-200 rounded-full h-2'>
          <div
            className={`h-2 rounded-full transition-all ${
              status === 'completed' ? 'bg-green-600' : status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 text-sm'>
        <div>
          <p className='text-slate-600'>总行数</p>
          <p className='text-lg font-semibold text-slate-900'>{totalRows}</p>
        </div>
        <div>
          <p className='text-slate-600'>已处理</p>
          <p className='text-lg font-semibold text-slate-900'>{processedRows}</p>
        </div>
        <div>
          <p className='text-slate-600'>成功</p>
          <p className='text-lg font-semibold text-green-600'>{successRows}</p>
        </div>
        <div>
          <p className='text-slate-600'>失败</p>
          <p className='text-lg font-semibold text-red-600'>{failedRows}</p>
        </div>
      </div>

      {status === 'processing' && (
        <div className='mt-4 flex items-center justify-center text-sm text-slate-600'>
          <Loader2 className='w-4 h-4 animate-spin mr-2' />
          正在导入数据，请稍候...
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
