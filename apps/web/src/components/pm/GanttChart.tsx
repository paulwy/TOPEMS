import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";
import type { GanttPhase, GanttMilestone } from "@/api/pm";

interface GanttChartProps {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  projectStartDate?: string;
  projectEndDate?: string;
}

const GanttChart: React.FC<GanttChartProps> = ({
  phases,
  milestones,
  projectStartDate,
  projectEndDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(100);

  const minDate = projectStartDate
    ? new Date(projectStartDate)
    : phases.length > 0
      ? new Date(
          Math.min(
            ...phases.map((p) =>
              new Date(p.start_date || Date.now()).getTime(),
            ),
          ),
        )
      : new Date();

  const maxDate = projectEndDate
    ? new Date(projectEndDate)
    : phases.length > 0
      ? new Date(
          Math.max(
            ...phases.map((p) => new Date(p.end_date || Date.now()).getTime()),
          ),
        )
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const totalDays = Math.ceil(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysToShow = Math.max(totalDays, 30);

  const getDayOffset = (dateStr?: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return Math.ceil(
      (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getBarWidth = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(duration, 1);
  };

  const getMonthLabels = () => {
    const labels = [];
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      labels.push({
        date: new Date(currentDate),
        offset: getDayOffset(currentDate.toISOString().split("T")[0]),
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return labels;
  };

  const getDayLabels = () => {
    const labels = [];
    for (let i = 0; i <= daysToShow; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 0) {
        labels.push({ day: date.getDate(), offset: i });
      }
    }
    return labels;
  };

  const scroll = (direction: "left" | "right") => {
    const scrollAmount = 200;
    setScrollLeft((prev) => {
      const maxScroll = Math.max(
        0,
        daysToShow * 20 - (containerRef.current?.clientWidth || 0),
      );
      if (direction === "left") {
        return Math.max(0, prev - scrollAmount);
      }
      return Math.min(maxScroll, prev + scrollAmount);
    });
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(150, Math.max(50, prev + delta)));
  };

  const monthLabels = getMonthLabels();
  const dayLabels = getDayLabels();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-10)}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{zoom}%</span>
          <button
            onClick={() => handleZoom(10)}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-48 flex-shrink-0 border-r border-gray-200">
          <div className="h-16 px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center">
            <span className="text-sm font-medium text-gray-600">任务</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className="h-12 px-3 py-2 border-b border-gray-100 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="truncate">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {phase.name}
                  </div>
                  {phase.progress > 0 && (
                    <div className="text-xs text-gray-500">
                      {phase.progress}% 完成
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto"
          onScroll={(e) =>
            setScrollLeft((e.target as HTMLDivElement).scrollLeft)
          }
        >
          <div
            className="min-w-max"
            style={{ width: `${daysToShow * (zoom / 100) * 20}px` }}
          >
            <div className="h-16 border-b border-gray-200">
              <div className="flex">
                {monthLabels.map((label, index) => (
                  <div
                    key={index}
                    className="absolute bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                    style={{
                      left: `${48 + label.offset * (zoom / 100) * 20}px`,
                      top: 0,
                    }}
                  >
                    {label.date.getFullYear()}年{label.date.getMonth() + 1}月
                  </div>
                ))}
              </div>
              <div className="flex pt-6 border-t border-gray-200">
                {dayLabels.map((label, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 text-center text-xs text-gray-400"
                    style={{ width: `${(zoom / 100) * 140}px` }}
                  >
                    {label.day}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className="h-12 border-b border-gray-100 relative"
                >
                  <div
                    className="absolute top-2 rounded-md h-8 flex items-center px-2 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      left: `${48 + getDayOffset(phase.start_date) * (zoom / 100) * 20}px`,
                      width: `${getBarWidth(phase.start_date, phase.end_date) * (zoom / 100) * 20 - 4}px`,
                      backgroundColor:
                        phase.status === "completed"
                          ? "#10B981"
                          : phase.status === "active"
                            ? "#3B82F6"
                            : "#9CA3AF",
                    }}
                  >
                    <span className="text-xs text-white font-medium truncate px-1">
                      {phase.name}
                    </span>
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-md"
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>

                  {milestones
                    .filter((m) => m.project_id === phase.project_id)
                    .map((milestone) => (
                      <div
                        key={milestone.id}
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-yellow-400 bg-yellow-200"
                        style={{
                          left: `${48 + getDayOffset(milestone.date) * (zoom / 100) * 20 - 6}px`,
                        }}
                        title={milestone.name}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-xs text-gray-600">进行中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-gray-600">已完成</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-yellow-400 bg-yellow-200" />
          <span className="text-xs text-gray-600">里程碑</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span className="text-xs text-gray-600">未开始</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
