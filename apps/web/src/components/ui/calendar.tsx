"use client";

import * as React from "react";
import { Button, Box, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export type CalendarProps = {
  mode?: "single" | "range" | "multiple";
  selected?: Date | Date[];
  onSelect?: (date: Date | Date[] | undefined) => void;
  defaultMonth?: Date;
  disabled?: (date: Date) => boolean;
  className?: string;
  classNames?: any;
};

function Calendar({
  mode = "single",
  selected,
  onSelect,
  defaultMonth,
  disabled,
  className,
  classNames: _,
}: CalendarProps) {
  const [month, setMonth] = React.useState(defaultMonth || new Date());

  const daysInMonth = React.useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [month]);

  const nextMonth = () => setMonth(addMonths(month, 1));
  const prevMonth = () => setMonth(subMonths(month, 1));

  const isSelected = (date: Date) => {
    if (!selected) return false;
    if (mode === "single") {
      return isSameDay(date, selected as Date);
    }
    if (mode === "multiple" || mode === "range") {
      return (selected as Date[]).some((d) => isSameDay(d, date));
    }
    return false;
  };

  const isDisabled = (date: Date) => {
    if (!disabled) return false;
    return disabled(date);
  };

  const handleDayClick = (date: Date) => {
    if (isDisabled(date)) return;

    let newSelected;
    if (mode === "single") {
      newSelected = isSelected(date) ? undefined : date;
    } else if (mode === "multiple") {
      const array = Array.isArray(selected) ? [...selected] : [];
      const index = array.findIndex((d) => isSameDay(d, date));
      if (index > -1) {
        array.splice(index, 1);
      } else {
        array.push(date);
      }
      newSelected = array;
    } else {
      newSelected = date;
    }

    onSelect?.(newSelected);
  };

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <Box sx={{ p: 2 }} className={className}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={prevMonth}
          sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </Button>

        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {format(month, "yyyy年 MMMM", { locale: zhCN })}
        </Typography>

        <Button
          variant="outlined"
          size="small"
          onClick={nextMonth}
          sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1 }}>
        {weekDays.map((day, i) => (
          <Box
            key={i}
            sx={{
              textAlign: "center",
              fontSize: 12,
              color: "text.secondary",
              py: 1,
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {daysInMonth.map((date, dateIndex) => {
          const isOutsideMonth = !isSameMonth(date, month);
          const selectedDay = isSelected(date);
          const disabledDay = isDisabled(date);

          return (
            <Button
              key={dateIndex}
              variant={selectedDay ? "contained" : "text"}
              size="small"
              onClick={() => handleDayClick(date)}
              disabled={disabledDay}
              sx={{
                minWidth: 32,
                width: 32,
                height: 32,
                p: 0,
                fontWeight: 400,
                opacity: isOutsideMonth ? 0.5 : disabledDay ? 0.5 : 1,
                color: selectedDay ? undefined : "text.primary",
              }}
            >
              {format(date, "d")}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
