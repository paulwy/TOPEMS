import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{
      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}
  />
);

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 rounded" style={{ width: `${80 - i * 10}%` }} />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <Skeleton className="rounded-full" style={{ width: size, height: size }} />
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl shadow-md p-5">
    <div className="flex items-start justify-between mb-3">
      <SkeletonAvatar size={40} />
      <Skeleton className="h-6 px-3 rounded-full" style={{ width: 80 }} />
    </div>
    <SkeletonText lines={2} />
    <div className="mt-3 flex items-center space-x-2">
      <Skeleton className="h-6 px-4 rounded-lg" style={{ width: 100 }} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="bg-gray-50 px-6 py-3">
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: '100%' }} />
        ))}
      </div>
    </div>
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4">
          <div className="grid grid-cols-7 gap-4 items-center">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4" style={{ width: 120 }} />
            </div>
            <Skeleton className="h-4" style={{ width: 80 }} />
            <Skeleton className="h-4" style={{ width: 80 }} />
            <Skeleton className="h-6 px-3 rounded-full" style={{ width: 80 }} />
            <Skeleton className="h-4" style={{ width: 80 }} />
            <Skeleton className="h-4" style={{ width: 100 }} />
            <div className="flex space-x-2">
              <Skeleton className="h-6 px-3 rounded" style={{ width: 50 }} />
              <Skeleton className="h-6 px-3 rounded" style={{ width: 50 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="p-6">
    <div className="mb-6 space-y-2">
      <Skeleton className="h-8" style={{ width: 200 }} />
      <Skeleton className="h-4" style={{ width: 300 }} />
    </div>
    
    <div className="mb-4 flex gap-4">
      <Skeleton className="h-10 flex-1 rounded-lg" />
      <Skeleton className="h-10 px-6 rounded-lg" style={{ width: 120 }} />
    </div>
    
    <SkeletonTable rows={5} />
    
    <div className="mt-4 flex justify-between items-center">
      <Skeleton className="h-4" style={{ width: 150 }} />
      <div className="flex gap-2">
        <Skeleton className="h-10 px-4 rounded-lg" style={{ width: 80 }} />
        <Skeleton className="h-10 px-4 rounded-lg" style={{ width: 80 }} />
      </div>
    </div>
  </div>
);

export default Skeleton;
