import React, { useState, useEffect } from "react";
import ChartComponent, { ChartType, ChartDataPoint } from "./ChartLibrary";
import PivotTable from "./PivotTable";

export interface DashboardWidget {
  id: string;
  type: "chart" | "pivot" | "metric";
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: {
    chartType?: ChartType;
    data?: ChartDataPoint[];
    xKey?: string;
    yKey?: string;
    yKeys?: string[];
    rows?: string[];
    cols?: string[];
    values?: string[];
    metricValue?: number;
    metricLabel?: string;
    metricPrefix?: string;
    metricSuffix?: string;
  };
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "柱状图" },
  { value: "line", label: "折线图" },
  { value: "pie", label: "饼图" },
  { value: "area", label: "面积图" },
  { value: "radar", label: "雷达图" },
  { value: "scatter", label: "散点图" },
  { value: "composed", label: "组合图" },
];

const WIDGET_TYPES = [
  { value: "chart", label: "图表" },
  { value: "pivot", label: "数据透视表" },
  { value: "metric", label: "指标卡片" },
];

const generateId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const sampleChartData: ChartDataPoint[] = [
  { name: "1月", value: 400, sales: 300, profit: 100 },
  { name: "2月", value: 300, sales: 250, profit: 50 },
  { name: "3月", value: 500, sales: 420, profit: 80 },
  { name: "4月", value: 600, sales: 500, profit: 100 },
  { name: "5月", value: 450, sales: 380, profit: 70 },
  { name: "6月", value: 700, sales: 580, profit: 120 },
];

const samplePivotData = [
  { region: "华北", category: "电子产品", sales: 12000 },
  { region: "华北", category: "服装", sales: 8000 },
  { region: "华东", category: "电子产品", sales: 15000 },
  { region: "华东", category: "服装", sales: 10000 },
  { region: "华南", category: "电子产品", sales: 18000 },
  { region: "华南", category: "服装", sales: 9000 },
];

export const DashboardEditor: React.FC<{
  initialConfig?: DashboardConfig;
  onSave?: (config: DashboardConfig) => void;
}> = ({ initialConfig, onSave }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    initialConfig?.widgets || [
      {
        id: generateId(),
        type: "metric",
        title: "总销售额",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        config: { metricValue: 1250000, metricLabel: "本月", metricPrefix: "¥" },
      },
      {
        id: generateId(),
        type: "metric",
        title: "订单数量",
        x: 1,
        y: 0,
        w: 1,
        h: 1,
        config: { metricValue: 3420, metricLabel: "本月", metricSuffix: "单" },
      },
      {
        id: generateId(),
        type: "metric",
        title: "客户数",
        x: 2,
        y: 0,
        w: 1,
        h: 1,
        config: { metricValue: 1280, metricLabel: "本月新增", metricSuffix: "位" },
      },
      {
        id: generateId(),
        type: "chart",
        title: "月度销售趋势",
        x: 0,
        y: 1,
        w: 2,
        h: 2,
        config: { chartType: "line", data: sampleChartData, xKey: "name", yKey: "sales" },
      },
      {
        id: generateId(),
        type: "chart",
        title: "销售占比",
        x: 2,
        y: 1,
        w: 1,
        h: 2,
        config: { chartType: "pie", data: sampleChartData, xKey: "name", yKey: "value" },
      },
      {
        id: generateId(),
        type: "pivot",
        title: "区域销售分析",
        x: 0,
        y: 3,
        w: 3,
        h: 2,
        config: { rows: ["region"], cols: ["category"], values: ["sales"], data: samplePivotData },
      },
    ]
  );

  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState(initialConfig?.name || "未命名仪表盘");
  const [dashboardDescription, setDashboardDescription] = useState(initialConfig?.description || "");
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState<"chart" | "pivot" | "metric">("chart");
  const [newWidgetChartType, setNewWidgetChartType] = useState<ChartType>("bar");

  const GRID_COLS = 3;
  const GRID_ROWS = 5;

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      setDragOffset({
        x: e.clientX - widget.x * 200,
        y: e.clientY - widget.y * 150,
      });
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (!draggedWidget) return;

    const x = Math.max(0, Math.min(GRID_COLS - 1, Math.floor((e.clientX - dragOffset.x) / 200)));
    const y = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((e.clientY - dragOffset.y) / 150)));

    setWidgets((prev) =>
      prev.map((w) =>
        w.id === draggedWidget ? { ...w, x, y } : w
      )
    );
    setDraggedWidget(null);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  };

  const handleAddWidget = () => {
    const newWidget: DashboardWidget = {
      id: generateId(),
      type: newWidgetType,
      title: newWidgetType === "metric" ? "新指标" : newWidgetType === "pivot" ? "新透视表" : "新图表",
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      config:
        newWidgetType === "chart"
          ? { chartType: newWidgetChartType, data: sampleChartData, xKey: "name", yKey: "value" }
          : newWidgetType === "pivot"
          ? { rows: ["region"], cols: ["category"], values: ["sales"], data: samplePivotData }
          : { metricValue: 0, metricLabel: "指标" },
    };

    setWidgets((prev) => [...prev, newWidget]);
    setShowAddWidgetModal(false);
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w))
    );
  };

  const handleSave = () => {
    const config: DashboardConfig = {
      id: initialConfig?.id || `dashboard-${Date.now()}`,
      name: dashboardName,
      description: dashboardDescription,
      widgets,
    };
    onSave?.(config);
    alert("仪表盘已保存!");
  };

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId);

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f1f5f9" }}>
      <div
        style={{
          flex: 1,
          padding: "24px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <input
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              style={{
                fontSize: "24px",
                fontWeight: 700,
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                color: "#0f172a",
                width: "300px",
              }}
              placeholder="仪表盘名称"
            />
            <input
              type="text"
              value={dashboardDescription}
              onChange={(e) => setDashboardDescription(e.target.value)}
              style={{
                display: "block",
                fontSize: "14px",
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                color: "#64748b",
                marginTop: "4px",
                width: "300px",
              }}
              placeholder="仪表盘描述"
            />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setShowAddWidgetModal(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加组件
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "10px 20px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <polyline points="12 15 15 12 18 15" />
                <path d="M15 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
              </svg>
              保存
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 150px)`,
            gap: "16px",
          }}
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedWidgetId(widget.id)}
              style={{
                gridColumn: `${widget.x + 1} / span ${widget.w}`,
                gridRow: `${widget.y + 1} / span ${widget.h}`,
                cursor: "move",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  boxShadow:
                    selectedWidgetId === widget.id
                      ? "0 0 0 2px #6366f1, 0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  overflow: "hidden",
                }}
              >
                {widget.type === "metric" ? (
                  <div
                    style={{
                      padding: "20px",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {widget.config.metricPrefix}
                      {widget.config.metricValue?.toLocaleString()}
                      {widget.config.metricSuffix}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#64748b",
                        marginTop: "8px",
                      }}
                    >
                      {widget.title}
                    </div>
                    {widget.config.metricLabel && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "4px",
                          backgroundColor: "#f1f5f9",
                          padding: "4px 12px",
                          borderRadius: "12px",
                        }}
                      >
                        {widget.config.metricLabel}
                      </div>
                    )}
                  </div>
                ) : widget.type === "pivot" ? (
                  <div style={{ padding: "16px", height: "100%", overflow: "auto" }}>
                    <PivotTable
                      data={widget.config.data || []}
                      rows={widget.config.rows || []}
                      cols={widget.config.cols || []}
                      values={widget.config.values || []}
                    />
                  </div>
                ) : (
                  <ChartComponent
                    type={widget.config.chartType || "bar"}
                    title={widget.title}
                    data={widget.config.data || []}
                    xKey={widget.config.xKey}
                    yKey={widget.config.yKey}
                    yKeys={widget.config.yKeys}
                    height={widget.h * 150 - 80}
                    width="100%"
                  />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWidget(widget.id);
                }}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "24px",
                  height: "24px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: selectedWidgetId === widget.id ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedWidget && (
        <div
          style={{
            width: "320px",
            backgroundColor: "#ffffff",
            borderLeft: "1px solid #e2e8f0",
            padding: "24px",
            overflow: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "24px",
            }}
          >
            组件配置
          </h3>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#475569",
                marginBottom: "8px",
              }}
            >
              标题
            </label>
            <input
              type="text"
              value={selectedWidget.title}
              onChange={(e) => handleUpdateWidget(selectedWidget.id, { title: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#475569",
                marginBottom: "8px",
              }}
            >
              尺寸
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  宽度
                </label>
                <select
                  value={selectedWidget.w}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, { w: parseInt(e.target.value) })
                  }
                  style={{
                    width: "80px",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                >
                  {[1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {v} 列
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  高度
                </label>
                <select
                  value={selectedWidget.h}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, { h: parseInt(e.target.value) })
                  }
                  style={{
                    width: "80px",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                >
                  {[1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {v} 行
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedWidget.type === "chart" && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#475569",
                  marginBottom: "8px",
                }}
              >
                图表类型
              </label>
              <select
                value={selectedWidget.config.chartType}
                onChange={(e) =>
                  handleUpdateWidget(selectedWidget.id, {
                    config: {
                      ...selectedWidget.config,
                      chartType: e.target.value as ChartType,
                    },
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  outline: "none",
                  fontSize: "14px",
                }}
              >
                {CHART_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedWidget.type === "metric" && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  指标值
                </label>
                <input
                  type="number"
                  value={selectedWidget.config.metricValue}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: {
                        ...selectedWidget.config,
                        metricValue: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  前缀
                </label>
                <input
                  type="text"
                  value={selectedWidget.config.metricPrefix || ""}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: {
                        ...selectedWidget.config,
                        metricPrefix: e.target.value,
                      },
                    })
                  }
                  placeholder="如: ¥"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  后缀
                </label>
                <input
                  type="text"
                  value={selectedWidget.config.metricSuffix || ""}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: {
                        ...selectedWidget.config,
                        metricSuffix: e.target.value,
                      },
                    })
                  }
                  placeholder="如: %"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  标签
                </label>
                <input
                  type="text"
                  value={selectedWidget.config.metricLabel || ""}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: {
                        ...selectedWidget.config,
                        metricLabel: e.target.value,
                      },
                    })
                  }
                  placeholder="如: 本月"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {showAddWidgetModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddWidgetModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              width: "400px",
              onClick: (e) => e.stopPropagation(),
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: "24px",
              }}
            >
              添加组件
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#475569",
                  marginBottom: "8px",
                }}
              >
                组件类型
              </label>
              <select
                value={newWidgetType}
                onChange={(e) =>
                  setNewWidgetType(e.target.value as "chart" | "pivot" | "metric")
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  outline: "none",
                  fontSize: "14px",
                }}
              >
                {WIDGET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {newWidgetType === "chart" && (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  图表类型
                </label>
                <select
                  value={newWidgetChartType}
                  onChange={(e) =>
                    setNewWidgetChartType(e.target.value as ChartType)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                >
                  {CHART_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddWidgetModal(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddWidget}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEditor;
