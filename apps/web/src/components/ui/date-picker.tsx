"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button, Box, Popover } from "@mui/material";

import { Calendar } from "@/components/ui/calendar";

export type DatePickerProps = {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function DatePicker({
  date,
  onSelect,
  placeholder = "选择日期",
  disabled = false,
  className,
}: DatePickerProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (selectedDate: Date | Date[] | undefined) => {
    if (onSelect && !Array.isArray(selectedDate)) {
      onSelect(selectedDate);
      handleClose();
    }
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ position: "relative" }} className={className}>
      <Button
        variant="outlined"
        onClick={handleClick}
        disabled={disabled}
        startIcon={<CalendarIcon style={{ width: 20, height: 20 }} />}
        sx={{
          justifyContent: "flex-start",
          textAlign: "left",
          width: "100%",
          color: date ? "text.primary" : "text.secondary",
        }}
      >
        {date ? format(date, "yyyy年 MM月 dd日", { locale: zhCN }) : placeholder}
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
        />
      </Popover>
    </Box>
  );
}

DatePicker.displayName = "DatePicker";

export { DatePicker };
