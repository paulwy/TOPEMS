import React, { useState } from "react";
import { Box, Menu, MenuItem, Paper, TextField, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { Calendar, ChevronDown } from "lucide-react";

// 预设日期范围
const PRESETS = [
  { id: "today", label: "今天" },
  { id: "yesterday", label: "昨天" },
  { id: "week", label: "最近7天" },
  { id: "month", label: "最近30天" },
  { id: "quarter", label: "最近90天" },
  { id: "year", label: "最近一年" },
] as const;

// 获取预设日期范围
const getPresetRange = (presetId: string): { start: string; end: string } => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  switch (presetId) {
    case "today":
      return { start: formatDate(today), end: formatDate(today) };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    }
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: formatDate(weekAgo), end: formatDate(today) };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: formatDate(monthAgo), end: formatDate(today) };
    }
    case "quarter": {
      const quarterAgo = new Date(today);
      quarterAgo.setDate(quarterAgo.getDate() - 90);
      return { start: formatDate(quarterAgo), end: formatDate(today) };
    }
    case "year": {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { start: formatDate(yearAgo), end: formatDate(today) };
    }
    default:
      return { start: formatDate(today), end: formatDate(today) };
  }
};

export interface DateRangePickerProps {
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 日期变化回调 */
  onChange: (range: { startDate: string; endDate: string }) => void;
  /** 是否显示预设选项 */
  showPresets?: boolean;
  /** 自定义预设选项 */
  customPresets?: Array<{ id: string; label: string }>;
  /** 日期选择器尺寸 */
  size?: "small" | "medium";
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  showPresets = true,
  customPresets,
  size = "small",
  disabled = false,
  placeholder,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const presets =
    customPresets || PRESETS.map((p) => ({ id: p.id, label: p.label }));

  const handlePresetClick = (presetId: string) => {
    const range = getPresetRange(presetId);
    onChange({ startDate: range.start, endDate: range.end });
    setAnchorEl(null);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ startDate: customStart, endDate: customEnd });
      setAnchorEl(null);
    }
  };

  const displayText =
    placeholder ||
    (startDate === endDate ? startDate : `${startDate} - ${endDate}`);

  return (
    <>
      <Button
        variant="outlined"
        size={size}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={disabled}
        sx={{ textTransform: "none" }}
      >
        <Calendar style={{ width: 16, height: 16, marginRight: 8 }} />
        <span>{displayText}</span>
        <ChevronDown style={{ width: 16, height: 16, marginLeft: 4 }} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Paper sx={{ p: 2, minWidth: 320 }}>
          {showPresets && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                快速选择
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                  mb: 2,
                }}
              >
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="text"
                    size="small"
                    onClick={() => handlePresetClick(preset.id)}
                    sx={{ justifyContent: "flex-start", fontSize: "0.75rem" }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </Box>
            </>
          )}
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
            >
              自定义范围
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <TextField
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Typography variant="body2" color="text.secondary">
                至
              </Typography>
              <TextField
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Button
              onClick={handleCustomApply}
              variant="contained"
              fullWidth
              size="small"
              disabled={!customStart || !customEnd}
            >
              应用
            </Button>
          </Box>
        </Paper>
      </Menu>
    </>
  );
};

export default DateRangePicker;
