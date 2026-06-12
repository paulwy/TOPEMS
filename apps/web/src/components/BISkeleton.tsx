import React from "react";
import { Skeleton } from "./ui/skeleton";

// BI Dashboard Skeleton Components

export const MetricCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={`bg-white rounded-2xl shadow-sm p-6 border border-slate-200/60 ${className}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

export const ChartCardSkeleton: React.FC<{
  height?: number;
  className?: string;
}> = ({ height = 280, className }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}
  >
    <div className="px-6 py-4 border-b border-slate-100">
      <Skeleton className="h-5 w-32 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="p-6">
      <Skeleton className="w-full rounded-lg" style={{ height: height - 60 }} />
    </div>
  </div>
);

export const ModuleCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 ${className}`}
  >
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div>
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="w-5 h-5" />
    </div>
    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
      {[1, 2, 3].map((i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

export const VisualizationCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}
  >
    <div className="h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Skeleton className="w-16 h-16 rounded-xl" />
    </div>
    <div className="p-5">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  </div>
);

export const ActivityItemSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={`flex items-center gap-4 p-3 rounded-xl border border-slate-200 ${className}`}
  >
    <Skeleton className="w-10 h-10 rounded-xl" />
    <div className="flex-1">
      <Skeleton className="h-4 w-32 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}
  >
    <div className="px-6 py-4 border-b border-slate-100">
      <Skeleton className="h-5 w-32" />
    </div>
    <div className="p-6">
      {/* Header */}
      <div className="flex gap-4 mb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>

    {/* Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>

    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ChartCardSkeleton height={280} />
      </div>
      <div>
        <ChartCardSkeleton height={280} />
      </div>
    </div>

    {/* Charts Row 2 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <ChartCardSkeleton key={i} height={260} />
      ))}
    </div>
  </div>
);

export const AnalyticsSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>

    {/* Filter */}
    <Skeleton className="h-16 w-full rounded-xl" />

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ChartCardSkeleton height={300} />
      </div>
      <div>
        <ChartCardSkeleton height={300} />
      </div>
    </div>

    {/* Module Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ModuleCardSkeleton key={i} />
      ))}
    </div>

    {/* System Status */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <Skeleton className="h-5 w-24 mb-4" />
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const VisualizationSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>

    {/* Filter */}
    <Skeleton className="h-14 w-full rounded-xl" />

    {/* Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <VisualizationCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export default {
  MetricCardSkeleton,
  ChartCardSkeleton,
  ModuleCardSkeleton,
  VisualizationCardSkeleton,
  ActivityItemSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  AnalyticsSkeleton,
  VisualizationSkeleton,
};
